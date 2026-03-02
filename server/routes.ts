import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage, db } from "./storage";
import { registerSchema, loginSchema, insertSubjectSchema, insertTaskSchema, insertPomodoroSessionSchema, insertResourceSchema, updateProfileSchema, insertStudyGroupSchema, insertCommentSchema, users, studyGroups, resources, tasks } from "@shared/schema";
import { z } from "zod";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateStudySchedule, summarizeResource, calculateReadinessScore, chatWithAI, generateQuiz } from "./ai";
import { differenceInDays, parseISO, startOfDay } from "date-fns";

const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
const resourcesDir = path.join(process.cwd(), "uploads", "resources");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, _file, cb) => {
    const ext = path.extname(_file.originalname) || ".png";
    cb(null, `avatar-${req.session.userId}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const updateSubjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  icon: z.string().optional(),
  difficultyLevel: z.number().int().min(1).max(5).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  subjectId: z.number().int().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  deadline: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  kanbanOrder: z.number().int().optional(),
  riskLevel: z.string().optional(),
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.isAdmin !== 1) {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/uploads", (await import("express")).default.static(path.join(process.cwd(), "uploads")));

  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "studyflow-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input" });

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const user = await storage.createUser({
      username: parsed.data.username,
      email: parsed.data.email,
      password: hashedPassword,
      displayName: parsed.data.displayName || parsed.data.username,
    });

    req.session.userId = user.id;
    const { password, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const user = await storage.getUserByEmail(parsed.data.email);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(parsed.data.password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    req.session.userId = user.id;
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Demo Endpoint to grant user Admin Access
  app.get("/api/auth/make-me-admin", async (req, res) => {
    // Elevate all users or just the current user (using db.update without where makes everyone admin for demo)
    await db.update(users).set({ isAdmin: 1 });
    res.json({ message: "You are now a System Admin! Please refresh the page to see the new dashboard." });
  });

  // System Admin Endpoints
  app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const groupCount = await db.select({ count: sql<number>`count(*)` }).from(studyGroups);
    const resourceCount = await db.select({ count: sql<number>`count(*)` }).from(resources);
    const taskCount = await db.select({ count: sql<number>`count(*)` }).from(tasks);

    // Also fetch the top 10 most recent users
    const recentUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users).orderBy(sql`created_at DESC`).limit(10);

    res.json({
      metrics: {
        users: userCount[0].count,
        groups: groupCount[0].count,
        resources: resourceCount[0].count,
        tasks: taskCount[0].count,
      },
      recentUsers
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    // Proactive Deadline Alert Engine
    const highRiskTasks = (await storage.getTasks(user.id)).filter(t => t.riskLevel === 'high' && t.status !== 'completed');
    if (highRiskTasks.length > 0) {
      const existingNotifs = await storage.getNotifications(user.id);
      for (const task of highRiskTasks) {
        const hasNotif = existingNotifs.some(n => n.title.includes(task.title) && n.type === 'deadline');
        if (!hasNotif) {
          await storage.createNotification(user.id, {
            title: `🚨 High Risk: ${task.title}`,
            message: `This task requires focus! You have more work estimated than remaining days.`,
            type: 'deadline'
          });
        }
      }
    }

    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const user = await storage.updateUser(req.session.userId!, parsed.data);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  function safeDeleteAvatar(avatarPath: string | null) {
    if (!avatarPath) return;
    const basename = path.basename(avatarPath);
    const resolved = path.resolve(uploadsDir, basename);
    if (!resolved.startsWith(uploadsDir)) return;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  }

  app.post("/api/auth/avatar", requireAuth, (req, res) => {
    avatarUpload.single("avatar")(req, res, async (err) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Max 2MB."
          : err.message || "Upload failed";
        return res.status(400).json({ message });
      }
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const existingUser = await storage.getUserById(req.session.userId!);
      if (existingUser?.avatar) safeDeleteAvatar(existingUser.avatar);

      const avatarUrl = `/ uploads / avatars / ${req.file.filename}`;
      const user = await storage.updateUser(req.session.userId!, { avatar: avatarUrl });
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    });
  });

  app.delete("/api/auth/avatar", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    safeDeleteAvatar(user.avatar);
    const updated = await storage.updateUser(req.session.userId!, { avatar: null });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.get("/api/subjects", requireAuth, async (req, res) => {
    const subjects = await storage.getSubjects(req.session.userId!);
    res.json(subjects);
  });

  app.post("/api/subjects", requireAuth, async (req, res) => {
    const parsed = insertSubjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const subject = await storage.createSubject(req.session.userId!, parsed.data);
    res.status(201).json(subject);
  });

  app.patch("/api/subjects/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = updateSubjectSchema.safeParse(req.body);

    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const subject = await storage.updateSubject(id, req.session.userId!, parsed.data);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  });

  app.delete("/api/subjects/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const deleted = await storage.deleteSubject(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Subject not found" });
    res.status(204).send();
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    const tasks = await storage.getTasks(req.session.userId!);
    res.json(tasks);
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    if (parsed.data.subjectId) {
      const owned = await storage.getSubject(parsed.data.subjectId, req.session.userId!);
      if (!owned) return res.status(400).json({ message: "Subject not found" });
    }

    if (parsed.data.groupId) {
      const member = await storage.isGroupMember(req.session.userId!, parsed.data.groupId);
      if (!member) return res.status(403).json({ message: "You are not a member of this group" });
    }

    // AI Risk Engine Logic
    let riskLevel = "normal";
    if (parsed.data.deadline && parsed.data.estimatedMinutes) {
      const deadline = startOfDay(parseISO(parsed.data.deadline));
      const today = startOfDay(new Date());
      const daysLeft = Math.max(1, differenceInDays(deadline, today));
      const avgStudyMinutesPerDay = 120; // 2 hours

      if (parsed.data.estimatedMinutes > daysLeft * avgStudyMinutesPerDay) {
        riskLevel = "high";
      }
    }

    const taskData = { ...parsed.data, riskLevel };
    const task = await storage.createTask(req.session.userId!, taskData);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.subjectId) {
      const owned = await storage.getSubject(parsed.data.subjectId, req.session.userId!);
      if (!owned) return res.status(400).json({ message: "Subject not found" });
    }

    // AI Risk Engine Logic (on update)
    let riskLevel = undefined;
    if (parsed.data.deadline !== undefined || parsed.data.estimatedMinutes !== undefined) {
      // We might need existing task data if one is missing in the update
      const existing = await storage.getTask(id, req.session.userId!);
      if (existing) {
        const deadlineStr = parsed.data.deadline !== undefined ? parsed.data.deadline : existing.deadline;
        const estMinutes = parsed.data.estimatedMinutes !== undefined ? parsed.data.estimatedMinutes : existing.estimatedMinutes;

        if (deadlineStr && estMinutes) {
          const deadline = startOfDay(parseISO(deadlineStr));
          const today = startOfDay(new Date());
          const daysLeft = Math.max(1, differenceInDays(deadline, today));
          const avgStudyMinutesPerDay = 120;
          riskLevel = estMinutes > daysLeft * avgStudyMinutesPerDay ? "high" : "normal";
        }
      }
    }

    const updateData = { ...parsed.data };
    if (riskLevel) updateData.riskLevel = riskLevel;

    const task = await storage.updateTask(id, req.session.userId!, updateData);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const deleted = await storage.deleteTask(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.status(204).send();
  });

  app.get("/api/pomodoro-sessions", requireAuth, async (req, res) => {
    const sessions = await storage.getPomodoroSessions(req.session.userId!);
    res.json(sessions);
  });

  const resourceStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, resourcesDir),
    filename: (req, _file, cb) => {
      const ext = path.extname(_file.originalname);
      cb(null, `resource - ${req.session.userId} - ${Date.now()}${ext}`);
    },
  });

  const resourceUpload = multer({
    storage: resourceStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.get("/api/resources", requireAuth, async (req, res) => {
    const resources = await storage.getResources(req.session.userId!);
    res.json(resources);
  });

  app.get("/api/resources/mine", requireAuth, async (req, res) => {
    const resources = await storage.getResourcesByUser(req.session.userId!);
    res.json(resources);
  });

  app.post("/api/resources", requireAuth, (req, res) => {
    resourceUpload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload failed" });
      }

      // Multer puts fields in req.body as strings. We must coerce them for Zod/DB.
      const body = { ...req.body };
      if (body.isPublic !== undefined) body.isPublic = parseInt(String(body.isPublic), 10);
      if (body.subjectId === "null" || body.subjectId === "") body.subjectId = null;
      else if (body.subjectId !== undefined) body.subjectId = parseInt(String(body.subjectId), 10);

      if (body.groupId === "null" || body.groupId === "") body.groupId = null;
      else if (body.groupId !== undefined) body.groupId = parseInt(String(body.groupId), 10);

      const parsed = insertResourceSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const resourceData: any = { ...parsed.data };
      if (req.file) {
        resourceData.filePath = `/uploads/resources/${req.file.filename}`;
        resourceData.fileName = req.file.originalname;
      }

      if (resourceData.groupId) {
        const member = await storage.isGroupMember(req.session.userId!, resourceData.groupId);
        if (!member) return res.status(403).json({ message: "You are not a member of this group" });
      }

      const resource = await storage.createResource(req.session.userId!, resourceData);
      res.status(201).json(resource);
    });
  });

  app.delete("/api/resources/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const resource = await storage.getResource(id);
    if (resource?.filePath) {
      const fullPath = path.join(process.cwd(), resource.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    const deleted = await storage.deleteResource(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Resource not found" });
    res.status(204).send();
  });

  app.post("/api/pomodoro-sessions", requireAuth, async (req, res) => {
    const parsed = insertPomodoroSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const session_ = await storage.createPomodoroSession(req.session.userId!, parsed.data);

    const user = await storage.getUserById(req.session.userId!);
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      const lastActive = user.lastActiveDate;
      let streak = user.streakCount;
      if (lastActive) {
        const last = new Date(lastActive);
        const diff = Math.floor((new Date(today).getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) streak++;
        else if (diff > 1) streak = 1;
      } else {
        streak = 1;
      }
      await storage.updateUser(user.id, {
        totalStudyMinutes: user.totalStudyMinutes + parsed.data.duration,
        lastActiveDate: today,
        streakCount: streak,
      });
    }

    res.status(201).json(session_);
  });

  // Study Groups (Phase 2)
  app.get("/api/groups", requireAuth, async (req, res) => {
    const groups = await storage.getStudyGroups(req.session.userId!);
    res.json(groups);
  });

  app.post("/api/groups", requireAuth, async (req, res) => {
    const parsed = insertStudyGroupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const group = await storage.createStudyGroup(req.session.userId!, parsed.data);
    res.status(201).json(group);
  });

  app.post("/api/groups/join", requireAuth, async (req, res) => {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: "Invite code is required" });

    const group = await storage.getStudyGroupByInviteCode(inviteCode);
    if (!group) return res.status(404).json({ message: "Invalid invite code" });

    const isMember = await storage.isGroupMember(req.session.userId!, group.id);
    if (isMember) return res.status(400).json({ message: "Already a member of this group" });

    await storage.joinStudyGroup(req.session.userId!, group.id);
    res.json(group);
  });

  app.get("/api/groups/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.isGroupMember(req.session.userId!, id);
    if (!member) return res.status(403).json({ message: "Access denied" });

    const group = await storage.getStudyGroup(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.get("/api/groups/:id/members", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.isGroupMember(req.session.userId!, id);
    if (!member) return res.status(403).json({ message: "Access denied" });

    const members = await storage.getGroupMembers(id);
    res.json(members);
  });

  app.get("/api/groups/:id/tasks", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.isGroupMember(req.session.userId!, id);
    if (!member) return res.status(403).json({ message: "Access denied" });

    const tasks = await storage.getGroupTasks(id);
    res.json(tasks);
  });

  app.get("/api/groups/:id/resources", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.isGroupMember(req.session.userId!, id);
    if (!member) return res.status(403).json({ message: "Access denied" });

    const resources = await storage.getGroupResources(id);
    res.json(resources);
  });

  // Comments (Phase 2)
  app.get("/api/resources/:id/comments", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const comments = await storage.getComments(id);
    res.json(comments);
  });

  app.post("/api/resources/:id/comments", requireAuth, async (req, res) => {
    const resourceId = parseInt(String(req.params.id));
    const parsed = insertCommentSchema.safeParse({ ...req.body, resourceId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const comment = await storage.createComment(req.session.userId!, parsed.data);
    res.status(201).json(comment);
  });

  // Notifications (Phase 2)
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifications = await storage.getNotifications(req.session.userId!);
    res.json(notifications);
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const success = await storage.markNotificationRead(id, req.session.userId!);
    if (!success) return res.status(404).json({ message: "Notification not found" });
    res.status(204).send();
  });

  // AI Features (Phase 3)
  app.post("/api/ai/schedule", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasks(req.session.userId!);
      const subjects = await storage.getSubjects(req.session.userId!);

      const pendingTasks = tasks.filter(t => t.status !== "completed");
      if (pendingTasks.length === 0) {
        return res.json({ message: "No pending tasks to schedule" });
      }

      const schedule = await generateStudySchedule(pendingTasks, subjects);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI schedule" });
    }
  });

  app.post("/api/resources/:id/summarize", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const resource = await storage.getResource(id);

      if (!resource) return res.status(404).json({ message: "Resource not found" });
      if (resource.userId !== req.session.userId) {
        // Also allow group members to summarize public/group resources?
        // For now, keep it simple: owner can summarize.
      }

      // In a real app, we'd extract text from the file/URL.
      // Since this is a restricted environment, we'll use the description or a mock content.
      const contentToSummarize = resource.description || `Resource content for ${resource.title}`;
      const summary = await summarizeResource(contentToSummarize, resource.title);

      const updated = await storage.updateResource(id, resource.userId!, { aiSummary: summary });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI summary" });
    }
  });

  app.get("/api/users/me/readiness", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const readinessScore = await calculateReadinessScore({
        streakCount: user.streakCount,
        totalStudyMinutes: user.totalStudyMinutes,
        productivityScore: user.productivityScore
      });

      if (readinessScore !== user.readinessScore) {
        await storage.updateUser(user.id, { readinessScore });
      }

      res.json({ readinessScore });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate readiness" });
    }
  });

  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const { message, history } = req.body;
      const tasks = await storage.getTasks(req.session.userId!);
      const subjects = await storage.getSubjects(req.session.userId!);

      const response = await chatWithAI(message, history || [], { subjects, tasks });
      res.json({ message: response });
    } catch (error) {
      res.status(500).json({ message: "Failed to reach StudyBuddy" });
    }
  });

  app.post("/api/resources/:id/quiz", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { count, type } = req.body;
      const resource = await storage.getResource(id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });

      const content = resource.description || `Study material for ${resource.title}`;
      const quiz = await generateQuiz(content, resource.title, { count, type });
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI quiz" });
    }
  });

  app.get("/api/analytics/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const sessions = await storage.getPomodoroSessions(userId);
      const tasks = await storage.getTasks(userId);
      const subjects = await storage.getSubjects(userId);

      // 1. Calculate productive hour
      const hourCounts: Record<number, number> = {};
      sessions.forEach(s => {
        const hour = new Date(s.completedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      let bestHour = -1;
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          bestHour = parseInt(hour);
        }
      });

      // 2. Calculate weakest subject
      let weakestSubject = null;
      let lowestRate = 1.1;

      for (const sub of subjects) {
        const subTasks = tasks.filter(t => t.subjectId === sub.id);
        if (subTasks.length > 0) {
          const rate = subTasks.filter(t => t.status === "completed").length / subTasks.length;
          if (rate < lowestRate) {
            lowestRate = rate;
            weakestSubject = sub.name;
          }
        }
      }

      // 3. Simple heuristic recommendation
      let recommendation = "Keep maintaining your study streak!";
      if (sessions.length < 3) recommendation = "Try setting a 25-minute Pomodoro timer today to build focus habits.";
      else if (lowestRate < 0.3 && weakestSubject) recommendation = `Your progress in ${weakestSubject} is a bit slow. Try prioritizing it in your next session.`;
      else if (bestHour !== -1) recommendation = `You're most productive around ${bestHour % 12 || 12}${bestHour >= 12 ? 'PM' : 'AM'}. Schedule your hardest tasks then!`;

      res.json({
        mostProductiveHour: bestHour === -1 ? null : bestHour,
        weakestSubject,
        recommendation
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  return httpServer;
}
