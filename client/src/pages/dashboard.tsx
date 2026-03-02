import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Timer,
  TrendingUp,
  ListTodo,
  Target,
  Flame,
  Trophy,
  Zap,
  Sparkles,
  Brain,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Subject, Task, PomodoroSession } from "@shared/schema";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${color}15, ${color}30)`,
              color,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniHeatmap({ sessions }: { sessions: PomodoroSession[] }) {
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 13 * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = sessions.filter((s) => s.completedAt.startsWith(dateStr)).length;
    days.push({ date: dateStr, count });
  }

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/50";
    if (count === 1) return "bg-green-500/30";
    if (count === 2) return "bg-green-500/50";
    if (count <= 4) return "bg-green-500/70";
    return "bg-green-500";
  };

  const weekColumns: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weekColumns.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex gap-[2px] overflow-x-auto pb-1">
      {weekColumns.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[2px]">
          {week.map((day) => (
            <div
              key={day.date}
              className={`h-2.5 w-2.5 rounded-sm ${getIntensity(day.count)}`}
              title={`${day.date}: ${day.count} sessions`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function UpcomingDeadlines({ tasks, subjects }: { tasks: Task[]; subjects: Subject[] }) {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const upcoming = tasks
    .filter((t) => t.deadline && t.status !== "completed")
    .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.map((task) => {
        const subject = task.subjectId ? subjectMap.get(task.subjectId) : null;
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysLeft = deadline
          ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const isUrgent = daysLeft !== null && daysLeft <= 2 && !isOverdue;

        return (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-md p-3 bg-muted/40"
            data-testid={`deadline-task-${task.id}`}
          >
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: subject?.color || "#888" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {subject?.name || "Unknown"}
              </p>
            </div>
            <Badge
              variant={isOverdue ? "destructive" : isUrgent ? "secondary" : "outline"}
              className="shrink-0"
            >
              {isOverdue
                ? "Overdue"
                : daysLeft === 0
                  ? "Today"
                  : daysLeft === 1
                    ? "Tomorrow"
                    : `${daysLeft}d left`}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function SubjectProgress({ subjects, tasks }: { subjects: Subject[]; tasks: Task[] }) {
  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
        const completed = subjectTasks.filter((t) => t.status === "completed").length;
        const total = subjectTasks.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div key={subject.id} className="space-y-2" data-testid={`progress-subject-${subject.id}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="text-sm font-medium truncate">{subject.name}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {completed}/{total}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: subject.color }}
              />
            </div>
          </div>
        );
      })}
      {subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">No subjects yet</p>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ tasks, subjects }: { tasks: Task[]; subjects: Subject[] }) {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const recentCompleted = tasks
    .filter((t) => t.status === "completed" && t.completedAt)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, 4);
  const inProgress = tasks.filter((t) => t.status === "in-progress").slice(0, 4);
  const combined = [
    ...inProgress.map((t) => ({ ...t, type: "in-progress" as const })),
    ...recentCompleted.map((t) => ({ ...t, type: "completed" as const })),
  ].slice(0, 5);

  if (combined.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ListTodo className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {combined.map((task) => {
        const subject = task.subjectId ? subjectMap.get(task.subjectId) : null;
        return (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-md p-3 bg-muted/40"
            data-testid={`activity-task-${task.id}`}
          >
            {task.type === "completed" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 shrink-0 text-blue-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {subject?.name || "Unknown"}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {task.type === "completed" ? "Done" : "In Progress"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro-sessions"],
  });
  const { data: readinessData, isLoading: loadingReadiness } = useQuery<{ readinessScore: number }>({
    queryKey: ["/api/users/me/readiness"],
  });
  const { data: insights } = useQuery<{
    mostProductiveHour: number | null;
    weakestSubject: string | null;
    recommendation: string;
  }>({
    queryKey: ["/api/analytics/insights"],
  });

  const isLoading = loadingSubjects || loadingTasks || loadingSessions || loadingReadiness;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.deadline || t.status === "completed") return false;
    return new Date(t.deadline) < new Date();
  }).length;
  const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const riskTasks = tasks.filter(t => t.riskLevel === 'high' && t.status !== 'completed');

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto animate-fade-in text-slate-900 border-none">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate tracking-tight" data-testid="text-dashboard-title">
            {greeting()}, {user?.displayName || user?.username || "Student"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user && user.streakCount > 0
              ? <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500/20" /> <b>{user.streakCount} day streak</b> — keep the momentum going!</span>
              : "Track your study progress and stay on top of deadlines."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {user && user.streakCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {user.streakCount} day streak
            </Badge>
          )}
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-full" onClick={() => window.location.href = '/tasks'}>
            <Sparkles className="h-4 w-4" />
            AI Smart Reorder
          </Button>
        </div>
      </div>

      {insights && (
        <Card className="border-none shadow-none bg-primary/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Sparkles className="h-24 w-24 text-primary" />
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6 relative">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Brain className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2 flex-1 text-center md:text-left">
                <h3 className="text-lg font-bold text-primary flex items-center justify-center md:justify-start gap-2">
                  AI Study Insight
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-bold">ALPHA</Badge>
                </h3>
                <p className="text-sm leading-relaxed text-slate-800 font-medium italic">
                  "{insights.recommendation}"
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  {insights.mostProductiveHour !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-primary/70" />
                      Peak Logic: <b>{insights.mostProductiveHour % 12 || 12}{insights.mostProductiveHour >= 12 ? 'PM' : 'AM'}</b>
                    </div>
                  )}
                  {insights.weakestSubject && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Target className="h-3.5 w-3.5 text-orange-500/70" />
                      Weak Zone: <b>{insights.weakestSubject}</b>
                    </div>
                  )}
                  {riskTasks.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <b>{riskTasks.length} HIGH RISK</b> Tasks Detected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          subtitle={`${completedTasks} completed`}
          icon={ListTodo}
          color="#3B82F6"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${totalTasks - completedTasks} remaining`}
          icon={Target}
          color="#10B981"
        />
        <StatCard
          title="Focus Time"
          value={`${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m`}
          subtitle={`${sessions.length} sessions`}
          icon={Timer}
          color="#8B5CF6"
        />
        <StatCard
          title="Readiness"
          value={`${readinessData?.readinessScore || 0}%`}
          subtitle="Based on AI analysis"
          icon={Brain}
          color="#EC4899"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Subject Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectProgress subjects={subjects} tasks={tasks} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingDeadlines tasks={tasks} subjects={subjects} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity tasks={tasks} subjects={subjects} />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            Study Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MiniHeatmap sessions={sessions} />
        </CardContent>
      </Card>
    </div>
  );
}
