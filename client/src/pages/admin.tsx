import { useQuery, useMutation } from "@tanstack/react-query";
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
    ShieldAlert,
    UserCircle,
    Key,
    ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const { data, isLoading, error } = useQuery<AdminData>({
        queryKey: ["/api/admin/metrics"],
        retry: false,
    });

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
        enabled: !!isSuperAdmin,
    });

    const roleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: number, role: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
            toast({ title: "Role Updated", description: "The user's access level has been synchronized." });
        }
    });

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto mt-10">
                <Alert variant="destructive" className="rounded-[2rem] border-2">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle className="font-black">ACCESS DENIED</AlertTitle>
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
                <Skeleton className="h-12 w-64 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
                </div>
                <Skeleton className="h-96 w-full mt-6 rounded-[2.5rem]" />
            </div>
        );
    }

    const { metrics, recentUsers } = data;

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Shield className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Root Control</h1>
                        <p className="text-muted-foreground font-medium">Platform-wide oversight and user orchestration.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20 rounded-[2rem] hover-elevate transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Size</p>
                            <p className="text-4xl font-black">{metrics.users}</p>
                        </div>
                        <Users className="h-8 w-8 text-primary/40" />
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] bg-card/40 border-border/40 hover-elevate transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nodes</p>
                            <p className="text-4xl font-black">{metrics.groups}</p>
                        </div>
                        <Folder className="h-8 w-8 text-muted-foreground/30" />
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] bg-card/40 border-border/40 hover-elevate transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Datapoints</p>
                            <p className="text-4xl font-black">{metrics.resources}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] bg-card/40 border-border/40 hover-elevate transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
                            <p className="text-4xl font-black">{metrics.tasks}</p>
                        </div>
                        <CheckSquare className="h-8 w-8 text-muted-foreground/30" />
                    </CardContent>
                </Card>
            </div>

            {isSuperAdmin && (
                <Card className="rounded-[2.5rem] border-primary/20 bg-card/80 backdrop-blur-3xl shadow-2xl overflow-hidden border-2">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 py-8 px-8 flex flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-black flex items-center gap-3">
                                <Key className="h-6 w-6 text-primary" />
                                USER ACCESS ORCHESTRATION
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium text-base">Direct role assignment and system permission toggles.</CardDescription>
                        </div>
                        <Badge className="bg-primary text-primary-foreground font-black px-4 py-1.5 rounded-full shadow-lg shadow-primary/20">ROOT ACTIVE</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                                    <tr>
                                        <th className="px-8 py-4 text-left">Entity</th>
                                        <th className="px-8 py-4 text-left">Identifier</th>
                                        <th className="px-8 py-4 text-left">Current Protocol</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {allUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-primary/10 group-hover:border-primary/30 transition-all">
                                                        <AvatarImage src={u.avatar || undefined} />
                                                        <AvatarFallback className="font-black text-xs">{u.displayName?.[0] || u.username[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-foreground text-base leading-none">{u.displayName}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">ID: {u.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-muted-foreground font-medium">{u.email}</td>
                                            <td className="px-8 py-5">
                                                <Badge variant={u.role === 'super_admin' ? 'default' : u.role === 'admin' ? 'secondary' : 'outline'}
                                                    className={`font-black uppercase tracking-tighter text-[10px] py-1 px-3 rounded-md ${u.role === 'super_admin' ? 'bg-primary' : ''}`}>
                                                    {u.role || (u.isAdmin ? 'admin' : 'user')}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-5 text-right space-x-2">
                                                {u.id !== currentUser?.id && (
                                                    <>
                                                        {u.role !== 'admin' && (
                                                            <Button size="sm" variant="ghost" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                                                                onClick={() => roleMutation.mutate({ id: u.id, role: 'admin' })}
                                                                disabled={roleMutation.isPending}>
                                                                Make Admin
                                                            </Button>
                                                        )}
                                                        {u.role === 'admin' && (
                                                            <Button size="sm" variant="ghost" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                                                                onClick={() => roleMutation.mutate({ id: u.id, role: 'user' })}
                                                                disabled={roleMutation.isPending}>
                                                                Demote
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isSuperAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-[2rem] overflow-hidden border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black">
                                <Activity className="h-6 w-6 text-primary" />
                                RECENT REGISTRATIONS
                            </CardTitle>
                            <CardDescription className="text-base font-medium">The 10 newest accounts created on the platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                                        <tr>
                                            <th className="px-8 py-4 text-left">User</th>
                                            <th className="px-8 py-4 text-left">Email</th>
                                            <th className="px-8 py-4 text-right">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {recentUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-8 py-5 font-bold text-base">{user.username}</td>
                                                <td className="px-8 py-5 text-muted-foreground font-medium">{user.email}</td>
                                                <td className="px-8 py-5 text-right text-muted-foreground font-medium">
                                                    {format(new Date(user.createdAt), 'MMM d')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/20 border-border/40 rounded-[2rem] flex flex-col justify-center text-center p-8 space-y-6">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto shadow-inner">
                            <ShieldCheck className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight uppercase">Limited Access</h3>
                            <p className="text-muted-foreground font-medium">Detailed user orchestration is reserved for Super Admins. Contact the system administrator for root privileges.</p>
                        </div>
                        <Button variant="outline" className="rounded-xl h-12 font-black uppercase tracking-widest transition-all" asChild>
                            <a href="/api/auth/make-me-super-admin" target="_blank">Unlock Root (Debug)</a>
                        </Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
