import {
  type User, type Subject, type InsertSubject,
  type Task, type InsertTask,
  type PomodoroSession, type InsertPomodoroSession,
  type Resource, type InsertResource,
  type StudyGroup, type InsertStudyGroup, type GroupMember,
  type Comment, type InsertComment, type Notification,
  users, subjects, tasks, pomodoroSessions, resources,
  studyGroups, groupMembers, comments, notifications,
  groupMessages, quizzes, quizQuestions, quizResults, userActivities,
  taskAssignments, taskComments, taskAttachments, kanbanActivity, activeTimer,
  type GroupMessage, type Quiz, type QuizQuestion, type QuizResult, type UserActivity,
  type TaskAssignment, type TaskComment, type TaskAttachment, type KanbanActivity,
  type ActiveTimer, type InsertActiveTimer
} from "@shared/schema";
import { eq, and, or, desc, asc, inArray, isNull } from "drizzle-orm";
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
  getGroupTasks(groupId: number): Promise<(Task & { assignments: (TaskAssignment & { user: { username: string, avatar: string | null } })[] })[]>;
  getTask(id: number, userId: number): Promise<Task | undefined>;
  createTask(userId: number, task: InsertTask): Promise<Task>;
  updateTask(id: number, userId: number, task: Partial<InsertTask & { completedAt: string | null }>): Promise<Task | undefined>;
  deleteTask(id: number, userId: number): Promise<boolean>;

  // Pomodoro
  getPomodoroSessions(userId: number): Promise<PomodoroSession[]>;
  createPomodoroSession(userId: number, session: InsertPomodoroSession): Promise<PomodoroSession>;
  getActiveTimer(userId: number): Promise<ActiveTimer | undefined>;
  setActiveTimer(userId: number, timer: InsertActiveTimer): Promise<ActiveTimer>;
  deleteActiveTimer(userId: number): Promise<void>;

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
  updateStudyGroup(id: number, data: { name?: string; description?: string; avatarUrl?: string }): Promise<StudyGroup | undefined>;

  // Comments (Phase 2)
  getComments(resourceId: number): Promise<(Comment & { user: { id: number, username: string, displayName: string | null, avatar: string | null, bio: string | null } })[]>;
  createComment(userId: number, comment: InsertComment): Promise<Comment>;

  // Notifications (Phase 2)
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(userId: number, notification: { title: string; message: string; type: string }): Promise<Notification>;
  markNotificationRead(id: number, userId: number): Promise<boolean>;
  markAllNotificationsRead(userId: number): Promise<boolean>;
  clearNotifications(userId: number): Promise<boolean>;
  clearKanbanActivity(groupId: number): Promise<void>;

  // Premium Group Features (Phase 3)
  getGroupMessages(groupId: number): Promise<(GroupMessage & { user: { username: string, avatar: string | null } })[]>;
  createGroupMessage(userId: number, groupId: number, content: string, replyToId?: number): Promise<GroupMessage>;
  editGroupMessage(id: number, userId: number, content: string): Promise<GroupMessage | undefined>;
  deleteGroupMessage(id: number, userId: number): Promise<boolean>;
  getQuizzes(groupId?: number): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizQuestions(quizId: number): Promise<QuizQuestion[]>;
  createQuiz(data: any, questions: any[]): Promise<Quiz>;
  submitQuizResult(userId: number, data: any): Promise<QuizResult>;
  getGroupLeaderboard(groupId: number): Promise<{ username: string, streakCount: number, productivityScore: number, totalStudyMinutes: number, avatar: string | null }[]>;

  // Activity Tracking
  getUserActivities(userId: number): Promise<UserActivity[]>;
  createUserActivity(userId: number, data: { type: string; points: number; description?: string }): Promise<UserActivity>;
  updateUserStreak(userId: number): Promise<void>;
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
    return await db.select().from(tasks).where(and(eq(tasks.userId, userId), isNull(tasks.groupId)));
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
    // Session Merging Logic: Check if we should append to the last session
    // This allows real-time minute updates while keeping history clean.
    const [lastSession] = await db.select().from(pomodoroSessions)
      .where(eq(pomodoroSessions.userId, userId))
      .orderBy(desc(pomodoroSessions.id))
      .limit(1);

    const now = new Date();
    const canMerge = lastSession &&
      lastSession.type === (session.type || 'focus') &&
      lastSession.subjectId === session.subjectId &&
      lastSession.taskId === session.taskId &&
      (now.getTime() - new Date(lastSession.completedAt).getTime()) < 300000; // 5 minute window

    let result: PomodoroSession;

    if (canMerge && lastSession) {
      const [updated] = await db.update(pomodoroSessions)
        .set({
          duration: lastSession.duration + session.duration,
          completedAt: session.completedAt
        })
        .where(eq(pomodoroSessions.id, lastSession.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db.insert(pomodoroSessions).values({ ...session, userId }).returning();
      result = created;
    }

    // If it's a focus session, update total study minutes on the user
    if (session.type === 'focus' || !session.type) {
      const user = await this.getUserById(userId);
      if (user) {
        await this.updateUser(userId, {
          totalStudyMinutes: user.totalStudyMinutes + (session.duration || 0)
        });
        await this.updateUserStreak(userId);
      }
    }

    return result;
  }

  async getActiveTimer(userId: number): Promise<ActiveTimer | undefined> {
    const [timer] = await db.select().from(activeTimer).where(eq(activeTimer.userId, userId));
    return timer;
  }

  async setActiveTimer(userId: number, timer: InsertActiveTimer): Promise<ActiveTimer> {
    // Upsert logic
    await this.deleteActiveTimer(userId);
    const [created] = await db.insert(activeTimer).values({ ...timer, userId }).returning();
    return created;
  }

  async deleteActiveTimer(userId: number): Promise<void> {
    await db.delete(activeTimer).where(eq(activeTimer.userId, userId));
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

  async updateStudyGroup(id: number, data: { name?: string; description?: string; avatarUrl?: string }): Promise<StudyGroup | undefined> {
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    const [updated] = await db.update(studyGroups).set(updates).where(eq(studyGroups.id, id)).returning();
    return updated;
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

  async leaveStudyGroup(userId: number, groupId: number): Promise<boolean> {
    const result = await db.delete(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId))).returning();
    return result.length > 0;
  }

  async deleteStudyGroup(id: number): Promise<boolean> {
    const result = await db.delete(studyGroups).where(eq(studyGroups.id, id)).returning();
    return result.length > 0;
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

  // Kanban & Task Features (Expanded)
  async getGroupTasks(groupId: number): Promise<(Task & { assignments: (TaskAssignment & { user: { username: string, avatar: string | null } })[] })[]> {
    const results = await db.select().from(tasks).where(eq(tasks.groupId, groupId));

    // Optimize: In a real app we might join, but here we can map for simplicity given the frequency
    const enrichedTasks = await Promise.all(results.map(async (task) => {
      const assignments = await db.select({
        assignment: taskAssignments,
        user: users
      })
        .from(taskAssignments)
        .innerJoin(users, eq(taskAssignments.userId, users.id))
        .where(eq(taskAssignments.taskId, task.id));

      return {
        ...task,
        assignments: assignments.map(a => ({
          ...a.assignment,
          user: { username: a.user.username, avatar: a.user.avatar }
        }))
      };
    }));

    return enrichedTasks;
  }

  async getTaskAssignments(taskId: number): Promise<(TaskAssignment & { user: { username: string, avatar: string | null } })[]> {
    const results = await db.select({
      assignment: taskAssignments,
      user: users
    })
      .from(taskAssignments)
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .where(eq(taskAssignments.taskId, taskId));

    return results.map(r => ({
      ...r.assignment,
      user: { username: r.user.username, avatar: r.user.avatar }
    }));
  }

  async assignUserToTask(taskId: number, userId: number): Promise<TaskAssignment> {
    const [existing] = await db.select().from(taskAssignments).where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.userId, userId)));
    if (existing) return existing;

    const [assignment] = await db.insert(taskAssignments).values({ taskId, userId }).returning();
    return assignment;
  }

  async unassignUserFromTask(taskId: number, userId: number): Promise<boolean> {
    const result = await db.delete(taskAssignments).where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.userId, userId))).returning();
    return result.length > 0;
  }

  async getTaskComments(taskId: number): Promise<(TaskComment & { user: { username: string, avatar: string | null } })[]> {
    const results = await db.select({
      comment: taskComments,
      user: users
    })
      .from(taskComments)
      .innerJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.id));

    return results.map(r => ({
      ...r.comment,
      user: { username: r.user.username, avatar: r.user.avatar }
    }));
  }

  async createTaskComment(userId: number, taskId: number, content: string, replyToId?: number): Promise<TaskComment> {
    const [comment] = await db.insert(taskComments).values({
      userId,
      taskId,
      content,
      replyToId: replyToId || null
    }).returning();
    return comment;
  }

  async getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
    return await db.select().from(taskAttachments).where(eq(taskAttachments.taskId, taskId));
  }

  async createTaskAttachment(userId: number, taskId: number, attachment: { name: string, url: string, type: string }): Promise<TaskAttachment> {
    const [created] = await db.insert(taskAttachments).values({
      ...attachment,
      userId,
      taskId
    }).returning();
    return created;
  }

  async getKanbanActivity(groupId: number): Promise<(KanbanActivity & { user: { username: string, avatar: string | null }, taskTitle: string | null })[]> {
    const results = await db.select({
      activity: kanbanActivity,
      user: users,
      task: tasks
    })
      .from(kanbanActivity)
      .innerJoin(users, eq(kanbanActivity.userId, users.id))
      .leftJoin(tasks, eq(kanbanActivity.taskId, tasks.id))
      .where(eq(kanbanActivity.groupId, groupId))
      .orderBy(desc(kanbanActivity.id))
      .limit(50);

    return results.map(r => ({
      ...r.activity,
      user: { username: r.user.username, avatar: r.user.avatar },
      taskTitle: r.task?.title || null
    }));
  }

  async logKanbanActivity(groupId: number, userId: number, action: string, taskId?: number, details?: string): Promise<KanbanActivity> {
    const [activity] = await db.insert(kanbanActivity).values({
      groupId,
      userId,
      taskId: taskId || null,
      action,
      details: details || null
    }).returning();
    return activity;
  }

  async clearKanbanActivity(groupId: number): Promise<void> {
    await db.delete(kanbanActivity).where(eq(kanbanActivity.groupId, groupId));
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

  async markAllNotificationsRead(userId: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)))
      .returning();
    return result.length > 0;
  }

  async clearNotifications(userId: number): Promise<boolean> {
    const result = await db.delete(notifications)
      .where(eq(notifications.userId, userId))
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

  async createGroupMessage(userId: number, groupId: number, content: string, replyToId?: number, attachmentType?: string): Promise<GroupMessage> {
    const [message] = await db.insert(groupMessages).values({
      userId,
      groupId,
      content,
      replyToId: replyToId || null,
      attachmentType: attachmentType || null
    }).returning();
    return message;
  }

  async editGroupMessage(id: number, userId: number, content: string): Promise<GroupMessage | undefined> {
    const [msg] = await db.select().from(groupMessages).where(eq(groupMessages.id, id));
    if (!msg || msg.userId !== userId) return undefined;
    const [updated] = await db.update(groupMessages)
      .set({ content, isEdited: 1 })
      .where(eq(groupMessages.id, id))
      .returning();
    return updated;
  }

  async deleteGroupMessage(id: number, userId: number): Promise<boolean> {
    const [msg] = await db.select().from(groupMessages).where(eq(groupMessages.id, id));
    if (!msg || msg.userId !== userId) return false;
    await db.update(groupMessages)
      .set({ isDeleted: 1, content: '' })
      .where(eq(groupMessages.id, id));
    return true;
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

  async deleteQuiz(id: number, userId: number): Promise<boolean> {
    // Check if user is creator or group admin
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    if (!quiz) return false;

    if (quiz.userId === userId) {
      await db.delete(quizzes).where(eq(quizzes.id, id));
      return true;
    }

    if (quiz.groupId) {
      const [member] = await db.select().from(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, quiz.groupId)));
      if (member && member.role === 'admin') {
        await db.delete(quizzes).where(eq(quizzes.id, id));
        return true;
      }
    }

    return false;
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

  async getUserActivities(userId: number): Promise<UserActivity[]> {
    return await db.select().from(userActivities).where(eq(userActivities.userId, userId)).orderBy(desc(userActivities.id));
  }

  async createUserActivity(userId: number, data: { type: string; points: number; description?: string }): Promise<UserActivity> {
    const [activity] = await db.insert(userActivities).values({
      userId,
      type: data.type,
      points: data.points,
      description: data.description || null
    }).returning();

    // Also update user's total productivity score
    const user = await this.getUserById(userId);
    if (user) {
      await this.updateUser(userId, {
        productivityScore: user.productivityScore + data.points
      });
      await this.updateUserStreak(userId);
    }

    return activity;
  }

  async updateGroupMemberScore(userId: number, groupId: number, points: number): Promise<void> {
    const [member] = await db.select().from(groupMembers).where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    if (member) {
      await db.update(groupMembers)
        .set({ contributionScore: member.contributionScore + points })
        .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    }
  }

  async updateUserStreak(userId: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const lastActive = user.lastActiveDate;

    if (lastActive === today) return;

    let newStreak = user.streakCount;
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await this.updateUser(userId, {
      lastActiveDate: today,
      streakCount: newStreak
    });
  }
}

export const storage = new DatabaseStorage();
