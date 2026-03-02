# StudyFlow - SaaS Study Planner Platform

## Overview
A professional SaaS-level student study planner with authentication, subjects, tasks, Kanban board, Pomodoro timer, analytics, profile page with heatmap calendar, dark mode, streaks, and productivity scoring.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts, wouter, @hello-pangea/dnd
- **Backend**: Express.js with express-session, bcryptjs, connect-pg-simple
- **Database**: PostgreSQL (Drizzle ORM)
- **State Management**: TanStack React Query
- **Auth**: Session-based with bcrypt password hashing

## Structure
```
client/src/
  components/
    app-sidebar.tsx      - Sidebar with nav + user info + logout
    theme-provider.tsx   - Dark/light mode context
    theme-toggle.tsx     - Theme toggle button
  hooks/
    use-auth.ts          - Authentication hook (login/register/logout)
  pages/
    auth.tsx             - Login/Register page with hero section
    dashboard.tsx        - Overview with stats, deadlines, heatmap, progress
    subjects.tsx         - CRUD for study subjects with colors, icons, difficulty
    tasks.tsx            - CRUD for tasks with filtering/tabs/status
    kanban.tsx           - Drag & drop Kanban board (Backlog/In Progress/Review/Completed)
    pomodoro.tsx         - Pomodoro timer with session tracking
    analytics.tsx        - Charts and study analytics
    profile.tsx          - User profile, heatmap calendar, subject performance, edit profile
  App.tsx                - Root layout with auth gating
shared/
  schema.ts              - Drizzle schema (users, subjects, tasks, pomodoro_sessions)
server/
  routes.ts              - Auth + REST API endpoints
  storage.ts             - Database storage layer
```

## Database Tables
- `users` - Auth + profile (username, email, password, displayName, streakCount, totalStudyMinutes, productivityScore)
- `subjects` - Study subjects (userId, name, color, icon, difficultyLevel)
- `tasks` - Tasks (userId, title, description, subjectId, priority, status, deadline, estimatedMinutes, kanbanOrder)
- `pomodoro_sessions` - Focus sessions (userId, subjectId, taskId, duration, completedAt)

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `GET/POST /api/subjects`, `PATCH/DELETE /api/subjects/:id`
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/pomodoro-sessions`

## Features
1. Full authentication (register/login/logout with bcrypt + sessions)
2. Subject management with colors, icons, difficulty levels
3. Smart task system with priorities, deadlines, status, estimated time
4. Kanban board with drag & drop
5. Pomodoro timer (Focus/Short Break/Long Break)
6. Analytics with charts (area, bar, pie)
7. Profile page with GitHub-style heatmap calendar
8. Daily streak tracking
9. Productivity scoring
10. Dark/light mode toggle
