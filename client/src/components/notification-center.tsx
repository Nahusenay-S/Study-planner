import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Bell,
    Check,
    Clock,
    Info,
    AlertCircle,
    CheckCircle2,
    Trash2,
    BellRing,
    Copy,
    UserPlus,
    Loader2,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [_, setLocation] = useLocation();

    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ["/api/notifications"],
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const unreadCount = notifications.filter(n => Number(n.isRead) === 0).length;

    const { toast } = useToast();

    const markReadMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("PATCH", `/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/notifications/read-all");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            toast({ title: "All caught up!", description: "All notifications marked as read." });
        },
    });

    const joinGroupMutation = useMutation({
        mutationFn: async (code: string) => {
            const res = await apiRequest("POST", "/api/groups/join", { inviteCode: code });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
            toast({
                title: "Successfully Joined!",
                description: `You are now a member of ${data.name}.`,
            });
        },
        onError: (err: Error) => {
            toast({
                title: "Join Failed",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const clearHistoryMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", "/api/notifications");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            toast({ title: "History Cleared", description: "All notifications have been removed." });
        },
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case "deadline":
            case "urgent": return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "group": return <UserPlus className="h-4 w-4 text-blue-500" />;
            case "resource": case "info":
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group">
                    <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold border-2 border-background animate-pulse"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl" align="end">
                <div className="flex items-center justify-between p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Notifications</h4>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending}
                            >
                                {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 px-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => clearHistoryMutation.mutate()}
                                title="Clear History"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <Separator className="bg-border/40" />
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                                        <div className="h-3 w-full bg-muted animate-pulse rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
                            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                <Bell className="h-6 w-6 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No new updates</p>
                            <p className="text-[10px] text-muted-foreground">You're all caught up! Check back later for team updates.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/20">
                            {notifications.map((n) => {
                                // Simple regex to find invite codes (10 chars, typically nanoid)
                                // In this app nanoid(10) is used.
                                const codeMatch = n.message.match(/[A-Za-z0-9_-]{10,21}/);
                                const inviteCode = codeMatch ? codeMatch[0] : null;

                                return (
                                    <div
                                        key={n.id}
                                        className={`flex gap-3 p-4 transition-colors cursor-pointer relative overflow-hidden group ${Number(n.isRead) === 0 ? "bg-primary/5" : "hover:bg-muted/30"}`}
                                        onClick={() => {
                                            if (Number(n.isRead) === 0) markReadMutation.mutate(n.id);
                                            switch (n.type) {
                                                case "group":
                                                    setLocation("/groups");
                                                    break;
                                                case "deadline":
                                                case "urgent":
                                                case "task":
                                                    setLocation("/kanban");
                                                    break;
                                                case "resource":
                                                    setLocation("/resources");
                                                    break;
                                            }
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                                        <div className="space-y-1 min-w-0 pr-4 flex-1">
                                            <p className={`text-xs font-bold leading-tight ${!n.isRead ? 'text-primary' : ''}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                {n.message}
                                            </p>

                                            {inviteCode && n.type === "group" && (
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-[10px] font-black gap-1.5 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            joinGroupMutation.mutate(inviteCode);
                                                            if (!n.isRead) markReadMutation.mutate(n.id);
                                                        }}
                                                        disabled={joinGroupMutation.isPending}
                                                    >
                                                        {joinGroupMutation.isPending ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <UserPlus className="h-3 w-3" />
                                                        )}
                                                        JOIN GROUP
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 w-7 p-0 rounded-md border-primary/20 text-primary hover:bg-primary/5"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(inviteCode);
                                                            toast({ title: "Code Copied" });
                                                        }}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5 pt-1">
                                                <Clock className="h-3 w-3 text-muted-foreground/40" />
                                                <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                                                    {formatDistanceToNow(new Date(n.createdAt))} ago
                                                </span>
                                            </div>
                                        </div>
                                        {!n.isRead && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_primary]" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
                {/* Using bottom section to show sorting info or empty space depending on design */}
                <div className="h-2 bg-gradient-to-t from-background/50 to-transparent" />
            </PopoverContent>
        </Popover>
    );
}
