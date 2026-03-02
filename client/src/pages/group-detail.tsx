import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Copy, Hash, Users, BookOpen, CheckSquare, Calendar, Shield, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { StudyGroup, User, Resource, Task } from "@shared/schema";

export default function GroupDetailPage() {
    const { id } = useParams();
    const { toast } = useToast();

    const { data: group, isLoading: groupLoading } = useQuery<StudyGroup>({
        queryKey: [`/api/groups/${id}`],
    });

    const { data: members = [], isLoading: membersLoading } = useQuery<(any & { user: User })[]>({
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
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!group) {
        return <div className="p-6 text-center text-muted-foreground">Group not found or you don't have access.</div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" /> {group.name}
                    </h1>
                    <p className="text-muted-foreground">{group.description || "No description provided."}</p>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40 shrink-0">
                    <Hash className="h-4 w-4 text-primary/70 shrink-0" />
                    <code className="text-sm font-mono font-medium truncate">{group.inviteCode}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyInviteCode}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Members List */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                        <Users className="h-5 w-5" /> Members
                    </h2>
                    {membersLoading ? (
                        <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                    ) : (
                        <div className="space-y-4">
                            {members.map(member => (
                                <div key={member.user.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {member.user.displayName ? member.user.displayName[0].toUpperCase() : member.user.username[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate">{member.user.displayName || member.user.username}</p>
                                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                                    </div>
                                    {member.role === 'admin' && <Shield className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resources & Tasks */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                            <BookOpen className="h-5 w-5" /> Shared Resources
                        </h2>
                        {resourcesLoading ? (
                            <Skeleton className="h-32 w-full" />
                        ) : resources.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm">No resources shared yet. Share some PDF notes!</div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                {resources.map(res => (
                                    <Card key={res.id} className="hover-elevate">
                                        <CardContent className="p-4 space-y-2">
                                            <p className="font-bold text-sm truncate">{res.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{res.description}</p>
                                            <Badge variant="outline" className="text-[10px]">{res.type}</Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                            <CheckSquare className="h-5 w-5" /> Group Tasks
                        </h2>
                        {tasksLoading ? (
                            <Skeleton className="h-32 w-full" />
                        ) : tasks.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-sm">No tasks assigned to this group yet.</div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                {tasks.map(task => (
                                    <Card key={task.id} className="hover-elevate">
                                        <CardContent className="p-4 space-y-2">
                                            <p className="font-bold text-sm truncate">{task.title}</p>
                                            <Badge className="text-[10px] capitalize" variant={task.status === "completed" ? "default" : "secondary"}>
                                                {task.status}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
