import {
  type Subject, type InsertSubject,
  type Task, type InsertTask,
  type PomodoroSession, type InsertPomodoroSession,
  subjects, tasks, pomodoroSessions
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<void>;

  getTasks(): Promise<Task[]>;
  getTasksBySubject(subjectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  getPomodoroSessions(): Promise<PomodoroSession[]>;
  createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession>;
}

export class DatabaseStorage implements IStorage {
  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects);
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values(subject).returning();
    return created;
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db.update(subjects).set(subject).where(eq(subjects.id, id)).returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksBySubject(subjectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.subjectId, subjectId));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getPomodoroSessions(): Promise<PomodoroSession[]> {
    return await db.select().from(pomodoroSessions);
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    const [created] = await db.insert(pomodoroSessions).values(session).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
