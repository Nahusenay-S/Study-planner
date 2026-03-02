import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Zap,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task, PomodoroSession } from "@shared/schema";

type TimerMode = "focus" | "short-break" | "long-break";

const TIMER_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
};

const TIMER_LABELS: Record<TimerMode, { label: string; icon: React.ElementType; color: string }> = {
  focus: { label: "Focus", icon: Brain, color: "#3B82F6" },
  "short-break": { label: "Short Break", icon: Coffee, color: "#10B981" },
  "long-break": { label: "Long Break", icon: Zap, color: "#8B5CF6" },
};

export default function PomodoroPage() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: sessions = [], isLoading } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro-sessions"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { subjectId: number | null; taskId: number | null; duration: number; completedAt: string }) => {
      const res = await apiRequest("POST", "/api/pomodoro-sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro-sessions"] });
    },
  });

  const filteredTasks = selectedSubject && selectedSubject !== "none"
    ? tasks.filter((t) => t.subjectId === parseInt(selectedSubject) && t.status !== "completed")
    : tasks.filter((t) => t.status !== "completed");

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (mode === "focus") {
      setSessionsCompleted((p) => p + 1);
      const subId = selectedSubject && selectedSubject !== "none" ? parseInt(selectedSubject) : null;
      const tskId = selectedTask && selectedTask !== "none" ? parseInt(selectedTask) : null;
      saveMutation.mutate({
        subjectId: subId,
        taskId: tskId,
        duration: 25,
        completedAt: new Date().toISOString(),
      });
      toast({ title: "Focus session complete!", description: "Time for a break." });
    } else {
      toast({ title: "Break is over!", description: "Ready to focus again?" });
    }
  }, [mode, selectedSubject, selectedTask, saveMutation, toast]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handleTimerEnd]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning((p) => !p);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;
  const modeConfig = TIMER_LABELS[mode];
  const ModeIcon = modeConfig.icon;

  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.completedAt);
    const today = new Date();
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  });
  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-pomodoro-title">Pomodoro Timer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stay focused with timed study sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-8">
              <div className="flex justify-center gap-2 mb-8">
                {(Object.keys(TIMER_LABELS) as TimerMode[]).map((m) => {
                  const cfg = TIMER_LABELS[m];
                  return (
                    <Button
                      key={m}
                      variant={mode === m ? "default" : "secondary"}
                      size="sm"
                      onClick={() => switchMode(m)}
                      data-testid={`button-mode-${m}`}
                    >
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`relative w-64 h-64 mb-8 animate-scale-in rounded-full ${isRunning ? "animate-pulse-glow" : ""}`}
                  style={isRunning ? { "--glow-color": `${modeConfig.color}40` } as React.CSSProperties : undefined}
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="4"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={modeConfig.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ModeIcon className="h-6 w-6 mb-2" style={{ color: modeConfig.color }} />
                    <span
                      className="text-5xl font-mono font-bold tabular-nums"
                      data-testid="text-timer-display"
                    >
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">{modeConfig.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={toggleTimer}
                    data-testid="button-toggle-timer"
                    aria-label={isRunning ? "Pause timer" : "Start timer"}
                    style={{
                      backgroundColor: modeConfig.color,
                      borderColor: modeConfig.color,
                    }}
                    className="text-white min-w-[140px]"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" /> {timeLeft < TIMER_DURATIONS[mode] ? "Resume" : "Start"}
                      </>
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={resetTimer}
                    data-testid="button-reset-timer"
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject (optional)</label>
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTask(""); }}>
                <SelectTrigger data-testid="select-pomodoro-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Task (optional)</label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger data-testid="select-pomodoro-task">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                Today's Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 rounded-md bg-muted/40">
                <p className="text-3xl font-bold" data-testid="text-today-sessions">
                  {todaySessions.length}
                </p>
                <p className="text-sm text-muted-foreground">Sessions</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/40">
                <p className="text-3xl font-bold" data-testid="text-today-minutes">
                  {todayMinutes}
                </p>
                <p className="text-sm text-muted-foreground">Minutes focused</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/40">
                <p className="text-3xl font-bold" data-testid="text-session-streak">
                  {sessionsCompleted}
                </p>
                <p className="text-sm text-muted-foreground">Current streak</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sessions yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                    .slice(0, 5)
                    .map((session) => {
                      const subject = subjects.find((s) => s.id === session.subjectId);
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-2 text-sm rounded-md p-2 bg-muted/40"
                          data-testid={`session-${session.id}`}
                        >
                          {subject && (
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color }}
                            />
                          )}
                          <span className="truncate flex-1">
                            {subject?.name || "General"}
                          </span>
                          <Badge variant="outline">{session.duration}m</Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
