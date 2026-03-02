import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  streakCount: integer("streak_count").notNull().default(0),
  totalStudyMinutes: integer("total_study_minutes").notNull().default(0),
  productivityScore: integer("productivity_score").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull().default("BookOpen"),
  difficultyLevel: integer("difficulty_level").notNull().default(3),
});

export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  deadline: text("deadline"),
  estimatedMinutes: integer("estimated_minutes"),
  completedAt: text("completed_at"),
  kanbanOrder: integer("kanban_order").notNull().default(0),
});

export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  duration: integer("duration").notNull(),
  completedAt: text("completed_at").notNull(),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertSubjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().default("BookOpen"),
  difficultyLevel: z.number().int().min(1).max(5).default(3),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  subjectId: z.number().int(),
  priority: z.string().default("medium"),
  status: z.string().default("todo"),
  deadline: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  kanbanOrder: z.number().int().default(0),
});

export const insertPomodoroSessionSchema = z.object({
  subjectId: z.number().int().nullable().optional(),
  taskId: z.number().int().nullable().optional(),
  duration: z.number().int(),
  completedAt: z.string(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
