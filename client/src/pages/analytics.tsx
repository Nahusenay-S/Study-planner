import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { Subject, Task, PomodoroSession } from "@shared/schema";

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-popover p-3 shadow-md">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro-sessions"],
  });

  const isLoading = loadingSubjects || loadingTasks || loadingSessions;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const totalFocusMinutes = sessions.reduce((a, s) => a + s.duration, 0);
  const avgSessionLength = sessions.length > 0 ? Math.round(totalFocusMinutes / sessions.length) : 0;

  const tasksBySubject = subjects.map((s) => {
    const subTasks = tasks.filter((t) => t.subjectId === s.id);
    const completed = subTasks.filter((t) => t.status === "completed").length;
    return {
      name: s.name.length > 12 ? s.name.slice(0, 12) + "..." : s.name,
      fullName: s.name,
      total: subTasks.length,
      completed,
      remaining: subTasks.length - completed,
      color: s.color,
    };
  });

  const taskStatusData = [
    { name: "To Do", value: todoTasks, color: "hsl(var(--muted-foreground))" },
    { name: "In Progress", value: inProgressTasks, color: "#3B82F6" },
    { name: "Completed", value: completedTasks, color: "#10B981" },
  ].filter((d) => d.value > 0);

  const priorityData = [
    { name: "High", value: tasks.filter((t) => t.priority === "high").length, color: "#EF4444" },
    { name: "Medium", value: tasks.filter((t) => t.priority === "medium").length, color: "#F59E0B" },
    { name: "Low", value: tasks.filter((t) => t.priority === "low").length, color: "#10B981" },
  ].filter((d) => d.value > 0);

  const focusBySubject = subjects.map((s) => {
    const subSessions = sessions.filter((se) => se.subjectId === s.id);
    return {
      name: s.name.length > 12 ? s.name.slice(0, 12) + "..." : s.name,
      minutes: subSessions.reduce((a, se) => a + se.duration, 0),
      sessions: subSessions.length,
      color: s.color,
    };
  }).filter((d) => d.minutes > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const dayStr = date.toLocaleDateString("en-US", { weekday: "short" });
    const daySessions = sessions.filter((s) => {
      const sDate = new Date(s.completedAt);
      return (
        sDate.getDate() === date.getDate() &&
        sDate.getMonth() === date.getMonth() &&
        sDate.getFullYear() === date.getFullYear()
      );
    });
    return {
      day: dayStr,
      minutes: daySessions.reduce((a, s) => a + s.duration, 0),
      sessions: daySessions.length,
    };
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Insights into your study habits and progress.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate animate-fade-in stagger-1">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold" data-testid="stat-completion-rate">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate animate-fade-in stagger-2">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold" data-testid="stat-total-focus">
              {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </p>
            <p className="text-xs text-muted-foreground">Total Focus</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate animate-fade-in stagger-3">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold" data-testid="stat-total-sessions">
              {sessions.length}
            </p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate animate-fade-in stagger-4">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold" data-testid="stat-avg-session">
              {avgSessionLength}m
            </p>
            <p className="text-xs text-muted-foreground">Avg Session</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-scale-in" style={{ animationDelay: "0.1s", opacity: 0 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Focus Time (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {last7Days.some((d) => d.minutes > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    name="Minutes"
                    stroke="#3B82F6"
                    fill="url(#focusGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No focus sessions this week</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Tasks by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksBySubject.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tasksBySubject}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completed" name="Completed" stackId="a" radius={[0, 0, 0, 0]}>
                    {tasksBySubject.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.8} />
                    ))}
                  </Bar>
                  <Bar dataKey="remaining" name="Remaining" stackId="a" radius={[4, 4, 0, 0]}>
                    {tasksBySubject.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No subjects or tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Task Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {taskStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: "0.25s", opacity: 0 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Focus by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            {focusBySubject.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={focusBySubject}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="minutes"
                    >
                      {focusBySubject.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {focusBySubject.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No focus sessions recorded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
