import {
  type User, type Subject, type InsertSubject,
  type Task, type InsertTask,
  type PomodoroSession, type InsertPomodoroSession,
  users, subjects, tasks, pomodoroSessions
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  createUser(data: { username: string; email: string; password: string; displayName?: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;

  getSubjects(userId: number): Promise<Subject[]>;
  getSubject(id: number, userId: number): Promise<Subject | undefined>;
  createSubject(userId: number, subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, userId: number, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number, userId: number): Promise<boolean>;

  getTasks(userId: number): Promise<Task[]>;
  getTask(id: number, userId: number): Promise<Task | undefined>;
  createTask(userId: number, task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined>;
  deleteTask(id: number, userId: number): Promise<boolean>;

  getPomodoroSessions(userId: number): Promise<PomodoroSession[]>;
  createPomodoroSession(userId: number, session: InsertPomodoroSession): Promise<PomodoroSession>;
}

export class DatabaseStorage implements IStorage {
  async createUser(data: { username: string; email: string; password: string; displayName?: string }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getSubjects(userId: number): Promise<Subject[]> {
    return await db.select().from(subjects).where(eq(subjects.userId, userId));
  }

  async getSubject(id: number, userId: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, userId)));
    return subject;
  }

  async createSubject(userId: number, subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values({ ...subject, userId }).returning();
    return created;
  }

  async updateSubject(id: number, userId: number, subject: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db.update(subjects).set(subject).where(and(eq(subjects.id, id), eq(subjects.userId, userId))).returning();
    return updated;
  }

  async deleteSubject(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, userId))).returning();
    return result.length > 0;
  }

  async getTasks(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async getTask(id: number, userId: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(userId: number, task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values({ ...task, userId }).returning();
    return created;
  }

  async updateTask(id: number, userId: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return updated;
  }

  async deleteTask(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return result.length > 0;
  }

  async getPomodoroSessions(userId: number): Promise<PomodoroSession[]> {
    return await db.select().from(pomodoroSessions).where(eq(pomodoroSessions.userId, userId));
  }

  async createPomodoroSession(userId: number, session: InsertPomodoroSession): Promise<PomodoroSession> {
    const [created] = await db.insert(pomodoroSessions).values({ ...session, userId }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
