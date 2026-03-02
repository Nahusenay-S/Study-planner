import { sql } from "drizzle-orm";
import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull().default("BookOpen"),
});

export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  deadline: text("deadline"),
  estimatedMinutes: integer("estimated_minutes"),
  completedAt: text("completed_at"),
});

export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  duration: integer("duration").notNull(),
  completedAt: text("completed_at").notNull(),
});

export const insertSubjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().default("BookOpen"),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  subjectId: z.number().int(),
  priority: z.string().default("medium"),
  status: z.string().default("todo"),
  deadline: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
});

export const insertPomodoroSessionSchema = z.object({
  subjectId: z.number().int().nullable().optional(),
  taskId: z.number().int().nullable().optional(),
  duration: z.number().int(),
  completedAt: z.string(),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
