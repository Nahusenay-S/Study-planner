import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowRight, Loader2, BookOpen, Timer, BarChart3, CheckSquare, Kanban, Flame } from "lucide-react";

const features = [
  { icon: BookOpen, label: "Smart Subjects", desc: "Organize your learning by subject" },
  { icon: CheckSquare, label: "Task Management", desc: "Priority-based task tracking" },
  { icon: Timer, label: "Pomodoro Timer", desc: "Deep focus study sessions" },
  { icon: Kanban, label: "Kanban Board", desc: "Visual workflow management" },
  { icon: BarChart3, label: "Analytics", desc: "Track your study progress" },
  { icon: Flame, label: "Streaks", desc: "Build daily study habits" },
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="relative z-10 text-white max-w-lg animate-fade-in">
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">StudyFlow</h1>
              <p className="text-sm text-white/60">Plan. Focus. Achieve.</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Your study sessions,<br />supercharged.
          </h2>
          <p className="text-lg text-white/70 mb-10 leading-relaxed">
            Plan smarter, focus deeper, achieve more. The all-in-one study platform
            built for serious learners.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map((item, i) => (
              <div
                key={item.label}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 animate-fade-in opacity-0"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="lg:hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-6 pt-10 pb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
          <div className="relative z-10 text-white text-center animate-fade-in">
            <div className="flex items-center gap-2.5 justify-center mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">StudyFlow</h1>
            </div>
            <p className="text-white/70 text-sm max-w-xs mx-auto">
              Plan smarter, focus deeper, achieve more.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:py-0">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold" data-testid="text-auth-title">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                {isLogin
                  ? "Sign in to continue your study journey."
                  : "Start your journey to better studying."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="johndoe"
                        required
                        minLength={3}
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                        data-testid="input-display-name"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>
              <Button type="submit" className="w-full h-11 mt-2" disabled={isPending} data-testid="button-auth-submit">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
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

            <div className="lg:hidden mt-8 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-4">Everything you need to study better</p>
              <div className="grid grid-cols-3 gap-2">
                {features.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-medium leading-tight">{item.label}</p>
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
