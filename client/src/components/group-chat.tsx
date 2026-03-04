import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, User, Sparkles, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { GroupMessage } from "@shared/schema";

export function GroupChat({ groupId }: { groupId: number }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [replyTo, setReplyTo] = useState<(GroupMessage & { user: { username: string } }) | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: messages = [], isLoading } = useQuery<(GroupMessage & { user: { username: string, avatar: string | null } })[]>({
        queryKey: [`/api/groups/${groupId}/messages`],
        refetchInterval: 3000, // Poll every 3s for chat feel
    });

    const mutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await apiRequest("POST", `/api/groups/${groupId}/messages`, { content });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/messages`] });
            setContent("");
            setReplyTo(null);
        },
        onError: (err: Error) => {
            toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!content.trim() || mutation.isPending) return;
        mutation.mutate(content, {
            onSuccess: () => {
                // The mutation logic in mutation definition already handles this but we can adds extra here if needed.
            }
        });
    };

    const handleReplyMutation = async (content: string) => {
        const res = await apiRequest("POST", `/api/groups/${groupId}/messages`, {
            content,
            replyToId: replyTo?.id
        });
        return res.json();
    };

    // Override the mutation function to handle replyToId
    const sendMutation = useMutation({
        mutationFn: handleReplyMutation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/messages`] });
            setContent("");
            setReplyTo(null);
        },
        onError: (err: Error) => {
            toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
        }
    });

    const triggerSend = () => {
        if (!content.trim() || sendMutation.isPending) return;
        sendMutation.mutate(content);
    };

    return (
        <div className="flex flex-col h-[600px] border border-border/50 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-2xl">
            <div className="p-4 bg-primary/10 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs">SF</div>
                    <h3 className="font-bold text-sm">Group Discussion</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Feed</span>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && !isLoading && (
                        <div className="text-center py-20 transition-all duration-700 animate-in fade-in zoom-in-95">
                            <Sparkles className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground max-w-[200px] mx-auto italic font-medium">Start the conversation! Share ideas or ask for help.</p>
                        </div>
                    )}
                    {messages.slice().reverse().map((msg) => {
                        const isMe = msg.userId === currentUser?.id;
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} animate-in slide-in-from-bottom-2 duration-300 group`}>
                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${isMe ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border/40"}`}>
                                    {msg.user.avatar ? (
                                        <img src={msg.user.avatar} className="h-full w-full rounded-xl object-cover shadow-sm" />
                                    ) : (
                                        <User className="h-4 w-4" />
                                    )}
                                </div>
                                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                                    <div className="flex items-center gap-2 px-1">
                                        {!isMe && <p className="text-[10px] font-black text-muted-foreground uppercase">{msg.user.username}</p>}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                                            onClick={() => setReplyTo(msg)}
                                        >
                                            <Send className="h-3 w-3 rotate-180" />
                                        </Button>
                                    </div>

                                    {msg.replyToId && (
                                        <div className={`text-[10px] px-3 py-1 bg-muted/40 border-l-2 border-primary/30 rounded-t-lg italic opacity-70 mb--2 pointer-events-none truncate max-w-[200px] ${isMe ? "bg-white/10" : ""}`}>
                                            Replying to...
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-2xl text-xs shadow-sm shadow-black/5 transition-all ${isMe ? "bg-primary text-white rounded-tr-none hover:bg-primary/95" : "bg-card border border-border/30 rounded-tl-none hover:border-primary/20"}`}>
                                        {msg.content}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground/60 px-1 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className={`p-4 bg-muted/30 border-t border-border/40 space-y-3 transition-all ${replyTo ? "bg-primary/5" : ""}`}>
                {replyTo && (
                    <div className="flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur rounded-xl border border-primary/20 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <p className="text-[10px] font-bold text-muted-foreground truncate">
                                Replying to <span className="text-primary">@{replyTo.user.username}</span>: "{replyTo.content}"
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={() => setReplyTo(null)}>
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <div className="flex gap-2 relative">
                    <Input
                        placeholder={replyTo ? `Reply to @${replyTo.user.username}...` : "Type a message..."}
                        className="rounded-2xl bg-background border-border/50 h-11 text-sm shadow-inner focus-visible:ring-primary/40 pr-12"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && triggerSend()}
                    />
                    <Button
                        size="icon"
                        className="absolute right-1 top-1 h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg shadow-primary/20"
                        onClick={triggerSend}
                        disabled={!content.trim() || sendMutation.isPending}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
