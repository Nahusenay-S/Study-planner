import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Copy, Hash, Users, BookOpen, CheckSquare, MessageSquare, Trophy, Swords, Shield, ExternalLink, Settings, Plus, LayoutGrid, UserPlus, Mail, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GroupChat } from "@/components/group-chat";
import { GroupLeaderboard } from "@/components/group-leaderboard";
import { GroupQuizzes } from "@/components/group-quizzes";
import type { StudyGroup, User as UserType, Resource, Task } from "@shared/schema";

export default function GroupDetailPage() {
    const { id } = useParams();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");

    const { data: group, isLoading: groupLoading } = useQuery<StudyGroup>({
        queryKey: [`/api/groups/${id}`],
    });

    const [inviteIdentifier, setInviteIdentifier] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

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
                            <div className="h-20 w-20 flex items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary to-primary-foreground shadow-2xl shadow-primary/30 shrink-0 group hover:rotate-6 transition-transform duration-500">
                                <Users className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
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
                                        <span>INVITE AGENT</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem] border-primary/20 bg-card/90 backdrop-blur-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black tracking-tight">ENLIST NEW AGENT</DialogTitle>
                                        <DialogDescription className="text-muted-foreground font-medium">Send a direct intercept to another student to join this group.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="identifier">Username or Email</Label>
                                            <div className="relative">
                                                <Input
                                                    id="identifier"
                                                    value={inviteIdentifier}
                                                    onChange={(e) => setInviteIdentifier(e.target.value)}
                                                    placeholder="e.g. recruit_01 or recruit@domain.com"
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
                                            {inviting ? "TRANSMITTING..." : "SEND INVITATION"}
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
                            <Button size="icon" variant="outline" className="h-12 w-12 rounded-2xl border-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
                        <TabsList className="h-14 p-1.5 bg-muted/40 backdrop-blur-md border border-border/40 rounded-[1.25rem] w-full md:w-auto overflow-x-auto scrollbar-none gap-2">
                            <TabsTrigger value="overview" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <LayoutGrid className="h-4 w-4" /> Overview
                            </TabsTrigger>
                            <TabsTrigger value="chat" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <MessageSquare className="h-4 w-4" /> Discussion
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <CheckSquare className="h-4 w-4" /> Tasks
                            </TabsTrigger>
                            <TabsTrigger value="resources" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <BookOpen className="h-4 w-4" /> Library
                            </TabsTrigger>
                            <TabsTrigger value="leaderboard" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <Trophy className="h-4 w-4" /> Rankings
                            </TabsTrigger>
                            <TabsTrigger value="quizzes" className="rounded-xl px-6 font-black text-sm data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                                <Swords className="h-4 w-4" /> Battles
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-32">
                <Tabs value={activeTab} className="w-full">
                    <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-8">
                                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-primary to-primary-foreground text-white group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                                        <Trophy className="h-32 w-32" />
                                    </div>
                                    <CardHeader className="relative z-10">
                                        <CardTitle className="text-xl font-black">Group Excellence</CardTitle>
                                        <CardDescription className="text-primary-foreground/70 font-bold">Consolidated performance metrics.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 relative z-10 pb-10">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg Streak</p>
                                                <p className="text-2xl font-black">12 Days</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Resources</p>
                                                <p className="text-2xl font-black">{resources.length}</p>
                                            </div>
                                        </div>
                                        <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-[1.25rem] font-black py-6 shadow-xl shadow-black/20">View Detailed Reports</Button>
                                    </CardContent>
                                </Card>

                                <div className="space-y-6">
                                    <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">Member Roster ({members.length})</h2>
                                    <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] border border-border/40 p-6 space-y-4 shadow-xl">
                                        {members.map(member => (
                                            <div key={member.user.id} className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-300 group">
                                                <div className="h-12 w-12 shrink-0 rounded-2xl bg-muted/60 flex items-center justify-center font-black text-primary border border-border/40 shadow-sm group-hover:rotate-6 transition-all">
                                                    {member.user.displayName ? member.user.displayName[0].toUpperCase() : member.user.username[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-sm tracking-tight text-foreground truncate">{member.user.displayName || member.user.username}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{member.role}</p>
                                                        {member.user.bio && <span className="h-1 w-1 rounded-full bg-border" />}
                                                        {member.user.bio && <p className="text-[10px] text-muted-foreground truncate italic">"{member.user.bio}"</p>}
                                                    </div>
                                                </div>
                                                {member.role === 'admin' && <Badge variant="secondary" className="h-6 w-6 rounded-lg p-0 flex items-center justify-center bg-amber-500/10 text-amber-600 border-none shadow-sm"><Shield className="h-3.5 w-3.5" /></Badge>}
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
                                        <Button variant="ghost" className="text-xs font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary" onClick={() => setActiveTab("tasks")}>Task Board</Button>
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

                    <TabsContent value="chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <GroupChat groupId={parseInt(String(id))} />
                    </TabsContent>

                    <TabsContent value="leaderboard" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <GroupLeaderboard groupId={parseInt(String(id))} />
                    </TabsContent>

                    <TabsContent value="quizzes" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <GroupQuizzes groupId={parseInt(String(id))} />
                    </TabsContent>

                    <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black tracking-tight">Group Task Board</h2>
                            <Button className="rounded-2xl gap-2 font-black"><Plus className="h-5 w-5" /> Add Group Task</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {["To Do", "In Progress", "Completed"].map(status => (
                                <div key={status} className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{status}</h3>
                                        <Badge variant="outline" className="rounded-full font-black opacity-30">{tasks.filter(t => t.status.toLowerCase() === status.toLowerCase().replace(" ", "")).length}</Badge>
                                    </div>
                                    <div className="space-y-4">
                                        {tasks.filter(t => t.status.toLowerCase() === status.toLowerCase().replace(" ", "")).map(task => (
                                            <Card key={task.id} className="border-none shadow-xl rounded-[1.5rem] bg-card/60 backdrop-blur-sm group hover:scale-[1.03] transition-all">
                                                <CardContent className="p-5 space-y-4">
                                                    <p className="font-bold text-sm leading-tight">{task.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate opacity-70">Assigned by Admin</p>
                                                    <div className="flex items-center justify-between pt-2">
                                                        <Badge variant="secondary" className="rounded-full text-[9px] font-black">{task.priority}</Badge>
                                                        <div className="h-7 w-7 rounded-full bg-muted/60 border border-border/40 flex items-center justify-center"><Users className="h-3 w-3 opacity-40" /></div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="resources" className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black tracking-tight">Group Knowledge Library</h2>
                                <p className="text-muted-foreground font-medium">Shared PDFs, links, and study notes for all members.</p>
                            </div>
                            <Button className="rounded-2xl gap-2 font-black shadow-lg shadow-primary/20"><Plus className="h-5 w-5" /> Share Material</Button>
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
                                            <Button variant="ghost" className="rounded-xl h-10 px-4 font-black text-xs gap-2" asChild>
                                                <a href={res.url || "#"} target="_blank">Access <ExternalLink className="h-3.5 w-3.5" /></a>
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
