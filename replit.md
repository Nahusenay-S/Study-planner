# StudyFlow - SaaS Study Planner Platform

## Overview
A professional SaaS-level student study planner with authentication, subjects, tasks, Kanban board, Pomodoro timer, analytics, profile page with heatmap calendar, dark mode, streaks, and productivity scoring. Modernized with smooth animations, shared constants, accessibility improvements, and polished UI.

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
    app-sidebar.tsx      - Sidebar with nav + user info + logout + active indicator
    theme-provider.tsx   - Dark/light mode context
    theme-toggle.tsx     - Theme toggle button
  hooks/
    use-auth.ts          - Authentication hook (login/register/logout)
  lib/
    constants.ts         - Shared constants (PRIORITIES, STATUSES, SUBJECT_COLORS, SUBJECT_ICONS)
    queryClient.ts       - TanStack Query client config
  pages/
    auth.tsx             - Login/Register page with gradient hero section
    dashboard.tsx        - Overview with staggered stats, deadlines, heatmap, progress
    subjects.tsx         - CRUD with colors, icons, difficulty dots, scale-in animations
    tasks.tsx            - CRUD with filtering/tabs, hover effects, pencil edit icon
    kanban.tsx           - Drag & drop board with order persistence
    pomodoro.tsx         - Timer with pulsing glow effect, circular progress
    analytics.tsx        - Charts with stagger animations
    profile.tsx          - Profile with gradient shimmer, circular productivity score ring, heatmap
  App.tsx                - Root layout with auth gating
shared/
  schema.ts              - Drizzle schema + Zod validation schemas
server/
  routes.ts              - Auth + REST API with ownership validation + Zod update schemas
  storage.ts             - Database storage with userId ownership checks
```

## Database Tables
- `users` - Auth + profile (username, email, password, displayName, avatar, streakCount, totalStudyMinutes, productivityScore)
- `subjects` - Study subjects (userId, name, color, icon, difficultyLevel)
- `tasks` - Tasks (userId, title, description, subjectId, priority, status, deadline, estimatedMinutes, kanbanOrder)
- `pomodoro_sessions` - Focus sessions (userId, subjectId, taskId, duration, completedAt)

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile (displayName only)
- `POST /api/auth/avatar` - Upload avatar (multipart, max 2MB, JPEG/PNG/GIF/WebP)
- `DELETE /api/auth/avatar` - Remove avatar (safe path-constrained delete)
- `GET/POST /api/subjects`, `PATCH/DELETE /api/subjects/:id` (ownership enforced)
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id` (ownership enforced)
- `GET/POST /api/pomodoro-sessions`

## Dependencies
- multer - Multipart file upload handling for avatar uploads

## Security
- All CRUD endpoints enforce userId ownership (IDOR protection)
- PATCH endpoints use Zod update schemas to whitelist mutable fields
- Task creation validates subjectId belongs to current user
- Session cookies: httpOnly, secure in production, sameSite: lax
- Avatar upload: MIME type validation, 2MB limit, safe path-constrained file deletion
- Avatar field removed from updateProfileSchema (only settable via dedicated upload endpoint)

## Modernization Features
- Shared constants (`client/src/lib/constants.ts`) for priorities, statuses, colors, icons
- CSS entrance animations: fadeIn, slideIn, scaleIn with stagger delays
- Pulsing glow on Pomodoro timer when running
- Kanban order persistence via kanbanOrder field
- Accessibility: aria-labels on all icon-only buttons
- Gradient accents on dashboard heatmap card, profile header
- Active nav indicator (blue accent bar) in sidebar
- Circular SVG productivity score ring on profile page
- Difficulty level dots on subject cards
- Avatar upload with camera overlay on profile, avatar display in sidebar
