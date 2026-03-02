# StudyFlow - Student Study Planner Dashboard

## Overview
A full-stack student study planner with subjects, tasks, deadlines, progress tracking, Pomodoro timer, dark mode, and analytics.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, shadcn/ui, Recharts, wouter routing
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL (Drizzle ORM)
- **State Management**: TanStack React Query

## Structure
```
client/src/
  components/
    app-sidebar.tsx      - Sidebar navigation
    theme-provider.tsx   - Dark/light mode context
    theme-toggle.tsx     - Theme toggle button
  pages/
    dashboard.tsx        - Overview with stats, deadlines, progress
    subjects.tsx         - CRUD for study subjects
    tasks.tsx            - CRUD for tasks with filtering/tabs
    pomodoro.tsx         - Pomodoro timer with session tracking
    analytics.tsx        - Charts and study analytics
  App.tsx                - Root layout with sidebar
shared/
  schema.ts              - Drizzle schema (subjects, tasks, pomodoro_sessions)
server/
  routes.ts              - REST API endpoints
  storage.ts             - Database storage layer
```

## Database Tables
- `subjects` - Study subjects (name, color, icon)
- `tasks` - Tasks (title, description, subjectId, priority, status, deadline, estimatedMinutes)
- `pomodoro_sessions` - Focus sessions (subjectId, taskId, duration, completedAt)

## API Endpoints
- `GET/POST /api/subjects`, `PATCH/DELETE /api/subjects/:id`
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/pomodoro-sessions`

## Running
- `npm run dev` starts both frontend and backend on port 5000
- `npm run db:push` pushes schema changes to database
