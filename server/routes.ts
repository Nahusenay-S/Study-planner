import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage, db } from "./storage";
import { registerSchema, loginSchema, insertSubjectSchema, insertTaskSchema, insertPomodoroSessionSchema, insertResourceSchema, updateProfileSchema, insertStudyGroupSchema, insertCommentSchema, insertActiveTimerSchema, users, studyGroups, resources, tasks, pomodoroSessions } from "@shared/schema";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateStudySchedule, summarizeResource, calculateReadinessScore, chatWithAI, generateQuiz, breakDownTask, generateStudyInsights } from "./ai";
import { broadcastToGroup } from "./ws";
import { differenceInDays, parseISO, startOfDay } from "date-fns";

const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
const resourcesDir = path.join(process.cwd(), "uploads", "resources");
const chatUploadsDir = path.join(process.cwd(), "uploads", "chat");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
if (!fs.existsSync(chatUploadsDir)) fs.mkdirSync(chatUploadsDir, { recursive: true });

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

const chatUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chat-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const chatUpload = multer({
  storage: chatUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"));
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
  isLocked: z.number().int().optional(),
  subtasks: z.any().optional(),
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

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ message: "Access denied. Super Admin only." });
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

    if (user.role === 'banned') {
      return res.status(403).json({ message: "Your account has been banned. Contact a Super Admin." });
    }

    req.session.userId = user.id;
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Super Admin: Elevate current user to Super Admin (SECURED)
  app.get("/api/auth/make-me-super-admin", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });

    // Require a Secret Key from ENV for security
    const setupKey = req.query.key;
    const requiredKey = process.env.ADMIN_SETUP_KEY || "dev_secret_123";

    if (setupKey !== requiredKey) {
      return res.status(403).json({ message: "Invalid setup key. Elevation denied." });
    }

    await db.update(users).set({ role: 'super_admin', isAdmin: 1 }).where(eq(users.id, req.session.userId));
    res.json({ message: "You are now a Super Admin! Reload the dashboard for root access." });
  });

  // Admin Management (Super Admin only)
  app.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      avatar: users.avatar,
      role: users.role,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      streakCount: users.streakCount,
      productivityScore: users.productivityScore,
    }).from(users).orderBy(sql`created_at DESC`);
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id/role", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const { role } = req.body;

    // Safety: Prevent self-demotion from Super Admin to ensure platform always has one
    if (id === req.session.userId && role !== 'super_admin') {
      return res.status(400).json({ message: "Safety Lock: You cannot demote yourself from Super Admin role. Another Super Admin must do this." });
    }

    if (!['super_admin', 'admin', 'user', 'banned'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const isAdmin = (role === 'admin' || role === 'super_admin') ? 1 : 0;
    const updated = await storage.updateUser(id, { role, isAdmin });
    res.json(updated);
  });

  // Ban user (Super Admin only)
  app.patch("/api/admin/users/:id/ban", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const target = await storage.getUserById(id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === 'super_admin') return res.status(403).json({ message: "Cannot ban a Super Admin" });
    await storage.updateUser(id, { role: 'banned', isAdmin: 0 });
    res.json({ message: `User ${target.username} banned.` });
  });

  // Unban user (Super Admin only)
  app.patch("/api/admin/users/:id/unban", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.updateUser(id, { role: 'user', isAdmin: 0 });
    res.json({ message: "User unbanned." });
  });

  // Force reset password (Super Admin only)
  app.patch("/api/admin/users/:id/reset-password", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const hashed = await bcrypt.hash(newPassword, 12);
    await storage.updateUser(id, { password: hashed });
    res.json({ message: "Password reset successfully." });
  });

  // Get all groups (Super Admin)
  app.get("/api/admin/groups", requireSuperAdmin, async (req, res) => {
    const allGroups = await db.select().from(studyGroups).orderBy(sql`created_at DESC`);
    res.json(allGroups);
  });

  // Delete any group (Super Admin)
  app.delete("/api/admin/groups/:id", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await db.delete(studyGroups).where(eq(studyGroups.id, id));
    res.json({ message: "Group deleted." });
  });

  // Get all resources (Super Admin)
  app.get("/api/admin/resources", requireSuperAdmin, async (req, res) => {
    const allResources = await db.select({
      id: resources.id,
      userId: resources.userId,
      title: resources.title,
      type: resources.type,
      url: resources.url,
      createdAt: resources.createdAt,
    }).from(resources).orderBy(sql`created_at DESC`);
    res.json(allResources);
  });

  // Delete any resource (Super Admin)
  app.delete("/api/admin/resources/:id", requireSuperAdmin, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await db.delete(resources).where(eq(resources.id, id));
    res.json({ message: "Resource deleted." });
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

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
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
      const group = await storage.getStudyGroup(parsed.data.groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.createdBy !== req.session.userId) {
        return res.status(403).json({ message: "Only the group creator (Admin) can create tasks for this study circle." });
      }
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

    if (task.groupId) {
      try {
        const group = await storage.getStudyGroup(task.groupId);
        const members = await storage.getGroupMembers(task.groupId);
        for (const m of members) {
          if (m.userId !== req.session.userId) {
            await storage.createNotification(m.userId, {
              title: "New Group Task",
              message: `Task "${task.title}" added to ${group?.name}`,
              type: "group"
            });
          }
        }
      } catch (e) {
        console.error("Group task notification error:", e);
      }
    }

    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    // Get current task to check permissions
    const existing = await storage.getTask(id, req.session.userId!) || (await db.select().from(tasks).where(eq(tasks.id, id)))[0];
    if (!existing) return res.status(404).json({ message: "Task not found" });

    // Permission check: owner OR group member (if it's a group task)
    const isOwner = existing.userId === req.session.userId;
    let isMember = false;
    if (existing.groupId) {
      isMember = await storage.isGroupMember(req.session.userId!, existing.groupId);
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Unauthorized to update this task" });
    }

    if (existing.isLocked && !isOwner) {
      return res.status(403).json({ message: "This task is locked by admin" });
    }

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const updateData = { ...parsed.data };

    // Activity logging if status changed
    if (updateData.status && updateData.status !== existing.status && existing.groupId) {
      await storage.logKanbanActivity(existing.groupId, req.session.userId!, 'moved', id, `Moved from ${existing.status} to ${updateData.status}`);
    }

    const task = await storage.updateTask(id, existing.userId!, updateData);
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const task = (await db.select().from(tasks).where(eq(tasks.id, id)))[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.userId !== req.session.userId && task.groupId) {
      const group = await storage.getStudyGroup(task.groupId);
      if (group?.createdBy !== req.session.userId) {
        return res.status(403).json({ message: "Only the creator or owner can delete tasks" });
      }
    }

    await storage.deleteTask(id, task.userId!);
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

      await storage.createUserActivity(req.session.userId!, {
        type: "resource_share",
        points: 5,
        description: `Shared a resource: ${resource.title}`
      });

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

  app.get("/api/pomodoro-sessions", requireAuth, async (req, res) => {
    const sessions = await storage.getPomodoroSessions(req.session.userId!);
    res.json(sessions);
  });

  app.post("/api/pomodoro-sessions", requireAuth, async (req, res) => {
    const parsed = insertPomodoroSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const session_ = await storage.createPomodoroSession(req.session.userId!, parsed.data);

    // Tracking this as an activity
    await storage.createUserActivity(req.session.userId!, {
      type: "pomodoro",
      points: Math.floor(parsed.data.duration / 5), // 1 point per 5 mins
      description: `Completed a ${parsed.data.duration} minute study session`
    });

    res.status(201).json(session_);
  });

  app.get("/api/active-timer", requireAuth, async (req, res) => {
    const timer = await storage.getActiveTimer(req.session.userId!);
    if (!timer) return res.status(404).json({ message: "No active timer" });
    res.json(timer);
  });

  app.post("/api/active-timer", requireAuth, async (req, res) => {
    const parsed = insertActiveTimerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const timer = await storage.setActiveTimer(req.session.userId!, parsed.data);
    res.json(timer);
  });

  app.delete("/api/active-timer", requireAuth, async (req, res) => {
    await storage.deleteActiveTimer(req.session.userId!);
    res.status(204).send();
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

    // System notification for join
    const user = await storage.getUserById(req.session.userId!);
    if (user) {
      const message = await storage.createGroupMessage(req.session.userId!, group.id, `${user.displayName || user.username} joined the study circle`, undefined, "system");
      broadcastToGroup(group.id, "new_message", {
        ...message,
        user: { username: "System", avatar: null }
      });
    }

    res.json(group);
  });

  app.post("/api/groups/:id/leave", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const group = await storage.getStudyGroup(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy === req.session.userId) {
      return res.status(400).json({ message: "Creators cannot leave their own group. Delete the group instead." });
    }

    const isMember = await storage.isGroupMember(req.session.userId!, id);
    if (!isMember) return res.status(400).json({ message: "You are not a member of this group" });

    // System notification for leave BEFORE removing so we have the user name
    const user = await storage.getUserById(req.session.userId!);
    if (user) {
      const message = await storage.createGroupMessage(req.session.userId!, id, `${user.displayName || user.username} left the study circle`, undefined, "system");
      broadcastToGroup(id, "new_message", {
        ...message,
        user: { username: "System", avatar: null }
      });
    }

    await storage.leaveStudyGroup(req.session.userId!, id);
    res.status(204).send();
  });

  app.get("/api/groups/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.isGroupMember(req.session.userId!, id);
    if (!member) return res.status(403).json({ message: "Access denied" });

    const group = await storage.getStudyGroup(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.patch("/api/groups/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));

    // Check that user is a member (and ideally admin/creator)
    const isMember = await storage.isGroupMember(req.session.userId!, id);
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    const group = await storage.getStudyGroup(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only the creator can edit group settings
    if (group.createdBy !== req.session.userId) {
      return res.status(403).json({ message: "Only the group creator can update settings" });
    }

    const { name, description, avatarUrl } = req.body;
    if (!name && !description && avatarUrl === undefined) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updated = await storage.updateStudyGroup(id, { name, description, avatarUrl });
    res.json(updated);
  });

  app.delete("/api/groups/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const group = await storage.getStudyGroup(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy !== req.session.userId) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }

    await storage.deleteStudyGroup(id);
    res.status(204).send();
  });

  app.post("/api/groups/:id/invite", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.id));
    const { identifier } = req.body; // username or email

    if (!identifier) return res.status(400).json({ message: "User identifier required" });

    // Ensure inviter is a member
    const inviterIsMember = await storage.isGroupMember(req.session.userId!, groupId);
    if (!inviterIsMember) return res.status(403).json({ message: "Access denied" });

    // Find the target user
    let targetUser = await storage.getUserByEmail(identifier);
    if (!targetUser) {
      const [userByUsername] = await db.select().from(users).where(eq(users.username, identifier));
      targetUser = userByUsername;
    }

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const isMember = await storage.isGroupMember(targetUser.id, groupId);
    if (isMember) return res.status(400).json({ message: "User is already a member" });

    const group = await storage.getStudyGroup(groupId);
    // Create a notification/invite
    await storage.createNotification(targetUser.id, {
      title: "Group Invitation",
      message: `Heads up! You've been invited to join "${group?.name}". Use the invite code: ${group?.inviteCode} to join the study circle.`,
      type: "group"
    });

    res.json({ message: "Invitation sent successfully" });
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
    const notifs = await storage.getNotifications(req.session.userId!);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const success = await storage.markNotificationRead(id, req.session.userId!);
    if (!success) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true });
  });

  // Mark ALL unread notifications as read (single bulk call)
  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    res.json({ success: true });
  });

  app.delete("/api/notifications", requireAuth, async (req, res) => {
    await storage.clearNotifications(req.session.userId!);
    res.json({ success: true });
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
      const resource = await storage.getResource(id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });

      const content = resource.description || `Study material for ${resource.title}`;
      const quiz = await generateQuiz(content, resource.title);
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

  // Quizzes & Battles (Phase 3)
  app.get("/api/quizzes", requireAuth, async (req, res) => {
    const groupId = req.query.groupId ? parseInt(String(req.query.groupId)) : undefined;
    const quizzes = await storage.getQuizzes(groupId, req.session.userId!);
    res.json(quizzes);
  });

  app.get("/api/quizzes/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const quiz = await storage.getQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await storage.getQuizQuestions(id);
    res.json({ ...quiz, questions });
  });

  app.post("/api/quizzes/:id/submit", requireAuth, async (req, res) => {
    const quizId = parseInt(String(req.params.id));
    const result = await storage.submitQuizResult(req.session.userId!, {
      quizId,
      score: req.body.score,
      totalQuestions: req.body.totalQuestions
    });

    // Track as activity
    await storage.createUserActivity(req.session.userId!, {
      type: "quiz",
      points: req.body.score * 10, // 10 points per correct answer
      description: `Participated in a quiz battle and scored ${req.body.score}/${req.body.totalQuestions}`
    });

    // Update group contribution if it's a group quiz
    const quiz = await storage.getQuiz(quizId);
    if (quiz && quiz.groupId) {
      await storage.updateGroupMemberScore(req.session.userId!, quiz.groupId, req.body.score * 5); // 5 contribution pts per correct answer
    }

    res.json(result);
  });

  app.post("/api/resources/:id/create-quiz", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const resource = await storage.getResource(id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });

      const { title, count, difficulty, groupId, isBattle } = req.body;
      const content = resource.description || `Study material for ${resource.title}`;
      const generated = await generateQuiz(content, title || resource.title);

      const questionsToInsert = generated.slice(0, count || 5);
      const quizData = {
        title: title || resource.title,
        description: `Quiz based on ${resource.title}`,
        userId: req.session.userId!,
        groupId: groupId || null,
        resourceId: id,
        difficulty: difficulty || "medium",
        isBattle: isBattle ? 1 : 0,
        totalQuestions: questionsToInsert.length
      };

      const quiz = await storage.createQuiz(quizData, questionsToInsert);

      if (groupId) {
        const group = await storage.getStudyGroup(groupId);
        const members = await storage.getGroupMembers(groupId);
        for (const m of members) {
          if (m.userId !== req.session.userId) {
            await storage.createNotification(m.userId, {
              title: "New Battle Started!",
              message: `Challenge "${quiz.title}" is live in ${group?.name}`,
              type: "group"
            });
          }
        }
      }

      res.status(201).json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI quiz" });
    }
  });

  app.post("/api/quizzes", requireAuth, async (req, res) => {
    const { title, description, groupId, difficulty, isBattle, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: "Title and questions are required" });
    }

    const quiz = await storage.createQuiz({
      title,
      description: description || "",
      userId: req.session.userId!,
      groupId: groupId || null,
      difficulty: difficulty || "medium",
      isBattle: isBattle ? 1 : 0,
      totalQuestions: questions.length
    }, questions);

    if (groupId) {
      const group = await storage.getStudyGroup(groupId);
      const members = await storage.getGroupMembers(groupId);
      for (const m of members) {
        if (m.userId !== req.session.userId) {
          await storage.createNotification(m.userId, {
            title: "New Manual Battle",
            message: `Custom arena "${quiz.title}" forged in ${group?.name}`,
            type: "group"
          });
        }
      }
    }

    res.status(201).json(quiz);
  });

  app.delete("/api/quizzes/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const success = await storage.deleteQuiz(id, req.session.userId!);
    if (!success) return res.status(403).json({ message: "Unauthorized or quiz not found" });
    res.json({ message: "Quiz deleted" });
  });

  app.get("/api/groups/:id/leaderboard", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.id));
    const leaderboard = await storage.getGroupLeaderboard(groupId);
    res.json(leaderboard);
  });

  app.get("/api/groups/:id/kanban", requireAuth, async (req, res) => {
    const groupId = parseInt(req.params.id as string);
    const isMember = await storage.isGroupMember(req.session.userId!, groupId);
    if (!isMember) return res.status(403).json({ message: "Not a member of this group" });

    const tasks = await storage.getGroupTasks(groupId);
    const activity = await storage.getKanbanActivity(groupId);
    res.json({ tasks, activity });
  });

  app.delete("/api/groups/:id/kanban/activity", requireAuth, async (req, res) => {
    const groupId = parseInt(req.params.id as string);
    const group = await storage.getStudyGroup(groupId);
    if (group?.createdBy !== req.session.userId) {
      return res.status(403).json({ message: "Only group admin can clear activity" });
    }
    await storage.clearKanbanActivity(groupId);
    res.status(204).send();
  });

  app.post("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const { content, replyToId } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    const comment = await storage.createTaskComment(req.session.userId!, taskId, content, replyToId);

    // Log activity if it's a group task
    const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (task?.groupId) {
      await storage.logKanbanActivity(task.groupId, req.session.userId!, 'commented', taskId);
    }

    res.status(201).json(comment);
  });

  app.get("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const comments = await storage.getTaskComments(taskId);
    res.json(comments);
  });

  app.post("/api/tasks/:id/assign", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const { userId } = req.body;
    const assignment = await storage.assignUserToTask(taskId, userId);

    // Log & notify
    const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (task?.groupId) {
      await storage.logKanbanActivity(task.groupId, req.session.userId!, 'assigned', taskId, `Assigned member ID ${userId}`);
      const group = await storage.getStudyGroup(task.groupId);
      await storage.createNotification(userId, {
        title: "New Task Assignment",
        message: `You were assigned to "${task.title}" in ${group?.name}`,
        type: "group"
      });
    }

    res.json(assignment);
  });

  app.delete("/api/tasks/:id/assign/:userId", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    await storage.unassignUserFromTask(taskId, userId);
    res.status(204).send();
  });

  app.patch("/api/tasks/:id/lock", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const { isLocked } = req.body;
    const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only creator/admin can lock
    const group = await storage.getStudyGroup(task.groupId!);
    if (group?.createdBy !== req.session.userId) {
      return res.status(403).json({ message: "Only group creator can lock tasks" });
    }

    const updated = await storage.updateTask(taskId, task.userId!, { isLocked: isLocked ? 1 : 0 });
    res.json(updated);
  });

  app.get("/api/groups/:id/messages", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.id));
    const messages = await storage.getGroupMessages(groupId);
    res.json(messages);
  });

  // Chat file upload
  app.post("/api/groups/:id/messages/upload", requireAuth, (req, res) => {
    chatUpload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ message: "No file provided" });

      const groupId = parseInt(String(req.params.id));
      const isMember = await storage.isGroupMember(req.session.userId!, groupId);
      if (!isMember) return res.status(403).json({ message: "Not a group member" });

      const fileUrl = `/uploads/chat/${req.file.filename}`;
      const isImage = req.file.mimetype.startsWith("image/");
      const isVideo = req.file.mimetype.startsWith("video/");
      const label = isImage ? "📷 Image" : isVideo ? "🎥 Video" : "📎 File";
      const msgContent = `${label}: ${req.file.originalname}\n${fileUrl}`;

      const message = await storage.createGroupMessage(req.session.userId!, groupId, msgContent);
      const user = await storage.getUserById(req.session.userId!);
      if (user) {
        broadcastToGroup(groupId, "new_message", {
          ...message,
          user: { username: user.username, avatar: user.avatar }
        });
      }
      res.status(201).json({ message, fileUrl });
    });
  });

  app.post("/api/tasks/:id/ai-breakdown", requireAuth, async (req, res) => {
    const taskId = parseInt(req.params.id as string);
    const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    const subtasks = await breakDownTask(task.title, task.description || undefined);
    const updated = await storage.updateTask(taskId, task.userId!, { subtasks });
    res.json(updated);
  });

  app.post("/api/groups/:id/messages", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.id));
    const { content, replyToId } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    const message = await storage.createGroupMessage(req.session.userId!, groupId, content, replyToId);

    // Broadcast the new message to everyone in the room via WebSocket
    const user = await storage.getUserById(req.session.userId!);
    if (user) {
      broadcastToGroup(groupId, "new_message", {
        ...message,
        user: { username: user.username, avatar: user.avatar }
      });
    }

    // Create a notification for the person being replied to
    if (replyToId && user) {
      try {
        const allMsgs = await storage.getGroupMessages(groupId);
        const originalMsg = allMsgs.find(m => m.id === replyToId);
        if (originalMsg && originalMsg.userId !== req.session.userId) {
          const group = await storage.getStudyGroup(groupId);
          await storage.createNotification(originalMsg.userId, {
            title: `${user.username} replied to you`,
            message: `"${content.slice(0, 80)}${content.length > 80 ? "..." : ""}" — in ${group?.name || "a group"}`,
            type: "group"
          });
        }
      } catch (e) {
        // Don't block message send if notification fails
        console.error("Reply notification error:", e);
      }
    }

    res.status(201).json(message);

    // Track as activity
    await storage.createUserActivity(req.session.userId!, {
      type: "message",
      points: 2, // 2 points per message
      description: `Sent a message in a study group`
    });
  });

  // Edit a group message
  app.patch("/api/groups/:groupId/messages/:messageId", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.groupId));
    const messageId = parseInt(String(req.params.messageId));
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    const updated = await storage.editGroupMessage(messageId, req.session.userId!, content);
    if (!updated) return res.status(403).json({ message: "Cannot edit this message" });

    // Broadcast edit event to the group
    const user = await storage.getUserById(req.session.userId!);
    if (user) {
      broadcastToGroup(groupId, "message_edited", {
        ...updated,
        user: { username: user.username, avatar: user.avatar }
      });
    }

    res.json(updated);
  });

  // Delete a group message (soft delete)
  app.delete("/api/groups/:groupId/messages/:messageId", requireAuth, async (req, res) => {
    const groupId = parseInt(String(req.params.groupId));
    const messageId = parseInt(String(req.params.messageId));

    const success = await storage.deleteGroupMessage(messageId, req.session.userId!);
    if (!success) return res.status(403).json({ message: "Cannot delete this message" });

    // Broadcast delete event to the group
    broadcastToGroup(groupId, "message_deleted", { id: messageId });

    res.json({ success: true });
  });

  app.get("/api/users/me/activities", requireAuth, async (req, res) => {
    const activities = await storage.getUserActivities(req.session.userId!);
    res.json(activities);
  });

  app.post("/api/analytics/insights", requireAuth, async (req, res) => {
    try {
      const insight = await generateStudyInsights(req.body);
      res.json({ insight });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  return httpServer;
}
