import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Timer,
  BarChart3,
  CheckSquare,
  Kanban,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  Star,
  ChevronRight,
  Shield,
  Smartphone,
  Moon,
  Target,
  Brain,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Smart Subjects",
    desc: "Organize your entire curriculum into color-coded subjects with difficulty tracking and progress monitoring.",
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    desc: "Create, prioritize, and track tasks with deadlines, estimated times, and smart status management.",
    gradient: "from-violet-500 to-purple-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Timer,
    title: "Pomodoro Timer",
    desc: "Built-in focus timer with customizable sessions, automatic break scheduling, and session history.",
    gradient: "from-rose-500 to-pink-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Kanban,
    title: "Kanban Board",
    desc: "Drag-and-drop workflow management. Move tasks between columns with persistent ordering.",
    gradient: "from-amber-500 to-orange-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Charts",
    desc: "Visual breakdowns of your study patterns, completion rates, focus time, and subject performance.",
    gradient: "from-emerald-500 to-green-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Flame,
    title: "Streaks & Gamification",
    desc: "Daily streak tracking, productivity scores, GitHub-style heatmap, and achievement badges.",
    gradient: "from-red-500 to-rose-400",
    bg: "bg-red-500/10",
  },
];

const moreFeatures = [
  { icon: Shield, title: "Secure Auth", desc: "Full authentication with encrypted passwords" },
  { icon: Moon, title: "Dark Mode", desc: "Beautiful light and dark theme support" },
  { icon: Smartphone, title: "Responsive", desc: "Works perfectly on every device" },
  { icon: Target, title: "Goal Tracking", desc: "Set and achieve your study targets" },
  { icon: Brain, title: "Smart Insights", desc: "AI-like productivity scoring" },
  { icon: TrendingUp, title: "Progress Reports", desc: "Detailed subject-level analytics" },
];

const steps = [
  { step: "01", title: "Create Your Account", desc: "Sign up in seconds. No credit card needed.", icon: Sparkles },
  { step: "02", title: "Add Your Subjects", desc: "Set up your courses with colors and icons.", icon: BookOpen },
  { step: "03", title: "Plan Your Tasks", desc: "Break work into manageable, prioritized tasks.", icon: CheckSquare },
  { step: "04", title: "Focus & Achieve", desc: "Use Pomodoro sessions and watch your progress grow.", icon: Trophy },
];

const stats = [
  { value: "10K+", label: "Active Students", icon: Star },
  { value: "2M+", label: "Tasks Completed", icon: CheckSquare },
  { value: "500K+", label: "Focus Hours", icon: Timer },
  { value: "98%", label: "Satisfaction", icon: Trophy },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">StudyFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth">
              <Button variant="ghost" size="sm" data-testid="link-sign-in">
                Sign In
              </Button>
            </Link>
            <Link href="/auth?mode=register">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20" data-testid="link-get-started-nav">
                Get Started
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-background to-background dark:from-blue-950/20 dark:via-background dark:to-background" />
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-blue-400/40 animate-orbit" />
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-purple-400/30 animate-orbit-reverse" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">The #1 Student Productivity Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: "0.1s", opacity: 0 }}>
            Turn study chaos into
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent animate-shimmer">
              focused achievement.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s", opacity: 0 }}>
            Plan your subjects, manage tasks, track focus sessions, and visualize your progress —
            all in one beautiful dashboard built for serious students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <Link href="/auth?mode=register">
              <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5" data-testid="button-hero-cta">
                Start Studying Smarter
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" data-testid="button-hero-learn-more">
                See Features
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-12 animate-fade-in" style={{ animationDelay: "0.4s", opacity: 0 }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-28" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
                excel
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit designed to help you organize, focus, and achieve your academic goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <Card
                key={feature.title}
                className="group border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <CardContent className="p-6 relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 ${feature.bg} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
                  <div className="relative">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Get started in{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                4 simple steps
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              From signup to productivity in under 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.step} className="relative group">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%_-_12px)] w-[calc(100%_-_40px)] h-px bg-border z-0" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background border-2 border-border shadow-sm mb-4 group-hover:border-primary/50 group-hover:shadow-md transition-all duration-300">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-2">Step {step.step}</span>
                  <h3 className="text-base font-bold mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Plus{" "}
              <span className="bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                even more
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {moreFeatures.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all duration-200"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L2c+PC9zdmc+')] opacity-60" />
        <div className="absolute top-10 left-10 w-3 h-3 rounded-full bg-white/20 animate-orbit" />
        <div className="absolute bottom-20 right-20 animate-float opacity-20">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <div className="absolute top-1/3 left-20 animate-float-delayed opacity-15">
          <Star className="h-8 w-8 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to transform your study habits?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            Join thousands of students who are studying smarter, staying focused, and achieving more every day.
          </p>
          <Link href="/auth?mode=register">
            <Button size="lg" className="h-12 px-8 text-base bg-white text-blue-700 hover:bg-white/90 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5" data-testid="button-cta-bottom">
              Get Started — It's Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">StudyFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for students who mean business.
          </p>
        </div>
      </footer>
    </div>
  );
}
