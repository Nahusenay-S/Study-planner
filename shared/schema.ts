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
  isAdmin: integer("is_admin").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  totalStudyMinutes: integer("total_study_minutes").notNull().default(0),
  productivityScore: integer("productivity_score").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  readinessScore: integer("readiness_score").notNull().default(0),
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

export const studyGroups = pgTable("study_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const groupMembers = pgTable("group_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'admin' or 'member'
  joinedAt: text("joined_at").notNull().default(sql`now()`),
});

export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => studyGroups.id, { onDelete: "cascade" }),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  deadline: text("deadline"),
  estimatedMinutes: integer("estimated_minutes"),
  completedAt: text("completed_at"),
  kanbanOrder: integer("kanban_order").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("normal"),
});

export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  duration: integer("duration").notNull(),
  completedAt: text("completed_at").notNull(),
});

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => studyGroups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  url: text("url"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  isPublic: integer("is_public").notNull().default(1),
  aiSummary: text("ai_summary"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const comments = pgTable("comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'deadline', 'group', 'resource'
  isRead: integer("is_read").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
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

export const insertStudyGroupSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
});

export const insertCommentSchema = z.object({
  resourceId: z.number().int(),
  content: z.string().min(1),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  subjectId: z.number().int().nullable().optional(),
  groupId: z.number().int().nullable().optional(),
  assignedTo: z.number().int().nullable().optional(),
  priority: z.string().default("medium"),
  status: z.string().default("todo"),
  deadline: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  kanbanOrder: z.number().int().default(0),
  riskLevel: z.string().default("normal"),
});

export const insertPomodoroSessionSchema = z.object({
  subjectId: z.number().int().nullable().optional(),
  taskId: z.number().int().nullable().optional(),
  duration: z.number().int(),
  completedAt: z.string(),
});

export const insertResourceSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.enum(["link", "file", "note"]),
  url: z.string().nullable().optional(),
  subjectId: z.coerce.number().int().nullable().optional(),
  groupId: z.coerce.number().int().nullable().optional(),
  isPublic: z.coerce.number().int().default(1),
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
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Notification = typeof notifications.$inferSelect;
