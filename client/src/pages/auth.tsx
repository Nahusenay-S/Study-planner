import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  BookOpen,
  Timer,
  BarChart3,
  CheckSquare,
  Kanban,
  Flame,
  Sparkles,
  Zap,
  Trophy,
} from "lucide-react";

const features = [
  { icon: BookOpen, label: "Subjects", gradient: "from-blue-500 to-cyan-400" },
  { icon: CheckSquare, label: "Tasks", gradient: "from-violet-500 to-purple-400" },
  { icon: Timer, label: "Pomodoro", gradient: "from-rose-500 to-pink-400" },
  { icon: Kanban, label: "Kanban", gradient: "from-amber-500 to-orange-400" },
  { icon: BarChart3, label: "Analytics", gradient: "from-emerald-500 to-green-400" },
  { icon: Flame, label: "Streaks", gradient: "from-red-500 to-rose-400" },
];

const stats = [
  { value: "10K+", label: "Students" },
  { value: "2M+", label: "Tasks Done" },
  { value: "500K+", label: "Focus Hours" },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      login.mutate(
        { email, password },
        {
          onError: (err: Error) => {
            toast({ title: "Login failed", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      register.mutate(
        { email, password, username, displayName: displayName || username },
        {
          onError: (err: Error) => {
            toast({ title: "Registration failed", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L2c+PC9zdmc+')] opacity-60" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute top-10 left-10 w-3 h-3 rounded-full bg-blue-400/60 animate-orbit" />
          <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-purple-400/60 animate-orbit-reverse" />
          <div className="absolute top-10 left-10 w-2.5 h-2.5 rounded-full bg-cyan-400/40 animate-orbit" style={{ animationDuration: "30s" }} />
        </div>

        <div className="absolute top-16 right-16 animate-float opacity-20">
          <Trophy className="h-8 w-8 text-yellow-300" />
        </div>
        <div className="absolute bottom-24 left-16 animate-float-delayed opacity-20">
          <Zap className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="absolute top-1/3 right-24 animate-float opacity-15" style={{ animationDelay: "1s" }}>
          <Sparkles className="h-7 w-7 text-purple-300" />
        </div>

        <div className="relative z-10 text-white max-w-md animate-fade-in">
          <div className="flex items-center gap-3.5 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">StudyFlow</h1>
              <p className="text-xs text-blue-300/70 font-medium tracking-widest uppercase mt-0.5">Plan. Focus. Achieve.</p>
            </div>
          </div>

          <h2 className="text-[2.5rem] font-extrabold mb-5 leading-[1.15] tracking-tight">
            Study smarter,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent animate-shimmer">
              not harder.
            </span>
          </h2>
          <p className="text-base text-blue-200/60 mb-10 leading-relaxed max-w-sm">
            The all-in-one productivity platform that turns your study chaos into organized, focused learning sessions.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-10">
            {features.map((item, i) => (
              <div
                key={item.label}
                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 animate-fade-in opacity-0 cursor-default"
                style={{ animationDelay: `${0.2 + i * 0.06}s` }}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-[11px] font-medium text-blue-100/80">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 pt-8 border-t border-white/[0.06]">
            {stats.map((stat, i) => (
              <div key={stat.label} className="animate-fade-in opacity-0" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-blue-300/50 uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        <div className="lg:hidden relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_60%)]" />
          <div className="relative z-10 px-6 pt-12 pb-10 text-white text-center">
            <div className="flex items-center gap-2.5 justify-center mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight">StudyFlow</h1>
                <p className="text-[10px] text-blue-300/60 uppercase tracking-widest font-medium">Plan. Focus. Achieve.</p>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold mb-2">
              Study smarter,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                not harder.
              </span>
            </h2>
            <p className="text-sm text-blue-200/50 max-w-xs mx-auto">
              Your all-in-one productivity platform for focused learning.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-6 py-8 lg:py-0">
          <div className="w-full max-w-sm animate-fade-in">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold" data-testid="text-auth-title">
                    {isLogin ? "Welcome back" : "Get started"}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {isLogin
                      ? "Enter your credentials to continue."
                      : "Create your free account to begin."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isLogin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="johndoe"
                          required
                          minLength={3}
                          className="h-10"
                          data-testid="input-username"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="displayName" className="text-xs font-medium">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="John Doe"
                          className="h-10"
                          data-testid="input-display-name"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-10"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
                      required
                      minLength={6}
                      className="h-10"
                      data-testid="input-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all duration-200"
                    disabled={isPending}
                    data-testid="button-auth-submit"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    {isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>

                <div className="mt-5 pt-5 border-t text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-auth"
                  >
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span className="font-semibold text-primary">
                      {isLogin ? "Sign up" : "Sign in"}
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="lg:hidden mt-6">
              <div className="grid grid-cols-6 gap-2">
                {features.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 py-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-sm`}>
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
