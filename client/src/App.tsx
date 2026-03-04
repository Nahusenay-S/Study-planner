import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";
import { StudyBuddy } from "@/components/study-buddy";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import SubjectsPage from "@/pages/subjects";
import TasksPage from "@/pages/tasks";
import PomodoroPage from "@/pages/pomodoro";
import AnalyticsPage from "@/pages/analytics";
import KanbanPage from "@/pages/kanban";
import ProfilePage from "@/pages/profile";
import GroupsPage from "@/pages/groups";
import GroupDetailPage from "@/pages/group-detail";
import ResourcesPage from "@/pages/resources";
import QuizBattlePage from "@/pages/quiz-battle";
import AdminDashboard from "@/pages/admin";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/subjects" component={SubjectsPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/pomodoro" component={PomodoroPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/kanban" component={KanbanPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/groups" component={GroupsPage} />
      <Route path="/groups/:id" component={GroupDetailPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/quizzes/:id" component={QuizBattlePage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/auth">{() => <Redirect to="/" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
};

function AuthenticatedApp() {
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b h-12 shrink-0 px-4 bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1.5 px-1 pr-1.5 shrink-0 ml-auto">
              <NotificationCenter />
              <div className="h-4 w-px bg-border/40 mx-1 shrink-0" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <AppRouter />
          </main>
          <StudyBuddy />
        </div>
      </div>
    </SidebarProvider>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <UnauthenticatedApp />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
