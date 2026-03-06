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
  Sparkles,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task, PomodoroSession, ActiveTimer } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

type TimerMode = "focus" | "short-break" | "long-break";

const TIMER_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
};

const TIMER_LABELS: Record<TimerMode, { label: string; icon: React.ElementType; color: string; sound: string }> = {
  focus: {
    label: "Focus",
    icon: Brain,
    color: "#3B82F6",
    sound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
  },
  "short-break": {
    label: "Short Break",
    icon: Coffee,
    color: "#10B981",
    sound: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
  },
  "long-break": {
    label: "Long Break",
    icon: Zap,
    color: "#8B5CF6",
    sound: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
  },
};

export default function PomodoroPage() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const lastLoggedTimeLeftRef = useRef<number>(TIMER_DURATIONS.focus);
  const { toast } = useToast();

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro-sessions"],
  });

  const { data: activeTimer, isLoading: activeTimerLoading } = useQuery<ActiveTimer>({
    queryKey: ["/api/active-timer"],
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { subjectId: number | null; taskId: number | null; duration: number; type: string; completedAt: string }) => {
      const res = await apiRequest("POST", "/api/pomodoro-sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); // Update streak/minutes
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async (data: { type: string; startTime: string; duration: number; subjectId?: number | null; taskId?: number | null }) => {
      await apiRequest("POST", "/api/active-timer", data);
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/active-timer");
    },
  });

  const commitPartialFocus = useCallback((currentSeconds: number) => {
    if (mode !== 'focus') return;

    const elapsedSeconds = lastLoggedTimeLeftRef.current - currentSeconds;
    const minutesToLog = Math.floor(elapsedSeconds / 60);

    if (minutesToLog >= 1) {
      const subId = selectedSubject && selectedSubject !== "none" ? parseInt(selectedSubject) : null;
      const tskId = selectedTask && selectedTask !== "none" ? parseInt(selectedTask) : null;

      saveMutation.mutate({
        subjectId: subId,
        taskId: tskId,
        type: "focus",
        duration: minutesToLog,
        completedAt: new Date().toISOString(),
      });

      lastLoggedTimeLeftRef.current -= (minutesToLog * 60);
    }
  }, [mode, selectedSubject, selectedTask, saveMutation]);

  // Sound Player
  const playSound = useCallback((modeType: TimerMode) => {
    if (audioRef.current) {
      audioRef.current.src = TIMER_LABELS[modeType].sound;
      audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
    }
  }, []);

  const playAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.loop = true;
      alarmRef.current.play().catch(e => console.log("Alarm failed:", e));
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  }, []);

  // Restore Session Logic
  useEffect(() => {
    if (!activeTimerLoading && isRestoring) {
      if (activeTimer) {
        const now = Date.now();
        const start = new Date(activeTimer.startTime).getTime();
        const elapsed = Math.floor((now - start) / 1000);

        if (elapsed < activeTimer.duration) {
          setMode(activeTimer.type as TimerMode);
          setTimeLeft(activeTimer.duration - elapsed);
          setIsRunning(true);
          lastLoggedTimeLeftRef.current = activeTimer.duration - elapsed;
          if (activeTimer.subjectId) setSelectedSubject(activeTimer.subjectId.toString());
          if (activeTimer.taskId) setSelectedTask(activeTimer.taskId.toString());
          toast({ title: "Session Resumed", description: `Continuing your ${activeTimer.type} session.` });
        } else {
          // Completed while away!
          const completedAt = new Date(start + activeTimer.duration * 1000).toISOString();
          saveMutation.mutate({
            subjectId: activeTimer.subjectId,
            taskId: activeTimer.taskId,
            type: activeTimer.type,
            duration: Math.floor(activeTimer.duration / 60),
            completedAt: completedAt,
          });
          stopTimerMutation.mutate();
          toast({ title: "Session Completed", description: `Your ${activeTimer.type} session finished while you were away.` });

          // Determine next mode
          if (activeTimer.type === 'focus') {
            const nextCount = sessionsCompleted + 1;
            setSessionsCompleted(nextCount);
            const nextMode = nextCount % 4 === 0 ? "long-break" : "short-break";
            setMode(nextMode);
            setTimeLeft(TIMER_DURATIONS[nextMode]);
          } else {
            setMode("focus");
            setTimeLeft(TIMER_DURATIONS.focus);
          }
        }
      }
      setIsRestoring(false);
    }
  }, [activeTimer, activeTimerLoading, isRestoring, saveMutation, stopTimerMutation, toast, sessionsCompleted]);

  const filteredTasks = selectedSubject && selectedSubject !== "none"
    ? tasks.filter((t) => t.subjectId === parseInt(selectedSubject) && t.status !== "completed")
    : tasks.filter((t) => t.status !== "completed");

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    commitPartialFocus(0); // Final commit of remaining minutes
    playAlarm();
    stopTimerMutation.mutate();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); // Immediate global sync

    if (mode === "focus") {
      const nextCount = sessionsCompleted + 1;
      setSessionsCompleted(nextCount);

      const subId = selectedSubject && selectedSubject !== "none" ? parseInt(selectedSubject) : null;
      const tskId = selectedTask && selectedTask !== "none" ? parseInt(selectedTask) : null;

      const nextMode = nextCount % 4 === 0 ? "long-break" : "short-break";
      setMode(nextMode);
      setTimeLeft(TIMER_DURATIONS[nextMode]);
      lastLoggedTimeLeftRef.current = TIMER_DURATIONS[nextMode];
      toast({
        title: "Focus Complete!",
        description: nextCount % 4 === 0 ? "Amazing! Take a long break." : "Great work! Take a short break.",
      });
    } else {
      setMode("focus");
      setTimeLeft(TIMER_DURATIONS.focus);
      lastLoggedTimeLeftRef.current = TIMER_DURATIONS.focus;
      toast({ title: "Break Over", description: "Ready to jump back in?" });
    }
  }, [mode, selectedSubject, selectedTask, saveMutation, stopTimerMutation, toast, sessionsCompleted, playAlarm, commitPartialFocus]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 6) { // 5 seconds remaining tick
            playSound('focus');
          }
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(intervalRef.current!);
            handleTimerEnd();
            return 0;
          }
          // Heartbeat Every Minute
          if ((lastLoggedTimeLeftRef.current - next) >= 60) {
            commitPartialFocus(next);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handleTimerEnd]);

  const switchMode = (newMode: TimerMode) => {
    if (isRunning) {
      commitPartialFocus(timeLeft);
      stopTimerMutation.mutate();
    }
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    lastLoggedTimeLeftRef.current = TIMER_DURATIONS[newMode];
    setIsRunning(false);
  };

  const toggleTimer = () => {
    if (!isRunning) {
      // Starting
      lastLoggedTimeLeftRef.current = timeLeft;
      const subId = selectedSubject && selectedSubject !== "none" ? parseInt(selectedSubject) : null;
      const tskId = selectedTask && selectedTask !== "none" ? parseInt(selectedTask) : null;
      startTimerMutation.mutate({
        type: mode,
        startTime: new Date().toISOString(),
        duration: timeLeft, // Record remaining duration
        subjectId: subId,
        taskId: tskId,
      });
    } else {
      // Pausing
      commitPartialFocus(timeLeft);
      stopTimerMutation.mutate();
    }
    stopAlarm(); // Stop alarm if user clicks start/pause during ringing
    setIsRunning((p) => !p);
  };

  const resetTimer = () => {
    if (isRunning) {
      commitPartialFocus(timeLeft);
    }
    setIsRunning(false);
    stopTimerMutation.mutate();
    stopAlarm();
    setTimeLeft(TIMER_DURATIONS[mode]);
    lastLoggedTimeLeftRef.current = TIMER_DURATIONS[mode];
  };

  const skipBreak = () => {
    if (mode !== 'focus') {
      stopAlarm();
      handleTimerEnd();
    }
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
  const todayMinutes = todaySessions.reduce((a, s) => a + (s.type === 'focus' ? s.duration : 0), 0);

  if (sessionsLoading || isRestoring) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-[2.5rem]" />
          <Skeleton className="h-[500px] rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <audio ref={audioRef} hidden />
      <audio ref={alarmRef} src="https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3" hidden />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase" data-testid="text-pomodoro-title">Flow State</h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Deep work orchestrated by the Pomodoro technique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-full font-bold">
            <Sparkles className="h-3 w-3 mr-2" /> AI Suggested: {subjects[0]?.name || "General Focus"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[3rem] border-border/40 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden relative border-2">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: modeConfig.color, opacity: 0.2 }} />

            <CardContent className="p-10">
              <div className="flex justify-center gap-3 mb-12">
                {(Object.keys(TIMER_LABELS) as TimerMode[]).map((m) => {
                  const cfg = TIMER_LABELS[m];
                  const active = mode === m;
                  return (
                    <Button
                      key={m}
                      variant="ghost"
                      size="sm"
                      onClick={() => switchMode(m)}
                      className={`rounded-full px-6 font-bold transition-all duration-500 ${active ? "bg-white dark:bg-zinc-800 shadow-lg scale-110" : "opacity-50 hover:opacity-100"}`}
                      style={active ? { color: cfg.color } : {}}
                      data-testid={`button-mode-${m}`}
                    >
                      <cfg.icon className="h-4 w-4 mr-2" />
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`relative w-72 h-72 mb-10 transition-transform duration-700 ${isRunning ? "scale-105" : "scale-100"}`}
                >
                  <svg className="w-full h-full -rotate-90 filter drop-shadow-2xl" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-muted/10"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke={modeConfig.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="290"
                      initial={{ strokeDashoffset: 290 }}
                      animate={{ strokeDashoffset: 290 * (1 - progress / 100) }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center"
                      >
                        <span
                          className="text-7xl font-black font-mono tracking-tighter tabular-nums"
                          data-testid="text-timer-display"
                        >
                          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                        </span>
                        <Badge variant="outline" className="mt-2 font-black border-2 px-3 py-1 uppercase tracking-widest text-[10px]" style={{ color: modeConfig.color, borderColor: `${modeConfig.color}40` }}>
                          {modeConfig.label}
                        </Badge>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={toggleTimer}
                    className="rounded-[2rem] h-16 px-10 text-lg font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
                    style={{
                      backgroundColor: modeConfig.color,
                      color: "white"
                    }}
                  >
                    {isRunning ? (
                      <><Pause className="h-6 w-6 mr-3 fill-current" /> Pause</>
                    ) : (
                      <><Play className="h-6 w-6 mr-3 fill-current" /> {timeLeft < TIMER_DURATIONS[mode] ? "Resume" : "Ignite"}</>
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={resetTimer}
                      className="rounded-full h-14 w-14 border-2 transition-all hover:bg-muted"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                    {mode !== 'focus' && (
                      <Button
                        variant="outline"
                        onClick={skipBreak}
                        className="rounded-full px-6 font-black uppercase text-xs tracking-widest border-2 h-14"
                      >
                        Skip Break
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-border/40 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Focus Context</h3>
                  <Info className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3">Subject</label>
                    <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTask(""); }}>
                      <SelectTrigger className="rounded-2xl border-2 bg-muted/20 h-12" data-testid="select-pomodoro-subject">
                        <SelectValue placeholder="General Focus" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="none">General Focus</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] border-border/40 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Active Task</h3>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3">Task Connection</label>
                    <Select value={selectedTask} onValueChange={setSelectedTask}>
                      <SelectTrigger className="rounded-2xl border-2 bg-muted/20 h-12" data-testid="select-pomodoro-task">
                        <SelectValue placeholder="Untethered Session" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="none">Untethered Session</SelectItem>
                        {filteredTasks.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-border/40 bg-card overflow-hidden shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
                <Timer className="h-5 w-5 text-primary" />
                Cognitive Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-[1.5rem] bg-blue-500/5 border border-blue-500/10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Sessions</p>
                  <p className="text-3xl font-black" data-testid="text-today-sessions">{todaySessions.length}</p>
                </div>
                <div className="p-4 rounded-[1.5rem] bg-green-500/5 border border-green-500/10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Minutes</p>
                  <p className="text-3xl font-black" data-testid="text-today-minutes">{todayMinutes}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-zinc-900 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transition-opacity group-hover:opacity-40">
                  <Zap className="h-12 w-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Session Streak</p>
                <p className="text-5xl font-black tracking-tighter" data-testid="text-session-streak">{sessionsCompleted}</p>
                <div className="mt-4 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < (sessionsCompleted % 4 || (sessionsCompleted > 0 && sessionsCompleted % 4 === 0 ? 4 : 0)) ? "bg-primary" : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-2">
                  {4 - (sessionsCompleted % 4 || 4)} sessions until long break
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-border/40 bg-card overflow-hidden shadow-xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Brain className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">The journey of a thousand focus sessions begins with one ignite.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {sessions
                    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                    .slice(0, 6)
                    .map((session) => {
                      const subject = subjects.find((s) => s.id === session.subjectId);
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors"
                          data-testid={`session-${session.id}`}
                        >
                          <div
                            className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{ backgroundColor: `${subject?.color || '#94a3b8'}20`, color: subject?.color || '#94a3b8' }}
                          >
                            {session.type === 'focus' ? <Brain className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{subject?.name || "General Study"}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{session.type || 'focus'}</p>
                          </div>
                          <Badge variant="secondary" className="font-black rounded-lg">{session.duration}m</Badge>
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
