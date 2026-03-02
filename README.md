# 🌟 StudyFlow – AI-Powered Collaborative Study Platform

**Plan smarter. Study better. Collaborate effortlessly.**

StudyFlow is a modern, full-stack productivity suite designed for students and life-long learners. It combines high-performance task management, deep analytics, and real-time collaboration with a cutting-edge **Gemini AI layer** that optimizes your learning journey.

---

## 🏗️ Architecture Overview

The platform is built on a robust, scalable architecture focusing on low latency and premium user experience.

```mermaid
graph TD
    A["Frontend: React + Tailwind + Vite"] --> B["Backend API: Node.js + Express"]
    B --> C["ORM: Drizzle ORM"]
    C --> D["Database: PostgreSQL / Neon"]
    B --> E["Auth: Session + bcrypt"]
    B --> F["Intelligence: Google Gemini AI"]
    B --> G["Communication: Real-time Pub/Sub"]
```

---

## 🚀 Core Features (Fully Implemented)

### 1️⃣ Personal Productivity (Phase 1)
- **🔐 Advanced Authentication**: Secure registration and login using `express-session` with password hashing (`bcrypt`).
- **👤 Interactive Dashboard**: Real-time productivity stats, study streaks, and activity heatmaps.
- **📚 Subject Organizer**: Color-coded categorization with difficulty tracking and focus timers.
- **✅ Sprint Board**: Drag-and-drop **Kanban Board** with priority-based task filtering.
- **⏳ Pomodoro Focus**: Integrated timer that logs "Deep Work" minutes directly to your performance profile.

### 2️⃣ Collaboration Engine (Phase 2)
- **👥 Study Groups**: Create private groups to sync tasks and progress with teammates.
- **📂 Resource Library**: Shared cloud-ready repository for PDFs, links, and study notes.
- **💬 Feedback System**: Contextual commenting on shared resources with unread notification badges.
- **🔔 Notification Center**: Real-time alerts for deadlines, group invites, and member activity.

### 3️⃣ AI Excellence (Phase 3)
- **🤖 StudyBuddy AI Tutor**: A global, context-aware AI assistant that knows your tasks and subjects to provide 24/7 academic support.
- **📅 Smart Reorder**: AI-driven task prioritization that automatically optimizes your Kanban board based on deadlines and workload.
- **📝 Intelligent Summaries**: Instant extraction of key takeaways and automated flashcards from your study resources.
- **🧠 Readiness Score**: A predictive analytics engine using Gemini to calculate your exam preparedness based on study habits.

---

## 🛠 Tech Stack

### Frontend & UI/UX
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
- **State**: [TanStack Query v5](https://tanstack.com/query/latest)

### Backend & AI
- **Runtime**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- **Intelligence**: [Google Gemini AI SDK](https://ai.google.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon.tech](https://neon.tech/))
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- Google Gemini API Key ([Get it here](https://aistudio.google.com/))
- PostgreSQL instance (Local or Neon)

### Installation

1. **Clone & Install**:
   ```bash
   git clone https://github.com/your-username/Study-planner.git
   cd Study-planner
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file:
   ```env
   DATABASE_URL=postgresql://user:pass@host/db
   SESSION_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_key
   ```

3. **Database Migration**:
   ```bash
   npm run db:push
   # Apply Phase 3 Schema
   npx tsx migrate_phase3.js
   ```

4. **Launch Application**:
   ```bash
   npm run dev
   ```

---

## 🎯 Implementation Roadmap

1. [x] **Phase 1**: Core Engine (Auth, Tasks, Pomodoro, Dashboard).
2. [x] **Phase 2**: Collaboration (Groups, Notifications, Resource Sharing).
3. [x] **Phase 3**: AI Intelligence (AI Tutor, Smart Planner, Summarization).

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ for the future of learning.*
