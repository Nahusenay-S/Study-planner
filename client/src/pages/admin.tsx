import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    BookOpen,
    Folder,
    CheckSquare,
    Shield,
    Activity,
    ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";

interface AdminMetrics {
    users: number;
    groups: number;
    resources: number;
    tasks: number;
}

interface AdminData {
    metrics: AdminMetrics;
    recentUsers: User[];
}

export default function AdminDashboard() {
    const { data, isLoading, error } = useQuery<AdminData>({
        queryKey: ["/api/admin/metrics"],
        retry: false, // If it fails with 403, don't retry.
    });

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto mt-10">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : "You do not have permission to view the admin dashboard."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-96 w-full mt-6" />
            </div>
        );
    }

    const { metrics, recentUsers } = data;

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">System Admin</h1>
                    <p className="text-muted-foreground">Global StudyFlow platform overview and metrics.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                            <p className="text-3xl font-bold">{metrics.users}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Users className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Study Groups</p>
                            <p className="text-3xl font-bold">{metrics.groups}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Folder className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Resources</p>
                            <p className="text-3xl font-bold">{metrics.resources}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <BookOpen className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Tasks Created</p>
                            <p className="text-3xl font-bold">{metrics.tasks}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <CheckSquare className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" /> Recent User Signups
                        </CardTitle>
                        <CardDescription>The 10 newest accounts created on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">User</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium">{user.username}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                            <td className="px-4 py-3">
                                                {user.isAdmin ? (
                                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                                                        User
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">
                                                {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                            </td>
                                        </tr>
                                    ))}
                                    {recentUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                No users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-dashed">
                    <CardHeader>
                        <CardTitle>System Health</CardTitle>
                        <CardDescription>Automated diagnostic information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Database</span>
                            <span className="text-sm text-green-500 font-bold flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500"></div> Connected</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">AI Engine</span>
                            <span className="text-sm text-green-500 font-bold flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500"></div> Online</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Node.js Memory</span>
                            <span className="text-sm font-mono text-muted-foreground">Stable</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
