# 🌟 StudyFlow – The Ultimate AI-Powered Study Platform

**Plan smarter. Study better. Connect deeper.**

StudyFlow is a premium, full-stack productivity ecosystem designed for high-performance students. It transcends traditional planners by combining **Deep Focus (Pomodoro)**, **Real-Time Collaboration**, and **Predictive AI Insights** into a single, high-fidelity experience.

---

## 🏗️ Premium Architecture

The platform leverages a cutting-edge stack optimized for low-latency interactions and state-of-the-art UI/UX.

```mermaid
graph TD
    A["Frontend: React + Tailwind + Framer Motion"] --> B["Backend: Node.js + Express"]
    B --> C["Cognitive Layer: Google Gemini AI"]
    B --> D["Persistence: PostgreSQL + Drizzle ORM"]
    B --> E["Real-Time: WebSockets (Socket.io-style)"]
    B --> F["Auth: Secure Session + bcrypt"]
    B --> G["Storage: Local/Cloud Multi-part Uploads"]
```

---

## � Elite Features

### 1️⃣ Flow State (Pomodoro) Engine
*   **Persistent Heartbeat**: Timers persist across page refreshes and browser sessions.
*   **Real-time Cognitive Credit**: Study minutes log every 60 seconds into your "Cognitive Pulse" dashboard.
*   **Automatic Cycles**: Seamlessly transitions between Focus (25m), Short Breaks (5m), and Long Breaks (15m) after 4 sessions.
*   **Multi-Tethering**: Link focus sessions directly to specific subjects or Kanban tasks.
*   **Auditory Immersion**: Distinctive start/end notifications and countdown "ticks" for deep focus.

### 2️⃣ Cognitive Pulse (Advanced Analytics)
*   **AI Insight Card**: Personalized study recommendations powered by Gemini based on your weekly trends.
*   **Deep-Focus Heatmaps**: Visualize your productivity peaks across days and subjects.
*   **Subject Mastery Charts**: Comparative line charts and donut distributions for task completion.
*   **Productivity Trajectory**: Track your "Readiness Score" to predict exam preparedness.

### 3️⃣ Collaborative Ecosystem
*   **Study Groups**: Create private rooms with dedicated group-only resources and tasks.
*   **Threaded Discussions**: Real-time chat with support for file attachments, emojis, and nested replies.
*   **Group Kanban**: Synchronized task boards where team members can collaborate on complex projects.
*   **Admin/Super Admin Hierarchy**: Secure role-based management for platform moderation and system-wide analytics.

### 4️⃣ AI Intelligence (The StudyBuddy)
*   **Context-Aware Tutor**: 24/7 assistant that knows your schedule, tasks, and subjects.
*   **Smart Breakdown**: Automatically decompose large tasks into actionable subtasks with a single click.
*   **Intelligent Summarization**: Extract key takeaways and auto-generate flashcards/quizzes from uploaded PDFs.

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- Google Gemini API Key
- PostgreSQL (Local or Neon.tech)

### Installation

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Nahusenay-S/Study-planner.git
   cd Study-planner
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file:
   ```env
   DATABASE_URL=postgresql://user:pass@host/db
   SESSION_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_key
   ADMIN_SETUP_KEY=your_admin_secret
   ```

3. **Database Setup**:
   ```bash
   npm run db:push
   ```

4. **Launch Application**:
   ```bash
   npm run dev
   ```

### 👑 Initial Admin Setup
To elevate your first user to **Super Admin** status:
Navigate to: `http://localhost:5000/api/auth/make-me-super-admin?key=YOUR_ADMIN_SETUP_KEY`

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide.
- **Backend**: Node.js, Express, Drizzle ORM, WebSockets, Multer.
- **AI**: Google Gemini 1.5 Flash SDK.
- **Deployment**: Configured for Vercel/Node.js production runtimes.

---

*Built with ❤️ for the next generation of lifelong learners.*
