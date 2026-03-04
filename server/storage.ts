import {
  type User, type Subject, type InsertSubject,
  type Task, type InsertTask,
  type PomodoroSession, type InsertPomodoroSession,
  type Resource, type InsertResource,
  type StudyGroup, type InsertStudyGroup, type GroupMember,
  type Comment, type InsertComment, type Notification,
  users, subjects, tasks, pomodoroSessions, resources,
  studyGroups, groupMembers, comments, notifications,
  groupMessages, quizzes, quizQuestions, quizResults,
  type GroupMessage, type Quiz, type QuizQuestion, type QuizResult
} from "@shared/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { nanoid } from "nanoid";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // Auth & Profile
  createUser(data: { username: string; email: string; password: string; displayName?: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;

  // Subjects
  getSubjects(userId: number): Promise<Subject[]>;
  getSubject(id: number, userId: number): Promise<Subject | undefined>;
  createSubject(userId: number, subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, userId: number, subject: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number, userId: number): Promise<boolean>;

  // Tasks
  getTasks(userId: number): Promise<Task[]>;
  getGroupTasks(groupId: number): Promise<Task[]>;
  getTask(id: number, userId: number): Promise<Task | undefined>;
  createTask(userId: number, task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined>;
  deleteTask(id: number, userId: number): Promise<boolean>;

  // Pomodoro
  getPomodoroSessions(userId: number): Promise<PomodoroSession[]>;
  createPomodoroSession(userId: number, session: InsertPomodoroSession): Promise<PomodoroSession>;

  // Resources
  getResources(userId: number): Promise<Resource[]>;
  getResourcesByUser(userId: number): Promise<Resource[]>;
  getGroupResources(groupId: number): Promise<Resource[]>;
  getResource(id: number): Promise<Resource | undefined>;
  createResource(userId: number, resource: InsertResource & { filePath?: string; fileName?: string }): Promise<Resource>;
  updateResource(id: number, userId: number, data: Partial<Resource>): Promise<Resource | undefined>;
  deleteResource(id: number, userId: number): Promise<boolean>;

  // Study Groups (Phase 2)
  createStudyGroup(userId: number, group: InsertStudyGroup): Promise<StudyGroup>;
  getStudyGroups(userId: number): Promise<StudyGroup[]>;
  getStudyGroup(id: number): Promise<StudyGroup | undefined>;
  getStudyGroupByInviteCode(inviteCode: string): Promise<StudyGroup | undefined>;
  joinStudyGroup(userId: number, groupId: number, role?: string): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: { id: number, username: string, email: string, displayName: string | null, avatar: string | null, bio: string | null } })[]>;
  isGroupMember(userId: number, groupId: number): Promise<boolean>;

  // Comments (Phase 2)
  getComments(resourceId: number): Promise<(Comment & { user: { id: number, username: string, displayName: string | null, avatar: string | null, bio: string | null } })[]>;
  createComment(userId: number, comment: InsertComment): Promise<Comment>;

  // Notifications (Phase 2)
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(userId: number, notification: { title: string; message: string; type: string }): Promise<Notification>;
  markNotificationRead(id: number, userId: number): Promise<boolean>;

  // Premium Group Features (Phase 3)
  getGroupMessages(groupId: number): Promise<(GroupMessage & { user: { username: string, avatar: string | null } })[]>;
  createGroupMessage(userId: number, groupId: number, content: string, replyToId?: number): Promise<GroupMessage>;
  getQuizzes(groupId?: number): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuiz(data: any, questions: any[]): Promise<Quiz>;
  submitQuizResult(userId: number, data: any): Promise<QuizResult>;
  getGroupLeaderboard(groupId: number): Promise<{ username: string, streakCount: number, productivityScore: number, totalStudyMinutes: number, avatar: string | null }[]>;
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

  async getGroupTasks(groupId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.groupId, groupId));
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

  async getResources(userId: number): Promise<Resource[]> {
    const userGroups = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userGroups.map(g => g.groupId);

    if (groupIds.length > 0) {
      return await db.select().from(resources).where(
        or(
          eq(resources.userId, userId),
          inArray(resources.groupId, groupIds)
        )
      );
    } else {
      return await db.select().from(resources).where(
        eq(resources.userId, userId)
      );
    }
  }

  async getResourcesByUser(userId: number): Promise<Resource[]> {
    return await db.select().from(resources).where(eq(resources.userId, userId));
  }

  async getGroupResources(groupId: number): Promise<Resource[]> {
    return await db.select().from(resources).where(eq(resources.groupId, groupId));
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  async createResource(userId: number, resource: InsertResource & { filePath?: string; fileName?: string }): Promise<Resource> {
    const [created] = await db.insert(resources).values({ ...resource, userId }).returning();
    return created;
  }

  async updateResource(id: number, userId: number, data: Partial<Resource>): Promise<Resource | undefined> {
    const [updated] = await db.update(resources).set(data).where(and(eq(resources.id, id), eq(resources.userId, userId))).returning();
    return updated;
  }

  async deleteResource(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(resources).where(and(eq(resources.id, id), eq(resources.userId, userId))).returning();
    return result.length > 0;
  }

  // Study Groups (Phase 2)
  async createStudyGroup(userId: number, group: InsertStudyGroup): Promise<StudyGroup> {
    const inviteCode = nanoid(10);
    const [created] = await db.insert(studyGroups).values({
      ...group,
      inviteCode,
      createdBy: userId
    }).returning();

    // Creator automatically becomes an admin
    await this.joinStudyGroup(userId, created.id, "admin");
    return created;
  }

  async getStudyGroups(userId: number): Promise<StudyGroup[]> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    if (members.length === 0) return [];

    const groupIds = members.map(m => m.groupId);
    return await db.select().from(studyGroups).where(or(...groupIds.map(id => eq(studyGroups.id, id))));
  }

  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    const [group] = await db.select().from(studyGroups).where(eq(studyGroups.id, id));
    return group;
  }

  async getStudyGroupByInviteCode(inviteCode: string): Promise<StudyGroup | undefined> {
    const [group] = await db.select().from(studyGroups).where(eq(studyGroups.inviteCode, inviteCode));
    return group;
  }

  async joinStudyGroup(userId: number, groupId: number, role: string = "member"): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values({
      userId,
      groupId,
      role
    }).returning();
    return member;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: { id: number, username: string, email: string, displayName: string | null, avatar: string | null, bio: string | null } })[]> {
    const results = await db.select({
      member: groupMembers,
      user: users
    }).from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return results.map(r => ({
      ...r.member,
      user: {
        id: r.user.id,
        username: r.user.username,
        email: r.user.email,
        displayName: r.user.displayName,
        avatar: r.user.avatar,
        bio: r.user.bio
      }
    }));
  }

  async isGroupMember(userId: number, groupId: number): Promise<boolean> {
    const [member] = await db.select().from(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    return !!member;
  }

  // Comments (Phase 2)
  async getComments(resourceId: number): Promise<(Comment & { user: { id: number, username: string, displayName: string | null, avatar: string | null, bio: string | null } })[]> {
    const results = await db.select({
      comment: comments,
      user: users
    }).from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.resourceId, resourceId))
      .orderBy(desc(comments.id));

    return results.map(r => ({
      ...r.comment,
      user: {
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName,
        avatar: r.user.avatar,
        bio: r.user.bio
      }
    }));
  }

  async createComment(userId: number, comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values({
      ...comment,
      userId
    }).returning();
    return created;
  }

  // Notifications (Phase 2)
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.id));
  }

  async createNotification(userId: number, notification: { title: string; message: string; type: string }): Promise<Notification> {
    const [created] = await db.insert(notifications).values({
      ...notification,
      userId
    }).returning();
    return created;
  }

  async markNotificationRead(id: number, userId: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Premium Group Features (Phase 3)
  async getGroupMessages(groupId: number): Promise<(GroupMessage & { user: { username: string, avatar: string | null } })[]> {
    const results = await db.select({
      message: groupMessages,
      user: users
    }).from(groupMessages)
      .innerJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(desc(groupMessages.id));

    return results.map(r => ({
      ...r.message,
      user: {
        username: r.user.username,
        avatar: r.user.avatar
      }
    }));
  }

  async createGroupMessage(userId: number, groupId: number, content: string, replyToId?: number): Promise<GroupMessage> {
    const [message] = await db.insert(groupMessages).values({
      userId,
      groupId,
      content,
      replyToId: replyToId || null
    }).returning();
    return message;
  }

  async getQuizzes(groupId?: number, userId?: number): Promise<Quiz[]> {
    if (groupId) {
      return await db.select().from(quizzes).where(eq(quizzes.groupId, groupId));
    }
    if (userId) {
      const userGroups = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
      const groupIds = userGroups.map(g => g.groupId);

      if (groupIds.length > 0) {
        return await db.select().from(quizzes).where(
          or(
            eq(quizzes.userId, userId),
            inArray(quizzes.groupId, groupIds)
          )
        );
      }
      return await db.select().from(quizzes).where(eq(quizzes.userId, userId));
    }
    return await db.select().from(quizzes);
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async createQuiz(data: any, questions: any[]): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(data).returning();
    if (questions.length > 0) {
      await db.insert(quizQuestions).values(
        questions.map(q => ({
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          correctIndex: q.correctIndex,
          explanation: q.explanation
        }))
      );
    }
    return quiz;
  }

  async submitQuizResult(userId: number, data: any): Promise<QuizResult> {
    const [result] = await db.insert(quizResults).values({ ...data, userId }).returning();
    return result;
  }

  async getGroupLeaderboard(groupId: number): Promise<{ username: string, streakCount: number, productivityScore: number, totalStudyMinutes: number, avatar: string | null }[]> {
    const members = await db.select({
      username: users.username,
      streakCount: users.streakCount,
      productivityScore: users.productivityScore,
      totalStudyMinutes: users.totalStudyMinutes,
      avatar: users.avatar
    }).from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(desc(users.streakCount));

    return members;
  }
}

export const storage = new DatabaseStorage();
