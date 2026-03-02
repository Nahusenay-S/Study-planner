import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GraduationCap,
  ArrowRight,
  Layers,
  Clock4,
  PieChart,
  Columns3,
  ListChecks,
  Activity,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Subject Organizer",
    desc: "Color-code your courses, track difficulty, and see completion at a glance.",
    color: "#3B82F6",
  },
  {
    icon: ListChecks,
    title: "Priority Tasks",
    desc: "Deadline-aware task lists with status tracking and smart filtering.",
    color: "#8B5CF6",
  },
  {
    icon: Clock4,
    title: "Focus Timer",
    desc: "Built-in Pomodoro with session logging and automatic break scheduling.",
    color: "#EC4899",
  },
  {
    icon: Columns3,
    title: "Kanban Workflow",
    desc: "Drag tasks across stages. Column order persists across sessions.",
    color: "#F59E0B",
  },
  {
    icon: PieChart,
    title: "Study Analytics",
    desc: "Charts for focus time, completion rates, and per-subject breakdowns.",
    color: "#10B981",
  },
  {
    icon: Activity,
    title: "Streaks & Heatmap",
    desc: "Daily streak gamification and a GitHub-style activity calendar.",
    color: "#EF4444",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl" data-testid="landing-nav">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold tracking-tight">StudyFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/auth">
              <Button variant="ghost" size="sm" data-testid="link-sign-in">Sign In</Button>
            </Link>
            <Link href="/auth?mode=register">
              <Button size="sm" data-testid="link-get-started-nav">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-24 left-1/3 w-[400px] h-[400px] bg-blue-500/[0.04] dark:bg-blue-500/[0.06] rounded-full blur-[100px]" />
          <div className="absolute top-32 right-1/3 w-[350px] h-[350px] bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1] mb-5 animate-fade-in">
            Your study workflow,
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              all in one place.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 animate-fade-in leading-relaxed" style={{ animationDelay: "0.1s", opacity: 0 }}>
            Subjects, tasks, focus timer, kanban board, and analytics — organized in a single dashboard so you can stop juggling tools and start learning.
          </p>

          <div className="flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
            <Link href="/auth?mode=register">
              <Button size="lg" className="h-11 px-6" data-testid="button-hero-cta">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-11 px-6" data-testid="button-hero-learn-more">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24" id="features">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Six tools, one dashboard
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Each feature is built to work together — your subjects connect to tasks, tasks connect to timer sessions, and everything feeds into analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden border border-border/50">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="bg-background p-6 sm:p-7 group hover:bg-muted/30 transition-colors duration-200"
                data-testid={`feature-card-${i}`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}12`, color: feature.color }}
                >
                  <feature.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Up and running in minutes
            </h2>
          </div>
          <div className="space-y-0">
            {[
              { n: "1", title: "Create your account", desc: "Email, username, password — that's it." },
              { n: "2", title: "Set up subjects", desc: "Add your courses with custom colors and icons." },
              { n: "3", title: "Add tasks and start a timer", desc: "Break work into tasks, open the Pomodoro, and focus." },
            ].map((step, i) => (
              <div key={step.n} className="flex gap-5 items-start py-5 group">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 text-sm font-bold text-primary/60 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                  {step.n}
                </div>
                <div className="pt-0.5">
                  <p className="font-semibold mb-0.5">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t bg-muted/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Start studying with intention
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Free to use. No credit card. Your data stays yours.
          </p>
          <Link href="/auth?mode=register">
            <Button size="lg" className="h-11 px-6" data-testid="button-cta-bottom">
              Create Your Account
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">StudyFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">Plan. Focus. Achieve.</p>
        </div>
      </footer>
    </div>
  );
}
