import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  bio: text("bio"),
  role: text("role").notNull().default("user"), // 'super_admin', 'admin', 'user'
  isAdmin: integer("is_admin").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  totalStudyMinutes: integer("total_study_minutes").notNull().default(0),
  productivityScore: integer("productivity_score").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  readinessScore: integer("readiness_score").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
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
  avatarUrl: text("avatar_url"),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const groupMembers = pgTable("group_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'admin', 'moderator', 'member', 'restricted'
  contributionScore: integer("contribution_score").notNull().default(0),
  lastSeenAt: text("last_seen_at"),
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
  isPublic: integer("is_public").notNull().default(0),
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
  isPublic: z.coerce.number().int().default(0),
});

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().max(160).optional(),
});

export const groupMessages = pgTable("group_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  replyToId: integer("reply_to_id").references((): any => groupMessages.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  isEdited: integer("is_edited").notNull().default(0),
  isDeleted: integer("is_deleted").notNull().default(0), // 0=active, 1=deleted_by_user, 2=deleted_by_admin
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // 'image', 'pdf', 'link', 'code'
  attachmentName: text("attachment_name"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const quizzes = pgTable("quizzes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  groupId: integer("group_id").references(() => studyGroups.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").references(() => resources.id, { onDelete: "set null" }),
  difficulty: text("difficulty").notNull().default("medium"),
  isBattle: integer("is_battle").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON string array
  correctAnswer: text("correct_answer").notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
});

export const quizResults = pgTable("quiz_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: text("completed_at").notNull().default(sql`now()`),
});

export const insertGroupMessageSchema = z.object({
  groupId: z.number().int(),
  content: z.string().min(1),
  replyToId: z.number().int().nullish(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
  attachmentName: z.string().optional(),
});

export const insertQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  groupId: z.number().int().optional(),
  resourceId: z.number().int().optional(),
  difficulty: z.string().default("medium"),
  isBattle: z.number().int().default(0),
});

export const insertQuizResultSchema = z.object({
  quizId: z.number().int(),
  score: z.number().int(),
  totalQuestions: z.number().int(),
});

export const userActivities = pgTable("user_activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'pomodoro', 'message', 'quiz', 'resource_share'
  points: integer("points").notNull().default(0),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`now()`),
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
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizResult = typeof quizResults.$inferSelect;
export type UserActivity = typeof userActivities.$inferSelect;
