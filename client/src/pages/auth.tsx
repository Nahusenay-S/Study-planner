import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowRight, Loader2, BookOpen, Timer, BarChart3, CheckSquare } from "lucide-react";

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold">StudyFlow</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Your study sessions,<br />supercharged.
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Plan smarter, focus deeper, achieve more. The all-in-one study platform
            built for serious learners.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, label: "Smart Subjects", desc: "Organized learning" },
              { icon: CheckSquare, label: "Task System", desc: "Priority-based" },
              { icon: Timer, label: "Pomodoro Timer", desc: "Deep focus sessions" },
              { icon: BarChart3, label: "Analytics", desc: "Track progress" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <item.icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">StudyFlow</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold" data-testid="text-auth-title">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isLogin
                ? "Sign in to continue your study journey."
                : "Start your journey to better studying."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    data-testid="input-display-name"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
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
              <span className="font-medium text-primary">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
