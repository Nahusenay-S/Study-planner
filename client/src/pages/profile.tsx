import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Flame,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task, PomodoroSession } from "@shared/schema";

function StatBadge({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 hover-elevate">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function HeatmapCalendar({ sessions }: { sessions: PomodoroSession[] }) {
  const today = new Date();
  const weeks = 20;
  const days: { date: string; count: number; day: number }[] = [];

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = sessions.filter((s) => s.completedAt.startsWith(dateStr)).length;
    days.push({ date: dateStr, count, day: d.getDay() });
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 5].map((c) => (
            <div key={c} className={`h-3 w-3 rounded-sm ${getIntensity(c)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weekColumns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className={`h-3 w-3 rounded-sm ${getIntensity(day.count)} transition-colors`}
                title={`${day.date}: ${day.count} sessions`}
                data-testid={`heatmap-day-${day.date}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: sessions = [], isLoading } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro-sessions"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { displayName?: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  if (!user || isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalMinutes = user.totalStudyMinutes || sessions.reduce((a, s) => a + s.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const initials = (user.displayName || user.username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const productivityScore = Math.min(100, Math.round(
    (completionRate * 0.3) +
    (Math.min(sessions.length, 50) * 0.8) +
    (user.streakCount * 2)
  ));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <Card>
        <CardContent className="p-6 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-lg">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                {user.displayName || user.username}
              </h1>
              <p className="text-muted-foreground">@{user.username}</p>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <Badge variant="secondary">
                  <Flame className="h-3 w-3 mr-1" />
                  {user.streakCount} day streak
                </Badge>
                <div className="flex items-center gap-2">
                  <div className="relative" style={{ width: 60, height: 60 }}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                      <circle
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="4"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 25}`}
                        strokeDashoffset={`${2 * Math.PI * 25 * (1 - productivityScore / 100)}`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold" data-testid="text-productivity-score">{productivityScore}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Productivity</span>
                    <span className="text-xs text-muted-foreground">Score</span>
                  </div>
                </div>
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recently"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-scale-in" style={{ animationDelay: "0.05s", opacity: 0 }}>
          <StatBadge icon={Flame} label="Day Streak" value={user.streakCount} color="#EF4444" />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: "0.1s", opacity: 0 }}>
          <StatBadge icon={Clock} label="Study Time" value={`${hours}h ${mins}m`} color="#3B82F6" />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
          <StatBadge icon={Target} label="Completion" value={`${completionRate}%`} color="#10B981" />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <StatBadge icon={Zap} label="Sessions" value={sessions.length} color="#8B5CF6" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapCalendar sessions={sessions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({ displayName });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  data-testid="input-profile-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled className="opacity-60" />
              </div>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Subject Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Add subjects to see performance breakdown.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const subTasks = tasks.filter((t) => t.subjectId === subject.id);
                const subCompleted = subTasks.filter((t) => t.status === "completed").length;
                const subSessions = sessions.filter((s) => s.subjectId === subject.id);
                const subMinutes = subSessions.reduce((a, s) => a + s.duration, 0);
                const pct = subTasks.length > 0 ? Math.round((subCompleted / subTasks.length) * 100) : 0;

                return (
                  <div
                    key={subject.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40"
                    data-testid={`profile-subject-${subject.id}`}
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subCompleted}/{subTasks.length} tasks | {subMinutes}m studied
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: subject.color }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
