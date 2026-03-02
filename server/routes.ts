import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubjectSchema, insertTaskSchema, insertPomodoroSessionSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/subjects", async (_req, res) => {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  });

  app.post("/api/subjects", async (req, res) => {
    const parsed = insertSubjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const subject = await storage.createSubject(parsed.data);
    res.status(201).json(subject);
  });

  app.patch("/api/subjects/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const subject = await storage.updateSubject(id, req.body);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSubject(id);
    res.status(204).send();
  });

  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.updateTask(id, req.body);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTask(id);
    res.status(204).send();
  });

  app.get("/api/pomodoro-sessions", async (_req, res) => {
    const sessions = await storage.getPomodoroSessions();
    res.json(sessions);
  });

  app.post("/api/pomodoro-sessions", async (req, res) => {
    const parsed = insertPomodoroSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const session = await storage.createPomodoroSession(parsed.data);
    res.status(201).json(session);
  });

  return httpServer;
}
