import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    UserPlus,
    Plus,
    Hash,
    Copy,
    Check,
    Shield,
    Calendar,
    ExternalLink,
    MessageSquare
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StudyGroup } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

function GroupCard({ group }: { group: StudyGroup }) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const copyInviteCode = () => {
        navigator.clipboard.writeText(group.inviteCode);
        setCopied(true);
        toast({
            title: "Invite Code Copied",
            description: "Share this code with your friends to join the group.",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="group hover-elevate overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300">
            <div className="h-1.5 w-full bg-primary/20" />
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                            {group.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                            {group.description || "No description provided."}
                        </CardDescription>
                    </div>
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary overflow-hidden">
                        {(group as any).avatarUrl ? (
                            <img src={(group as any).avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                        ) : (
                            <Users className="h-5 w-5" />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap overflow-hidden">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>Created on {new Date(group.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Hash className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <code className="text-xs font-mono font-medium truncate">
                            {group.inviteCode}
                        </code>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={copyInviteCode}
                        title="Copy Invite Code"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="w-full gap-2 rounded-lg" asChild>
                        <a href={`/groups/${group.id}`}>
                            View Group <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function GroupsPage() {
    const { toast } = useToast();
    const [inviteCode, setInviteCode] = useState("");
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDesc, setNewGroupDesc] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const { data: groups = [], isLoading } = useQuery<StudyGroup[]>({
        queryKey: ["/api/groups"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const res = await apiRequest("POST", "/api/groups", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
            toast({ title: "Group Created", description: "Your new study group is ready!" });
            setNewGroupName("");
            setNewGroupDesc("");
            setIsCreating(false);
        },
        onError: (err: Error) => {
            toast({ title: "Failed to create group", description: err.message, variant: "destructive" });
        }
    });

    const joinMutation = useMutation({
        mutationFn: async (code: string) => {
            const res = await apiRequest("POST", "/api/groups/join", { inviteCode: code });
            return res.json();
        },
        onSuccess: (group) => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
            toast({ title: "Joined Group", description: `You have successfully joined ${group.name}!` });
            setInviteCode("");
        },
        onError: (err: Error) => {
            toast({ title: "Failed to join group", description: err.message, variant: "destructive" });
        }
    });

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight" data-testid="text-groups-title">
                        Study Groups
                    </h1>
                    <p className="text-muted-foreground">Collaborate with your peers, share resources, and track progress together.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Invite Code (e.g. ABCD-1234)"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="w-full sm:w-48 bg-card border-border/50 rounded-lg h-10"
                        />
                        <Button
                            variant="secondary"
                            className="h-10 px-4 rounded-lg"
                            onClick={() => joinMutation.mutate(inviteCode)}
                            disabled={!inviteCode || joinMutation.isPending}
                        >
                            <UserPlus className="mr-2 h-4 w-4" /> Join
                        </Button>
                    </div>
                    <Button
                        className="h-10 px-4 rounded-lg shadow-lg shadow-primary/20"
                        onClick={() => setIsCreating(!isCreating)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create Group
                    </Button>
                </div>
            </div>

            {isCreating && (
                <Card className="animate-in slide-in-from-top-4 duration-300 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Create New Study Group</CardTitle>
                        <CardDescription>Start a new collaborative space for your subject or project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Group Name</label>
                                <Input
                                    placeholder="e.g. advanced Calculus Study Squad"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="bg-background rounded-lg border-border/50"
                                />
                            </div>
                            <div className="space-y-2 text-right self-end">
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                    <Button
                                        className="rounded-lg shadow-md shadow-primary/10"
                                        onClick={() => createMutation.mutate({ name: newGroupName, description: newGroupDesc })}
                                        disabled={!newGroupName || createMutation.isPending}
                                    >
                                        Confirm Creation
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Input
                                placeholder="Briefly describe what this group is for..."
                                value={newGroupDesc}
                                onChange={(e) => setNewGroupDesc(e.target.value)}
                                className="bg-background rounded-lg border-border/50"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/20 border border-dashed border-border rounded-3xl">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">No Groups Found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto px-4">
                            You haven't joined or created any study groups yet. Start by creating one or enter an invite code from a peer.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsCreating(true)}>
                            Create Your First Group
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>
            )}
        </div>
    );
}
