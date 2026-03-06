import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Hash, Users, BookOpen, CheckSquare, MessageSquare, Trophy, Swords, Shield, ExternalLink, Settings, Plus, LayoutGrid, UserPlus, Mail, User, Star, Clock, Activity, Crown, Zap, X, HelpCircle, Sparkles, Brain, PlayCircle, Save, Trash2, CheckCircle2, ListFilter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GroupChat } from "@/components/group-chat";
import { GroupLeaderboard } from "@/components/group-leaderboard";
import { GroupQuizzes } from "@/components/group-quizzes";
import { GroupKanban } from "@/components/group-kanban";
import type { StudyGroup, User as UserType, Resource, Task } from "@shared/schema";

export default function GroupDetailPage() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { user: authUser } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [profileView, setProfileView] = useState<(any & { user: UserType }) | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsName, setSettingsName] = useState("");
    const [settingsDesc, setSettingsDesc] = useState("");
    const [settingsAvatar, setSettingsAvatar] = useState("");

    const { data: group, isLoading: groupLoading } = useQuery<StudyGroup>({
        queryKey: [`/api/groups/${id}`],
    });

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskPriority, setTaskPriority] = useState("medium");
    const [taskDeadline, setTaskDeadline] = useState("");
    const [materialTitle, setMaterialTitle] = useState("");
    const [materialType, setMaterialType] = useState("pdf");
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [inviteIdentifier, setInviteIdentifier] = useState("");
    const [inviting, setInviting] = useState(false);

    const handleInvite = async () => {
        if (!inviteIdentifier.trim()) return;
        setInviting(true);
        try {
            await apiRequest("POST", `/api/groups/${id}/invite`, { identifier: inviteIdentifier });
            toast({ title: "Invitation Sent", description: `We've notified ${inviteIdentifier} about the invite.` });
            setInviteIdentifier("");
            setInviteDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Invite Failed", description: error.message, variant: "destructive" });
        } finally {
            setInviting(false);
        }
    };

    const { data: members = [], isLoading: membersLoading } = useQuery<(any & { user: UserType })[]>({
        queryKey: [`/api/groups/${id}/members`],
        enabled: !!id,
    });

    const { data: resources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
        queryKey: [`/api/groups/${id}/resources`],
        enabled: !!id,
    });

    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: [`/api/groups/${id}/tasks`],
        enabled: !!id,
    });

    const copyInviteCode = () => {
        if (!group) return;
        navigator.clipboard.writeText(group.inviteCode);
        toast({ title: "Invite Code Copied" });
    };

    // Pre-fill settings when group loads
    useEffect(() => {
        if (group) {
            setSettingsName(group.name ?? "");
            setSettingsDesc(group.description ?? "");
            setSettingsAvatar((group as any).avatarUrl ?? "");
        }
    }, [group]);

    const updateGroupMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("PATCH", `/api/groups/${id}`, {
                name: settingsName,
                description: settingsDesc,
                avatarUrl: settingsAvatar,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}`] });
            setSettingsOpen(false);
            toast({ title: "Group Updated!", description: "Changes saved successfully." });
        },
        onError: (err: Error) => {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/groups/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
            toast({ title: "Group Deleted", description: "The study circle has been permanently dissolved." });
            setLocation("/groups");
        },
        onError: (err: Error) => {
            toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
        }
    });

    const leaveGroupMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", `/api/groups/${id}/leave`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
            toast({ title: "Left Group", description: "You have left the study circle." });
            setLocation("/groups");
        },
        onError: (err: Error) => {
            toast({ title: "Action Failed", description: err.message, variant: "destructive" });
        }
    });

    const addTaskMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/tasks", {
                title: taskTitle,
                priority: taskPriority,
                deadline: taskDeadline || null,
                groupId: parseInt(String(id)),
                status: "todo"
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/tasks`] });
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/kanban`] });
            setTaskDialogOpen(false);
            setTaskTitle("");
            toast({ title: "Task Added", description: "The group task has been created." });
        },
        onError: (err: Error) => {
            toast({ title: "Failed to add task", description: err.message, variant: "destructive" });
        }
    });

    const shareMaterialMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append("title", materialTitle);
            formData.append("type", materialType);
            formData.append("groupId", String(id));
            if (materialFile) formData.append("file", materialFile);

            const res = await fetch("/api/resources", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${id}/resources`] });
            setShareDialogOpen(false);
            setMaterialTitle("");
            setMaterialFile(null);
            toast({ title: "Material Shared", description: "Successfully added to the group library." });
        },
        onError: (err: Error) => {
            toast({ title: "Sharing Failed", description: err.message, variant: "destructive" });
        }
    });

    // Simulated activity feed (in a real app these come from the backend)
    const activityFeed = [
        ...resources.slice(0, 2).map(r => ({ icon: "📚", text: `${members[0]?.user?.username || "Someone"} shared "${r.title}"`, time: r.createdAt })),
        ...tasks.slice(0, 2).map(t => ({ icon: "✅", text: `Task "${t.title}" was added`, time: new Date().toISOString() })),
        { icon: "👥", text: `${members.length} member${members.length !== 1 ? "s" : ""} in this circle`, time: new Date().toISOString() },
    ].filter(Boolean).slice(0, 5);

    if (groupLoading) {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-8 animate-pulse">
                <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-3xl" /><div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-96" /></div></div>
                <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><Skeleton className="h-96 lg:col-span-2 rounded-[2.5rem]" /><Skeleton className="h-96 rounded-[2.5rem]" /></div>
            </div>
        );
    }

    if (!group) {
        return <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-[50vh] gap-4">
            <Users className="h-12 w-12 opacity-20" />
            <p className="font-bold text-xl">Group not found</p>
            <p className="max-w-xs text-sm">This group might be private or doesn't exist anymore.</p>
        </div>;
    }

    return (
        <div className="min-h-screen bg-transparent animate-fade-in">
            {/* Header Hero Section */}
            <div className="w-full bg-card/40 backdrop-blur-xl border-b border-border/40 pb-8 pt-6 sticky top-0 z-40 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 flex items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary to-primary-foreground shadow-2xl shadow-primary/30 shrink-0 overflow-hidden group hover:rotate-6 transition-transform duration-500">
                                {(group as any).avatarUrl ? (
                                    <img
                                        src={(group as any).avatarUrl}
                                        alt={group.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Users className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black tracking-tight text-foreground">{group.name}</h1>
                                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-black px-3 py-1 rounded-full">Official Hub</Badge>
                                </div>
                                <p className="text-muted-foreground font-medium text-sm line-clamp-1 max-w-lg">{group.description || "The premier study destination for collaborative learning."}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-2">
                                        <UserPlus className="h-5 w-5" />
                                        <span>INVITE MEMBER</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem] border-primary/20 bg-card/90 backdrop-blur-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black tracking-tight">ADD NEW MEMBER</DialogTitle>
                                        <DialogDescription className="text-muted-foreground font-medium">Invite another student to join your study circle.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="identifier">Username or Email</Label>
                                            <div className="relative">
                                                <Input
                                                    id="identifier"
                                                    value={inviteIdentifier}
                                                    onChange={(e) => setInviteIdentifier(e.target.value)}
                                                    placeholder="e.g. alex_smith or alex@college.edu"
                                                    className="pl-10 h-12 bg-muted/40 border-primary/10 rounded-xl"
                                                />
                                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            onClick={handleInvite}
                                            disabled={inviting || !inviteIdentifier.trim()}
                                            className="w-full h-12 rounded-xl bg-primary font-bold shadow-glow uppercase"
                                        >
                                            {inviting ? "SENDING..." : "SEND INVITE"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <div className="flex items-center gap-2 p-1.5 pr-4 rounded-[1.25rem] bg-card border border-border/60 shadow-inner group hover:border-primary/30 transition-colors">
                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 text-primary">
                                    <Hash className="h-4 w-4" />
                                </div>
                                <code className="text-sm font-black tracking-widest text-primary/80">{group.inviteCode}</code>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 rounded-lg hover:bg-primary/10 transition-colors" onClick={copyInviteCode}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            {/* Settings button — opens group settings dialog */}
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-12 w-12 rounded-2xl border-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
                                onClick={() => setSettingsOpen(true)}
                            >
                                <Settings className="h-5 w-5" />
                            </Button>

                            {/* Group Settings Dialog */}
                            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                                <DialogContent className="rounded-[2.5rem] border-border/40 bg-card/95 backdrop-blur-2xl max-w-lg p-0 overflow-hidden">
                                    {/* Header band */}
                                    <div className="h-2 bg-gradient-to-r from-primary to-primary-foreground" />
                                    <div className="p-8 space-y-6">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                                                <Settings className="h-5 w-5 text-primary" /> Group Settings
                                            </DialogTitle>
                                            <DialogDescription className="text-muted-foreground">
                                                {group.createdBy === authUser?.id ? "Update your study circle's appearance and info." : "View study circle info and manage your membership."}
                                            </DialogDescription>
                                        </DialogHeader>

                                        {group.createdBy === authUser?.id ? (
                                            <div className="space-y-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-16 w-16 rounded-[1.25rem] bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-black text-primary text-2xl shrink-0 overflow-hidden border border-border/40">
                                                        {settingsAvatar
                                                            ? <img src={settingsAvatar} className="h-full w-full object-cover" />
                                                            : (settingsName?.[0] || group?.name?.[0] || "G").toUpperCase()
                                                        }
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                                                        <Input
                                                            placeholder="https://example.com/avatar.png"
                                                            value={settingsAvatar}
                                                            onChange={e => setSettingsAvatar(e.target.value)}
                                                            className="h-10 rounded-xl bg-muted/40 border-border/40 text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Group Name</Label>
                                                    <Input
                                                        placeholder="e.g. ML Research Squad"
                                                        value={settingsName}
                                                        onChange={e => setSettingsName(e.target.value)}
                                                        className="h-12 rounded-xl bg-muted/40 border-border/40 font-bold text-sm focus-visible:ring-primary/30"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                                                    <textarea
                                                        placeholder="What does this study group focus on?"
                                                        value={settingsDesc}
                                                        onChange={e => setSettingsDesc(e.target.value)}
                                                        rows={3}
                                                        className="w-full rounded-xl bg-muted/40 border border-border/40 text-sm font-medium p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
                                                        <Users className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm">{group.name}</p>
                                                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-tighter">Group Member</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground italic font-medium px-2 pb-2 text-center">"{group.description || "Success favors the prepared mind."}"</p>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Invite Code</Label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 h-11 rounded-xl bg-muted/60 border border-border/40 px-4 flex items-center text-sm font-black text-primary tracking-widest">{group?.inviteCode}</code>
                                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-primary/10 transition-colors" onClick={copyInviteCode}>
                                                    <Copy className="h-4 w-4 text-primary" />
                                                </Button>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-3 flex-col sm:flex-row">
                                            <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setSettingsOpen(false)}>
                                                {group.createdBy === authUser?.id ? "Cancel" : "Close"}
                                            </Button>
                                            {group.createdBy === authUser?.id && (
                                                <Button
                                                    className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20"
                                                    onClick={() => updateGroupMutation.mutate()}
                                                    disabled={updateGroupMutation.isPending || !settingsName.trim()}
                                                >
                                                    {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
                                                </Button>
                                            )}
                                        </DialogFooter>

                                        {group.createdBy === authUser?.id ? (
                                            <div className="px-8 pb-8 pt-4 border-t border-destructive/10 bg-destructive/[0.02]">
                                                <Button
                                                    variant="ghost"
                                                    className="w-full h-12 rounded-xl font-black text-destructive hover:bg-destructive hover:text-white transition-all"
                                                    onClick={() => {
                                                        if (confirm("DISSOLVE STUDY CIRCLE? This will permanently delete all group messages, tasks, and shared resources for everyone.")) {
                                                            deleteGroupMutation.mutate();
                                                        }
                                                    }}
                                                    disabled={deleteGroupMutation.isPending}
                                                >
                                                    {deleteGroupMutation.isPending ? "DISSOLVING..." : "DELETE GROUP ENTIRELY"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="px-8 pb-8 pt-4 border-t border-destructive/10 bg-destructive/[0.02]">
                                                <Button
                                                    variant="ghost"
                                                    className="w-full h-12 rounded-xl font-black text-destructive hover:bg-destructive hover:text-white transition-all"
                                                    onClick={() => {
                                                        if (confirm("LEAVE STUDY CIRCLE? You will no longer be able to participate in discussions or access shared materials.")) {
                                                            leaveGroupMutation.mutate();
                                                        }
                                                    }}
                                                    disabled={leaveGroupMutation.isPending}
                                                >
                                                    {leaveGroupMutation.isPending ? "LEAVING..." : "LEAVE THIS GROUP"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
                    <TabsList className="h-14 p-1.5 bg-muted/40 backdrop-blur-md border border-border/40 rounded-[1.25rem] w-full overflow-x-auto scrollbar-none gap-1 flex">
                        <TabsTrigger value="overview" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <LayoutGrid className="h-4 w-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <MessageSquare className="h-4 w-4" /> Discussion
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <BookOpen className="h-4 w-4" /> Library
                        </TabsTrigger>
                        <TabsTrigger value="kanban" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <CheckSquare className="h-4 w-4" /> Kanban
                        </TabsTrigger>
                        <TabsTrigger value="members" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <Users className="h-4 w-4" /> Members
                            <Badge variant="secondary" className="ml-1 rounded-full text-[10px] h-5 px-1.5 font-black">{members.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <Trophy className="h-4 w-4" /> Rankings
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="rounded-xl px-4 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2 whitespace-nowrap">
                            <Swords className="h-4 w-4" /> Battles
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-10 pb-32">
                        <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-8">
                                    {/* Stats Card */}
                                    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-foreground text-white group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                                            <Trophy className="h-32 w-32" />
                                        </div>
                                        <CardHeader className="relative z-10">
                                            <CardTitle className="text-xl font-black">Group Stats</CardTitle>
                                            <CardDescription className="text-primary-foreground/70 font-bold">Combined performance metrics.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6 relative z-10 pb-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Members</p>
                                                    <p className="text-3xl font-black">{members.length}</p>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Resources</p>
                                                    <p className="text-3xl font-black">{resources.length}</p>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tasks</p>
                                                    <p className="text-3xl font-black">{tasks.length}</p>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Battles</p>
                                                    <p className="text-3xl font-black">0</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Activity Feed */}
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Feed</h2>
                                        <div className="bg-card/40 backdrop-blur-md rounded-[2rem] border border-border/40 p-4 space-y-3 shadow-xl">
                                            {activityFeed.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic text-center py-4">No activity yet. Start sharing!</p>
                                            )}
                                            {activityFeed.map((item, i) => (
                                                <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                                                    <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{item.text}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Just now</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h2 className="text-xl font-black tracking-tight flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /> Recent Shared Material</h2>
                                            <Button variant="ghost" className="text-xs font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary" onClick={() => setActiveTab("resources")}>View All Library</Button>
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-6">
                                            {resources.slice(0, 4).map(res => (
                                                <Card key={res.id} className="border-none shadow-xl rounded-[2rem] bg-card/60 backdrop-blur-sm group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-15 transition-opacity duration-700">
                                                        <BookOpen className="h-16 w-16" />
                                                    </div>
                                                    <CardContent className="p-6 space-y-4">
                                                        <div className="space-y-1">
                                                            <p className="font-black text-base tracking-tight truncate leading-tight">{res.title}</p>
                                                            <p className="text-xs text-muted-foreground line-clamp-2 font-medium leading-relaxed">{res.description || "Conceptual notes for advanced studies."}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2">
                                                            <Badge variant="secondary" className="rounded-full bg-primary/5 text-primary border-none px-3 font-black text-[9px] uppercase tracking-widest">{res.type}</Badge>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                                                                <a href={res.url || "#"} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {resources.length === 0 && <div className="col-span-2 p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] text-muted-foreground italic font-medium">Be the first to share resources with the group!</div>}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h2 className="text-xl font-black tracking-tight flex items-center gap-3"><CheckSquare className="h-6 w-6 text-primary" /> Upcoming Deadlines</h2>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" className="text-xs font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary" onClick={() => setActiveTab("kanban")}>Kanban Board</Button>
                                                {group.createdBy === authUser?.id && (
                                                    <Button variant="outline" className="h-9 rounded-xl text-xs font-black border-primary/20 bg-primary/5 text-primary" onClick={() => setTaskDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Task</Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {tasks.slice(0, 5).map(task => (
                                                <div key={task.id} className="flex items-center justify-between p-5 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-lg group hover:border-primary/20 transition-all duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === "completed" ? "bg-primary border-primary text-white" : "border-border"}`}>
                                                            {task.status === "completed" && <CheckSquare className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm tracking-tight">{task.title}</p>
                                                            {task.deadline && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{new Date(task.deadline).toLocaleDateString()} • Global Deadline</p>}
                                                        </div>
                                                    </div>
                                                    <Badge className={`rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1 ${task.status === "completed" ? "bg-green-500/10 text-green-600 border-none" : "bg-primary/10 text-primary border-none"}`}>
                                                        {task.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                            {tasks.length === 0 && <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] text-muted-foreground italic font-medium">No active tasks assigned to this group yet.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="kanban" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <GroupKanban groupId={parseInt(String(id))} members={members} isAdmin={group?.createdBy === authUser?.id} />
                        </TabsContent>
                        <TabsContent value="chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <GroupChat
                                groupId={parseInt(String(id))}
                                groupName={group.name}
                                groupAvatar={(group as any).avatarUrl ?? undefined}
                            />
                        </TabsContent>

                        {/* MEMBERS TAB — Telegram-style profile cards */}
                        <TabsContent value="members" className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black tracking-tight">Circle Members</h2>
                                <span className="text-sm text-muted-foreground font-bold">{members.length} total</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {members.map((member) => {
                                    const initials = (member.user.displayName || member.user.username || "?").slice(0, 2).toUpperCase();
                                    const isAdmin = member.role === 'admin';
                                    const score = member.contributionScore ?? 0;
                                    return (
                                        <div
                                            key={member.user.id}
                                            className="relative group bg-card/60 backdrop-blur-md border border-border/40 rounded-[2rem] p-6 shadow-xl hover:shadow-2xl hover:border-primary/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                                            onClick={() => setProfileView(member)}
                                        >
                                            {/* Online dot */}
                                            <div className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />

                                            {/* Role badge */}
                                            {isAdmin && (
                                                <div className="absolute top-4 left-4">
                                                    <Badge className="rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20 font-black text-[9px] uppercase tracking-widest gap-1 px-2">
                                                        <Crown className="h-2.5 w-2.5" /> Admin
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="flex flex-col items-center text-center gap-3 pt-4">
                                                {/* Avatar */}
                                                <div className={`h-16 w-16 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg transition-all group-hover:rotate-3 ${isAdmin
                                                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                                                    : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
                                                    }`}>
                                                    {member.user.avatar
                                                        ? <img src={member.user.avatar} className="h-full w-full rounded-[1.25rem] object-cover" />
                                                        : initials
                                                    }
                                                </div>

                                                {/* Name + Bio */}
                                                <div>
                                                    <p className="font-black text-base leading-tight">{member.user.displayName || member.user.username}</p>
                                                    <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1">{member.user.bio || "Student"}</p>
                                                </div>

                                                {/* Contribution Score */}
                                                <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/15 rounded-full px-3 py-1">
                                                    <Zap className="h-3 w-3 text-primary" />
                                                    <span className="text-[11px] font-black text-primary">{score} pts</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Profile Dialog (click on a member card) */}
                            {profileView && (
                                <Dialog open={!!profileView} onOpenChange={() => setProfileView(null)}>
                                    <DialogContent className="rounded-[2.5rem] border-border/40 bg-card/95 backdrop-blur-2xl max-w-sm p-0 overflow-hidden">
                                        {/* Cover gradient */}
                                        <div className="h-24 bg-gradient-to-br from-primary/30 to-primary-foreground/20" />
                                        <div className="px-8 pb-8 -mt-10 space-y-4">
                                            <div className="flex items-end justify-between">
                                                <div className={`h-20 w-20 rounded-[1.5rem] border-4 border-background font-black text-2xl flex items-center justify-center shadow-xl ${profileView.role === 'admin'
                                                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                                                    : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
                                                    }`}>
                                                    {profileView.user.avatar
                                                        ? <img src={profileView.user.avatar} className="h-full w-full rounded-[1.25rem] object-cover" />
                                                        : (profileView.user.displayName || profileView.user.username || "?").slice(0, 2).toUpperCase()
                                                    }
                                                </div>
                                                <Button variant="ghost" size="icon" className="rounded-full mb-1" onClick={() => setProfileView(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-black">{profileView.user.displayName || profileView.user.username}</h3>
                                                    {profileView.role === 'admin' && <Crown className="h-4 w-4 text-amber-500" />}
                                                </div>
                                                <p className="text-sm text-muted-foreground">@{profileView.user.username}</p>
                                            </div>

                                            {profileView.user.bio && (
                                                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1">
                                                    "{profileView.user.bio}"
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-muted/40 rounded-2xl p-3 text-center">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Role</p>
                                                    <p className="font-black text-sm capitalize mt-0.5">{profileView.role}</p>
                                                </div>
                                                <div className="bg-muted/40 rounded-2xl p-3 text-center">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Score</p>
                                                    <p className="font-black text-sm mt-0.5 text-primary">{profileView.contributionScore ?? 0} pts</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-green-600">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                Online
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </TabsContent>



                        {/* Legacy Tasks Tab Removed - Replaced by Kanban */}
                        <TabsContent value="resources" className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tight">Group Knowledge Library</h2>
                                    <p className="text-muted-foreground font-medium">Shared PDFs, links, and study notes for all members.</p>
                                </div>
                                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="rounded-2xl gap-2 font-black shadow-lg shadow-primary/20"><Plus className="h-5 w-5" /> Share Material</Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black">Share with the Group</DialogTitle>
                                            <DialogDescription>Upload files or share important links with everyone.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Resource Title</Label>
                                                <Input
                                                    placeholder="e.g. Physics Chapter 3 Notes"
                                                    value={materialTitle}
                                                    onChange={e => setMaterialTitle(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Resource Type</Label>
                                                <Select value={materialType} onValueChange={setMaterialType}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pdf">PDF Document</SelectItem>
                                                        <SelectItem value="link">External Link</SelectItem>
                                                        <SelectItem value="note">Study Note</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>File Upload</Label>
                                                <Input
                                                    type="file"
                                                    onChange={e => setMaterialFile(e.target.files?.[0] || null)}
                                                    className="cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                className="w-full h-12 rounded-xl font-bold"
                                                onClick={() => shareMaterialMutation.mutate()}
                                                disabled={shareMaterialMutation.isPending || !materialTitle.trim()}
                                            >
                                                {shareMaterialMutation.isPending ? "SHARING..." : "SHARE WITH CIRCLE"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {resources.map(res => (
                                    <Card key={res.id} className="border-none shadow-xl rounded-[2.5rem] bg-card/60 backdrop-blur-sm group hover:scale-[1.02] transition-all duration-500 overflow-hidden min-h-[220px] flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity duration-700">
                                            <BookOpen className="h-24 w-24" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-xl font-black tracking-tight leading-tight">{res.title}</CardTitle>
                                            <CardDescription className="text-sm font-medium line-clamp-3 leading-relaxed opacity-70">{res.description || "Experimental study notes and deep dives."}</CardDescription>
                                        </CardHeader>
                                        <CardFooter className="pt-2 border-t border-border/20 mt-4 bg-muted/20">
                                            <div className="flex items-center justify-between w-full p-2">
                                                <Badge variant="outline" className="rounded-full font-black text-[10px] uppercase tracking-widest">{res.type}</Badge>
                                                <Button variant="ghost" className="rounded-xl h-10 px-4 font-black text-xs gap-2 text-primary hover:bg-primary/10" asChild>
                                                    <a
                                                        href={res.url || (res as any).filePath || "#"}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download={res.type === "file"}
                                                    >
                                                        {res.type === "file" ? "Download" : "Access"} <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="leaderboard" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <GroupLeaderboard groupId={parseInt(String(id))} hideHeader={true} />
                        </TabsContent>

                        <TabsContent value="quizzes" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <GroupQuizzes groupId={parseInt(String(id))} hideHeader={true} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
