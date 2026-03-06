import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Users,
    BookOpen,
    Folder,
    CheckSquare,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Crown,
    Ban,
    Key,
    Trash2,
    UserCheck,
    UserX,
    Lock,
    BarChart3,
    Search,
    RefreshCw,
    AlertTriangle,
    TrendingUp,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdminMetrics { users: number; groups: number; resources: number; tasks: number; }
interface AdminData { metrics: AdminMetrics; recentUsers: User[]; }
interface AdminGroup { id: number; name: string; description: string | null; createdBy: number; createdAt: string; inviteCode: string; }
interface AdminResource { id: number; userId: number; title: string; type: string; url: string; createdAt: string; }
interface AdminUser extends Partial<User> {
    id: number; username: string; email: string; displayName: string | null;
    role: string; isAdmin: number; createdAt: string; streakCount?: number; productivityScore?: number;
}

const ROLE_COLORS: Record<string, string> = {
    super_admin: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    admin: "bg-primary/10 text-primary border-primary/30",
    user: "bg-muted/50 text-muted-foreground border-border",
    banned: "bg-red-500/10 text-red-500 border-red-500/30",
};
const ROLE_ICON: Record<string, React.ReactNode> = {
    super_admin: <Crown className="h-3 w-3" />,
    admin: <Shield className="h-3 w-3" />,
    user: <UserCheck className="h-3 w-3" />,
    banned: <Ban className="h-3 w-3" />,
};

export default function AdminDashboard() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const isSuperAdmin = currentUser?.role === 'super_admin';

    const [search, setSearch] = useState("");
    const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
    const [newPassword, setNewPassword] = useState("");

    const { data, isLoading, error } = useQuery<AdminData>({
        queryKey: ["/api/admin/metrics"],
        retry: false,
    });

    const { data: allUsers = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
        queryKey: ["/api/admin/users"],
        enabled: !!isSuperAdmin,
    });

    const { data: allGroups = [] } = useQuery<AdminGroup[]>({
        queryKey: ["/api/admin/groups"],
        enabled: !!isSuperAdmin,
    });

    const { data: allResources = [] } = useQuery<AdminResource[]>({
        queryKey: ["/api/admin/resources"],
        enabled: !!isSuperAdmin,
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
    };

    const roleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: number; role: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
            return res.json();
        },
        onSuccess: () => { invalidateAll(); toast({ title: "Role Updated" }); }
    });

    const banMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("PATCH", `/api/admin/users/${id}/ban`, {});
            return res.json();
        },
        onSuccess: (data) => { invalidateAll(); toast({ title: "User Banned", description: data.message }); }
    });

    const unbanMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("PATCH", `/api/admin/users/${id}/unban`, {});
            return res.json();
        },
        onSuccess: () => { invalidateAll(); toast({ title: "User Unbanned" }); }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/users/${id}/reset-password`, { newPassword });
            return res.json();
        },
        onSuccess: () => {
            setResetTarget(null);
            setNewPassword("");
            toast({ title: "Password Reset", description: "New password set successfully." });
        },
        onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" })
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/groups/${id}`);
        },
        onSuccess: () => { invalidateAll(); toast({ title: "Group Deleted" }); }
    });

    const deleteResourceMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/resources/${id}`);
        },
        onSuccess: () => { invalidateAll(); toast({ title: "Resource Deleted" }); }
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
    const filteredUsers = allUsers.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.displayName || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className={`h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-inner ${isSuperAdmin ? "bg-yellow-500/10 text-yellow-500" : "bg-primary/10 text-primary"}`}>
                        {isSuperAdmin ? <Crown className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">
                            {isSuperAdmin ? "Root Control" : "Admin Panel"}
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            {isSuperAdmin
                                ? "Full platform authority — user management, bans, resets, and deletion."
                                : "Content moderation, group oversight and analytics."}
                        </p>
                    </div>
                </div>
                <Badge className={`text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest ${isSuperAdmin ? "bg-yellow-500 text-white" : "bg-primary text-primary-foreground"}`}>
                    {isSuperAdmin ? "👑 Super Admin" : "🛠 Admin"}
                </Badge>
            </div>

            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: metrics.users, icon: <Users className="h-7 w-7" />, color: "text-primary" },
                    { label: "Study Groups", value: metrics.groups, icon: <Folder className="h-7 w-7" />, color: "text-blue-500" },
                    { label: "Resources", value: metrics.resources, icon: <BookOpen className="h-7 w-7" />, color: "text-green-500" },
                    { label: "Tasks", value: metrics.tasks, icon: <CheckSquare className="h-7 w-7" />, color: "text-amber-500" },
                ].map(card => (
                    <Card key={card.label} className="rounded-[2rem] bg-card border border-border/40 hover:shadow-md transition-all">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</p>
                                <p className="text-4xl font-black mt-1">{card.value}</p>
                            </div>
                            <div className={card.color + " opacity-30"}>{card.icon}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Super Admin full panel ── */}
            {isSuperAdmin ? (
                <Tabs defaultValue="users">
                    <TabsList className="rounded-2xl bg-muted/40 p-1 border border-border/40 h-12">
                        <TabsTrigger value="users" className="rounded-xl font-black uppercase text-xs tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
                            <Users className="h-3.5 w-3.5 mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="groups" className="rounded-xl font-black uppercase text-xs tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
                            <Folder className="h-3.5 w-3.5 mr-2" /> Groups
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="rounded-xl font-black uppercase text-xs tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
                            <BookOpen className="h-3.5 w-3.5 mr-2" /> Resources
                        </TabsTrigger>
                        <TabsTrigger value="system" className="rounded-xl font-black uppercase text-xs tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5">
                            <TrendingUp className="h-3.5 w-3.5 mr-2" /> System
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Users Tab ── */}
                    <TabsContent value="users" className="mt-6">
                        <Card className="rounded-[2.5rem] border border-border/40 bg-card overflow-hidden shadow-xl">
                            <CardHeader className="px-8 py-6 border-b border-border/40 flex flex-row items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <Key className="h-6 w-6 text-primary" /> User Access Orchestration
                                    </CardTitle>
                                    <CardDescription className="font-medium mt-1">
                                        Promote, demote, ban, or reset passwords.
                                    </CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-9 rounded-xl h-10 bg-muted/40 border-border/40"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {usersLoading ? (
                                    <div className="p-8 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl w-full" />)}</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                                                <tr>
                                                    <th className="px-8 py-4 text-left">User</th>
                                                    <th className="px-6 py-4 text-left">Email</th>
                                                    <th className="px-6 py-4 text-left">Role</th>
                                                    <th className="px-6 py-4 text-left">Joined</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {filteredUsers.map((u) => (
                                                    <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${u.role === 'banned' ? "opacity-50" : ""}`}>
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-9 w-9 border-2 border-border/20">
                                                                    <AvatarImage src={u.avatar || undefined} />
                                                                    <AvatarFallback className="font-black text-xs">{(u.displayName || u.username)[0].toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-bold leading-none">{u.displayName || u.username}</p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">@{u.username}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground text-xs">{u.email}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md flex items-center gap-1 w-fit ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                                                                {ROLE_ICON[u.role]} {u.role?.replace('_', ' ')}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground text-xs">{u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}</td>
                                                        <td className="px-6 py-4">
                                                            {u.id !== currentUser?.id && (
                                                                <div className="flex items-center gap-1 justify-end flex-wrap">
                                                                    {/* Elevation to Admin */}
                                                                    {u.role === 'user' && (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                                                                            onClick={() => roleMutation.mutate({ id: u.id, role: 'admin' })}
                                                                            disabled={roleMutation.isPending}
                                                                        >
                                                                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Promote to Admin
                                                                        </Button>
                                                                    )}

                                                                    {/* Elevation to Super Admin */}
                                                                    {u.role === 'admin' && (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-yellow-500/10 hover:text-yellow-600 transition-all"
                                                                            onClick={() => roleMutation.mutate({ id: u.id, role: 'super_admin' })}
                                                                            disabled={roleMutation.isPending}
                                                                        >
                                                                            <Crown className="h-3.5 w-3.5 mr-1" /> Make Super Admin
                                                                        </Button>
                                                                    )}

                                                                    {/* Demotion logic */}
                                                                    {u.role === 'admin' && (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                                                                            onClick={() => roleMutation.mutate({ id: u.id, role: 'user' })}
                                                                            disabled={roleMutation.isPending}
                                                                        >
                                                                            <UserX className="h-3.5 w-3.5 mr-1" /> Demote to User
                                                                        </Button>
                                                                    )}

                                                                    {u.role === 'super_admin' && (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                                                                            onClick={() => roleMutation.mutate({ id: u.id, role: 'admin' })}
                                                                            disabled={roleMutation.isPending}
                                                                        >
                                                                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Revoke Super Admin
                                                                        </Button>
                                                                    )}

                                                                    {/* Ban / Unban remains same */}
                                                                    {u.role !== 'banned' && u.role !== 'super_admin' ? (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all"
                                                                            onClick={() => banMutation.mutate(u.id)}
                                                                            disabled={banMutation.isPending}
                                                                        >
                                                                            <Ban className="h-3.5 w-3.5 mr-1" /> Ban
                                                                        </Button>
                                                                    ) : u.role === 'banned' ? (
                                                                        <Button size="sm" variant="ghost"
                                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-green-500/10 hover:text-green-500 transition-all"
                                                                            onClick={() => unbanMutation.mutate(u.id)}
                                                                        >
                                                                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Unban
                                                                        </Button>
                                                                    ) : null}

                                                                    {/* Reset Password */}
                                                                    <Button size="sm" variant="ghost"
                                                                        className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all"
                                                                        onClick={() => { setResetTarget(u); setNewPassword(""); }}
                                                                    >
                                                                        <Lock className="h-3.5 w-3.5 mr-1" /> Reset PW
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {u.id === currentUser?.id && (
                                                                <span className="text-[10px] text-muted-foreground italic pr-4">You</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {filteredUsers.length === 0 && (
                                            <p className="text-center py-12 text-muted-foreground text-sm font-medium">No users found.</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Groups Tab ── */}
                    <TabsContent value="groups" className="mt-6">
                        <Card className="rounded-[2.5rem] border border-border/40 bg-card overflow-hidden shadow-xl">
                            <CardHeader className="px-8 py-6 border-b border-border/40">
                                <CardTitle className="text-2xl font-black flex items-center gap-3">
                                    <Folder className="h-6 w-6 text-blue-500" /> All Study Groups
                                </CardTitle>
                                <CardDescription>Delete harmful or inactive groups from the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                                            <tr>
                                                <th className="px-8 py-4 text-left">Group Name</th>
                                                <th className="px-6 py-4 text-left">Description</th>
                                                <th className="px-6 py-4 text-left">Created</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {allGroups.map(g => (
                                                <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-8 py-4 font-bold">{g.name}</td>
                                                    <td className="px-6 py-4 text-muted-foreground text-xs max-w-[280px] truncate">{g.description || "—"}</td>
                                                    <td className="px-6 py-4 text-muted-foreground text-xs">{format(new Date(g.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button size="sm" variant="ghost"
                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => { if (confirm(`Delete group "${g.name}"?`)) deleteGroupMutation.mutate(g.id); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {allGroups.length === 0 && (
                                        <p className="text-center py-12 text-muted-foreground text-sm font-medium">No groups found.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Resources Tab ── */}
                    <TabsContent value="resources" className="mt-6">
                        <Card className="rounded-[2.5rem] border border-border/40 bg-card overflow-hidden shadow-xl">
                            <CardHeader className="px-8 py-6 border-b border-border/40">
                                <CardTitle className="text-2xl font-black flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-green-500" /> All Resources
                                </CardTitle>
                                <CardDescription>Review and delete harmful or inappropriate uploaded content.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-b border-border/40">
                                            <tr>
                                                <th className="px-8 py-4 text-left">Title</th>
                                                <th className="px-6 py-4 text-left">Type</th>
                                                <th className="px-6 py-4 text-left">Uploaded</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {allResources.map(r => (
                                                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-8 py-4 font-bold max-w-[280px] truncate">{r.title}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="outline" className="text-[9px] uppercase font-black rounded-md">{r.type}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground text-xs">{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button size="sm" variant="ghost"
                                                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg hover:bg-red-500/10 hover:text-red-500"
                                                            onClick={() => { if (confirm(`Delete resource "${r.title}"?`)) deleteResourceMutation.mutate(r.id); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {allResources.length === 0 && (
                                        <p className="text-center py-12 text-muted-foreground text-sm font-medium">No resources found.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── System Tab ── */}
                    <TabsContent value="system" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 rounded-[2.5rem] bg-card border border-border/40 shadow-xl overflow-hidden">
                                <CardHeader className="p-8 border-b border-border/40">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Growth Trajectory</CardTitle>
                                    <CardDescription className="font-bold">New user registrations over time.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={allUsers?.slice(-15).map((_u, i) => ({ day: i, count: i + 1 }))}>
                                                <defs>
                                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted-foreground/10" />
                                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="count" name="Total Users" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorGrowth)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="rounded-[2rem] bg-indigo-500/10 border-indigo-500/20">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-xl font-black text-indigo-500 flex items-center gap-2 uppercase tracking-tighter">
                                            <Shield className="h-5 w-5" /> Security Audit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-3 font-bold text-sm">
                                        <div className="flex justify-between">
                                            <span>Banned Users:</span>
                                            <span className="text-red-500">{allUsers?.filter(u => u.role === 'banned').length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Admins:</span>
                                            <span className="text-blue-500">{allUsers?.filter(u => u.role === 'admin').length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Super Admins:</span>
                                            <span className="text-yellow-600">{allUsers?.filter(u => u.role === 'super_admin').length}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-[2rem] border border-border/40">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-lg font-black uppercase tracking-tighter">Deep-Dive Insights</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-4 font-black">
                                        <div className="p-4 rounded-2xl bg-muted/40">
                                            <p className="text-[10px] text-muted-foreground uppercase">Average Groups per User</p>
                                            <p className="text-2xl mt-1">{(metrics.groups / (metrics.users || 1)).toFixed(1)}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/40">
                                            <p className="text-[10px] text-muted-foreground uppercase">Active Tasks/User Ratio</p>
                                            <p className="text-2xl mt-1">{(metrics.tasks / (metrics.users || 1)).toFixed(1)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                /* ── Regular Admin Panel ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-[2rem] overflow-hidden border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black">
                                <RefreshCw className="h-6 w-6 text-primary" /> Recent Registrations
                            </CardTitle>
                            <CardDescription className="font-medium">The 10 newest accounts created on the platform.</CardDescription>
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
                                    <tbody className="divide-y divide-border/30">
                                        {recentUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-8 py-4 font-bold">{user.username}</td>
                                                <td className="px-8 py-4 text-muted-foreground">{user.email}</td>
                                                <td className="px-8 py-4 text-right text-muted-foreground text-sm">{format(new Date(user.createdAt), 'MMM d')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/5 to-primary/[0.02] border border-primary/20 rounded-[2rem] flex flex-col justify-center text-center p-8 space-y-6">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto shadow-inner">
                            <ShieldCheck className="h-10 w-10" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-black tracking-tight uppercase">Admin Capabilities</h3>
                            <ul className="text-left text-sm space-y-2 text-muted-foreground font-medium">
                                <li className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> Moderate group chats</li>
                                <li className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> Delete group tasks</li>
                                <li className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> Remove users from groups</li>
                                <li className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> Delete bad resources</li>
                                <li className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> Start study battles</li>
                            </ul>
                        </div>
                        <div className="pt-4 space-y-2 text-muted-foreground/60 text-xs border-t border-border/30">
                            <div className="flex items-center gap-1.5 justify-center text-red-400/70">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="font-bold uppercase tracking-widest">Cannot: promote admins, ban users, change settings</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── Reset Password Dialog ── */}
            <Dialog open={!!resetTarget} onOpenChange={() => { setResetTarget(null); setNewPassword(""); }}>
                <DialogContent className="rounded-[2rem] bg-background border border-border shadow-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            <Lock className="h-5 w-5 text-primary" /> Reset Password
                        </DialogTitle>
                        <DialogDescription>
                            Set a new password for <strong>@{resetTarget?.username}</strong>. They will need to use this on next login.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Input
                            type="password"
                            placeholder="New password (min 6 chars)..."
                            className="h-12 rounded-2xl bg-muted/40 border-border/40"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setResetTarget(null)}>Cancel</Button>
                        <Button
                            className="rounded-xl font-black px-6 bg-primary"
                            disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                            onClick={() => resetPasswordMutation.mutate({ id: resetTarget!.id, newPassword })}
                        >
                            {resetPasswordMutation.isPending ? "Resetting..." : "Confirm Reset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
