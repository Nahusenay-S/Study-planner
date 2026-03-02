import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertSubjectSchema, insertTaskSchema, insertPomodoroSessionSchema, updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

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
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
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
    const id = parseInt(req.params.id);
    const parsed = updateSubjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const subject = await storage.updateSubject(id, req.session.userId!, parsed.data);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  });

  app.delete("/api/subjects/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
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
    const owned = await storage.getSubject(parsed.data.subjectId, req.session.userId!);
    if (!owned) return res.status(400).json({ message: "Subject not found" });
    const task = await storage.createTask(req.session.userId!, parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    if (parsed.data.subjectId) {
      const owned = await storage.getSubject(parsed.data.subjectId, req.session.userId!);
      if (!owned) return res.status(400).json({ message: "Subject not found" });
    }
    const task = await storage.updateTask(id, req.session.userId!, parsed.data);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteTask(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
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

  return httpServer;
}
