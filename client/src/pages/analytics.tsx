import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Calendar,
  Zap,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Timer,
  Info,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Subject, Task, PomodoroSession } from "@shared/schema";
import { useState, useMemo, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border bg-background/95 backdrop-blur-md p-3 shadow-xl border-primary/10">
        <p className="text-xs font-black uppercase tracking-tighter mb-2 text-muted-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="text-sm font-black">{entry.value}</span>
            </div>
          ))}
        </div>
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

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const stats = useMemo(() => {
    if (loadingSubjects || loadingTasks || loadingSessions) return null;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalFocusMinutes = sessions.reduce((a, s) => a + s.duration, 0);
    const totalSessions = sessions.length;
    const avgSessionLength = totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0;

    // Focus by subject mapping
    const subjectFocusMap = subjects.reduce((acc, s) => {
      acc[s.id] = { name: s.name, minutes: 0, color: s.color };
      return acc;
    }, {} as any);

    sessions.forEach(s => {
      if (s.subjectId && subjectFocusMap[s.subjectId]) {
        subjectFocusMap[s.subjectId].minutes += s.duration;
      }
    });

    const focusBySubject = Object.values(subjectFocusMap).filter((d: any) => d.minutes > 0)
      .sort((a: any, b: any) => b.minutes - a.minutes);

    const mostFocused = (focusBySubject[0] as any)?.name || "None";
    const leastFocused = subjects.find(s => !subjectFocusMap[s.id] || subjectFocusMap[s.id].minutes === 0)?.name ||
      (focusBySubject[focusBySubject.length - 1] as any)?.name || "None";

    // Weekly Trends
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const dayStr = date.toLocaleDateString("en-US", { weekday: "short" });
      const daySessions = sessions.filter((s) => {
        const sDate = new Date(s.completedAt);
        return sDate.setHours(0, 0, 0, 0) === date.getTime();
      });
      return {
        day: dayStr,
        fullDate: date.toDateString(),
        minutes: daySessions.reduce((a, s) => a + s.duration, 0),
        sessions: daySessions.length,
      };
    });

    const mostProductiveDay = [...last7Days].sort((a, b) => b.minutes - a.minutes)[0];

    // Focus by Subject over time (Line Chart)
    const timelineBySubject = last7Days.map(d => {
      const entry: any = { day: d.day };
      subjects.forEach(s => {
        const sSessions = sessions.filter(se => {
          const seDate = new Date(se.completedAt);
          return seDate.toLocaleDateString("en-US", { weekday: "short" }) === d.day && se.subjectId === s.id;
        });
        entry[s.name] = sSessions.reduce((a, se) => a + se.duration, 0);
      });
      return entry;
    });

    return {
      completionRate,
      totalFocusMinutes,
      totalSessions,
      avgSessionLength,
      mostFocused,
      leastFocused,
      last7Days,
      mostProductiveDay,
      focusBySubject,
      timelineBySubject,
      completedTasks,
      totalTasks
    };
  }, [subjects, tasks, sessions, loadingSubjects, loadingTasks, loadingSessions]);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const res = await apiRequest("POST", "/api/analytics/insights", {
        mostFocusedSubject: stats?.mostFocused,
        leastFocusedSubject: stats?.leastFocused,
        completionRate: stats?.completionRate,
        totalFocusMinutes: stats?.totalFocusMinutes,
        sessionsThisWeek: stats?.last7Days.reduce((a, d) => a + d.sessions, 0)
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAiInsight(data.insight);
      setGenerating(false);
    }
  });

  useEffect(() => {
    if (stats && !aiInsight && !generating) {
      generateInsightsMutation.mutate();
    }
  }, [stats]);

  if (loadingSubjects || loadingTasks || loadingSessions || !stats) {
    return (
      <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-[2.5rem]" />
          <Skeleton className="h-[400px] rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto pb-20 overflow-hidden">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase py-0.5 px-2 bg-primary/5 border-primary/20">
              System Live
            </Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Cognitive Pulse</h1>
          <p className="text-muted-foreground font-medium text-lg">High-fidelity data analysis of your intellectual growth.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl border-2 font-black uppercase text-xs tracking-widest h-12 px-6 hover:bg-muted/50 transition-all border-border/40">
            Export JSON
          </Button>
          <Button className="rounded-2xl font-black uppercase text-xs tracking-widest h-12 px-6 shadow-xl shadow-primary/20 bg-primary group overflow-hidden relative">
            <span className="relative z-10 flex items-center gap-2">
              Refresh Data <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            </span>
          </Button>
        </div>
      </motion.div>

      {/* ── Top Metrics ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { icon: <Target className="h-6 w-6" />, label: "Completion Rate", value: `${stats.completionRate}%`, sub: `${stats.completedTasks}/${stats.totalTasks} Tasks`, color: "bg-blue-500/10 text-blue-500" },
          { icon: <Timer className="h-6 w-6" />, label: "Focus Minutes", value: stats.totalFocusMinutes, sub: `${Math.floor(stats.totalFocusMinutes / 60)}h ${stats.totalFocusMinutes % 60}m`, color: "bg-emerald-500/10 text-emerald-500" },
          { icon: <Flame className="h-6 w-6" />, label: "Sessions", value: stats.totalSessions, sub: "Total cycles completed", color: "bg-orange-500/10 text-orange-500" },
          { icon: <Zap className="h-6 w-6" />, label: "Avg Session", value: `${stats.avgSessionLength}m`, sub: "Sustained concentration", color: "bg-purple-500/10 text-purple-500" },
        ].map((m, i) => (
          <motion.div key={i} variants={item}>
            <Card className="rounded-[2rem] border-border/40 bg-card/60 backdrop-blur-sm hover-elevate transition-all overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                {m.icon}
              </div>
              <CardContent className="p-6">
                <div className={`p-2 w-fit rounded-xl mb-4 ${m.color}`}>
                  {m.icon}
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">{m.label}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black tracking-tight">{m.value}</p>
                </div>
                <p className="text-xs text-muted-foreground/60 font-bold mt-1 uppercase tracking-wider">{m.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main Focus Area Chart ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-[2.5rem] border-primary/10 bg-card/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
            <CardHeader className="p-8 border-b border-border/40">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-black flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" /> FOCUS PERFORMANCE
                  </CardTitle>
                  <CardDescription className="text-base font-bold text-muted-foreground/60">Weekly trajectory of concentrated study minutes.</CardDescription>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
                    <ArrowUpRight className="h-4 w-4" /> TRENDING UP
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={stats.last7Days}>
                  <defs>
                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted-foreground/10" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 900, fill: "hsl(var(--muted-foreground))" }}
                    dy={15}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    name="Minutes"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorFocus)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Insight Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="rounded-[2.5rem] border-yellow-500/20 bg-yellow-500/[0.03] overflow-hidden relative border-2">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="h-10 w-10 text-yellow-500 animate-pulse" />
            </div>
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-black tracking-widest uppercase flex items-center gap-2 text-yellow-600">
                <Sparkles className="h-5 w-5" /> AI INSIGHTS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="bg-card/90 backdrop-blur-md rounded-2xl p-5 border border-yellow-500/20 shadow-inner">
                {generating ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : aiInsight ? (
                  <div className="prose prose-sm dark:prose-invert font-bold leading-relaxed">
                    <ReactMarkdown>{aiInsight}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground opacity-50">Analyzing study patterns...</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-border/40 bg-card overflow-hidden">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Weekly Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-tighter">Most Productive</p>
                    <p className="font-black text-lg">{stats.mostProductiveDay.day}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">{stats.mostProductiveDay.minutes}m</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-tighter">Deepest focus</p>
                    <p className="font-black text-lg">{stats.mostFocused}</p>
                  </div>
                </div>
                <div className="bg-muted rounded-full w-20 h-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-indigo-500 w-full" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-tighter">Attention required</p>
                    <p className="font-black text-lg">{stats.leastFocused}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-red-500 border-red-500/20">LOW FOCUS</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Multi-Subject Focus Timeline ── */}
        <Card className="rounded-[2.5rem] border-border/40 overflow-hidden bg-card/40">
          <CardHeader className="p-8 border-b border-border/40">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" /> FOCUS BY SUBJECT
            </CardTitle>
            <CardDescription className="font-bold">Comparative time-series of study sessions.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.timelineBySubject}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted-foreground/10" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                {subjects.filter(s => stats.focusBySubject.some((f: any) => f.name === s.name)).map((s, i) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    strokeWidth={4}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 8, strokeWidth: 4 }}
                    animationDuration={1500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Task Distribution ── */}
        <Card className="rounded-[2.5rem] border-border/40 overflow-hidden bg-card/40">
          <CardHeader className="p-8 border-b border-border/40">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> TASK STATUS
            </CardTitle>
            <CardDescription className="font-bold">Real-time breakdown of objective completion.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-full">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Todo", value: tasks.filter(t => t.status === 'todo').length, color: "hsl(var(--muted-foreground)/0.4)" },
                      { name: "Progress", value: tasks.filter(t => t.status === 'in-progress').length, color: "#3B82F6" },
                      { name: "Done", value: tasks.filter(t => t.status === 'completed').length, color: "#10B981" },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      "hsl(var(--muted-foreground)/0.4)",
                      "#3B82F6",
                      "#10B981"
                    ].map((color, i) => <Cell key={i} fill={color} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="w-full md:w-64 space-y-4">
                {[
                  { label: "Pending Tasks", val: tasks.filter(t => t.status === 'todo').length, color: "bg-muted-foreground/20", text: "text-muted-foreground/60" },
                  { label: "Active Work", val: tasks.filter(t => t.status === 'in-progress').length, color: "bg-blue-500", text: "text-blue-500" },
                  { label: "Completed", val: tasks.filter(t => t.status === 'completed').length, color: "bg-emerald-500", text: "text-emerald-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-muted/40 border border-border/40">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${item.color}`} />
                      <span className="text-xs font-black uppercase tracking-tighter">{item.label}</span>
                    </div>
                    <span className={`text-lg font-black ${item.text}`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
