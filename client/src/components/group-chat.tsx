import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, User, Sparkles, XCircle, Paperclip, Smile, MoreVertical, Edit2, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { GroupMessage } from "@shared/schema";

type WSMessage = GroupMessage & { user: { username: string, avatar: string | null } };

export function GroupChat({ groupId, groupName = "Group Discussion", groupAvatar }: {
    groupId: number;
    groupName?: string;
    groupAvatar?: string;
}) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [replyTo, setReplyTo] = useState<WSMessage | null>(null);
    const [editingMsg, setEditingMsg] = useState<WSMessage | null>(null);
    const [editContent, setEditContent] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const [liveMessages, setLiveMessages] = useState<WSMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial fetch of messages
    const { data: initialMessages = [], isLoading } = useQuery<WSMessage[]>({
        queryKey: [`/api/groups/${groupId}/messages`],
        refetchOnWindowFocus: false,
        staleTime: Infinity
    });

    // Populate live messages when initial data loads
    useEffect(() => {
        if (initialMessages.length > 0) {
            setLiveMessages(initialMessages);
        }
    }, [initialMessages]);

    // WebSocket Connection Management
    useEffect(() => {
        if (!currentUser) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "init", userId: currentUser.id }));
            ws.send(JSON.stringify({ type: "join_group", groupId }));
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.event === "new_message") {
                    setLiveMessages(prev => {
                        if (prev.some(m => m.id === payload.data.id)) return prev;
                        return [...prev, payload.data];
                    });
                    scrollToBottom();
                }

                if (payload.event === "message_edited") {
                    setLiveMessages(prev =>
                        prev.map(m => m.id === payload.data.id
                            ? { ...m, content: payload.data.content, isEdited: 1 }
                            : m
                        )
                    );
                }

                if (payload.event === "message_deleted") {
                    setLiveMessages(prev =>
                        prev.map(m => m.id === payload.data.id
                            ? { ...m, isDeleted: 1, content: "" }
                            : m
                        )
                    );
                }

                if (payload.event === "typing") {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        if (payload.data.isTyping) {
                            newSet.add(payload.data.username);
                        } else {
                            newSet.delete(payload.data.username);
                        }
                        return newSet;
                    });
                }
            } catch (err) {
                console.error("WS Message Error:", err);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "leave_group", groupId }));
                ws.close();
            }
        };
    }, [groupId, currentUser]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    }, []);

    useEffect(() => {
        if (!isLoading) scrollToBottom();
    }, [isLoading, liveMessages.length, scrollToBottom]);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);

        if (wsRef.current?.readyState === WebSocket.OPEN && currentUser) {
            wsRef.current.send(JSON.stringify({
                type: "typing_start",
                groupId,
                username: currentUser.username
            }));

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: "typing_stop",
                        groupId,
                        username: currentUser.username
                    }));
                }
            }, 2000);
        }
    };

    // SEND message
    const sendMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await apiRequest("POST", `/api/groups/${groupId}/messages`, {
                content,
                replyToId: replyTo?.id
            });
            return res.json();
        },
        onSuccess: () => {
            setContent("");
            setReplyTo(null);
            if (wsRef.current?.readyState === WebSocket.OPEN && currentUser) {
                wsRef.current.send(JSON.stringify({ type: "typing_stop", groupId, username: currentUser.username }));
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }
        },
        onError: (err: Error) => {
            toast({ title: "Failed to send", description: err.message, variant: "destructive" });
        }
    });

    // EDIT message
    const editMutation = useMutation({
        mutationFn: async ({ messageId, content }: { messageId: number, content: string }) => {
            const res = await apiRequest("PATCH", `/api/groups/${groupId}/messages/${messageId}`, { content });
            return res.json();
        },
        onSuccess: (updated) => {
            // Optimistically update local state in case WS is slow
            setLiveMessages(prev =>
                prev.map(m => m.id === updated.id ? { ...m, content: updated.content, isEdited: 1 } : m)
            );
            setEditingMsg(null);
            setEditContent("");
            toast({ title: "Message edited" });
        },
        onError: (err: Error) => {
            toast({ title: "Edit failed", description: err.message, variant: "destructive" });
        }
    });

    // DELETE message
    const deleteMutation = useMutation({
        mutationFn: async (messageId: number) => {
            await apiRequest("DELETE", `/api/groups/${groupId}/messages/${messageId}`);
            return messageId;
        },
        onSuccess: (deletedId) => {
            setLiveMessages(prev =>
                prev.map(m => m.id === deletedId ? { ...m, isDeleted: 1, content: "" } : m)
            );
            toast({ title: "Message deleted" });
        },
        onError: (err: Error) => {
            toast({ title: "Delete failed", description: err.message, variant: "destructive" });
        }
    });

    const triggerSend = () => {
        if (!content.trim() || sendMutation.isPending) return;
        sendMutation.mutate(content);
    };

    const startEdit = (msg: WSMessage) => {
        setEditingMsg(msg);
        setEditContent(msg.content);
    };

    const confirmEdit = () => {
        if (!editingMsg || !editContent.trim()) return;
        editMutation.mutate({ messageId: editingMsg.id, content: editContent });
    };

    const cancelEdit = () => {
        setEditingMsg(null);
        setEditContent("");
    };

    // Find the text of the replied-to message
    const getReplyPreview = (replyToId: number | null) => {
        if (!replyToId) return null;
        const original = liveMessages.find(m => m.id === replyToId);
        if (!original) return "Replying...";
        return `${original.user.username}: "${original.content.slice(0, 50)}${original.content.length > 50 ? "..." : ""}"`;
    };

    return (
        <div className="flex flex-col h-[650px] border border-border/50 rounded-3xl overflow-hidden bg-card/60 backdrop-blur-xl shadow-2xl relative">
            {/* Top Bar */}
            <div className="px-5 py-3 bg-card/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center text-white font-black text-xs shadow-md overflow-hidden shrink-0">
                        {groupAvatar ? (
                            <img src={groupAvatar} alt={groupName} className="h-full w-full object-cover" />
                        ) : (
                            <span>{(groupName?.[0] ?? "G").toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-tight">{groupName}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                            {liveMessages.length} Messages
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-[pulse_2s_ease-in-out_infinite]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">Live</span>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-4 pb-4">
                    {liveMessages.length === 0 && !isLoading && (
                        <div className="text-center py-20 transition-all duration-700 animate-in fade-in zoom-in-95">
                            <Sparkles className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground max-w-[200px] mx-auto font-medium">Start the conversation! Share ideas or ask for help.</p>
                        </div>
                    )}
                    {liveMessages.map((msg, index) => {
                        const isMe = msg.userId === currentUser?.id;
                        const showAvatar = index === liveMessages.length - 1 || liveMessages[index + 1]?.userId !== msg.userId;
                        const isEdited = (msg as any).isEdited === 1;
                        const isDeleted = (msg as any).isDeleted === 1;
                        const isBeingEdited = editingMsg?.id === msg.id;

                        // Deleted message
                        if (isDeleted) {
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div className="p-2.5 border border-border/30 rounded-2xl text-[11px] italic text-muted-foreground/60 bg-muted/10">
                                        🚫 This message was deleted
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} animate-in slide-in-from-bottom-2 duration-300 group`}>
                                {/* Avatar */}
                                <div className="w-8 shrink-0 flex flex-col justify-end">
                                    {showAvatar && !isMe && (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border/40 overflow-hidden shadow-sm">
                                            {msg.user.avatar ? (
                                                <img src={msg.user.avatar} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`max-w-[70%] space-y-1 flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    {showAvatar && !isMe && (
                                        <p className="text-[11px] font-bold text-muted-foreground pl-1 -mb-1">{msg.user.username}</p>
                                    )}

                                    <div className="relative flex items-center group/bubble">
                                        {/* Quick reply button for OTHER people's messages */}
                                        {!isMe && (
                                            <div className="transition-opacity absolute right-full mr-1 flex items-center gap-0.5">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={() => setReplyTo(msg)}>
                                                    <Send className="h-3 w-3 rotate-180 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        )}

                                        <div className="flex flex-col">
                                            {/* Reply context above bubble */}
                                            {msg.replyToId && (
                                                <div className={`text-[10px] px-3 py-1.5 bg-muted/50 border-l-2 border-primary/40 rounded-t-xl italic opacity-80 mb-[-4px] z-0 pointer-events-none truncate max-w-[220px] ${isMe ? "self-end bg-primary/10 border-primary/50" : "self-start"}`}>
                                                    {getReplyPreview(msg.replyToId) || "Replying..."}
                                                </div>
                                            )}

                                            {/* Edit mode inline */}
                                            {isBeingEdited ? (
                                                <div className="flex items-center gap-2 bg-card border-2 border-primary/40 rounded-2xl p-2 shadow-lg animate-in zoom-in-95 duration-200">
                                                    <Input
                                                        className="h-8 text-sm rounded-lg border-none bg-transparent focus-visible:ring-0"
                                                        value={editContent}
                                                        onChange={e => setEditContent(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter") confirmEdit();
                                                            if (e.key === "Escape") cancelEdit();
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button size="icon" className="h-7 w-7 rounded-lg bg-primary" onClick={confirmEdit} disabled={editMutation.isPending}>
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={cancelEdit}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                /* Normal bubble */
                                                <div className={`
                                                    relative z-10 p-3 text-sm shadow-sm transition-all
                                                    ${isMe
                                                        ? "bg-primary text-white rounded-[1.25rem] rounded-br-[0.25rem]"
                                                        : "bg-muted/50 border border-border/40 rounded-[1.25rem] rounded-bl-[0.25rem]"
                                                    }
                                                `}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <div className={`flex items-center gap-1.5 mt-1 justify-end ${isMe ? "text-white/70" : "text-muted-foreground/60"}`}>
                                                        {isEdited && <span className="text-[9px] italic">edited</span>}
                                                        <span className="text-[9px] font-medium tracking-tight">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions popover for MY messages (Reply · Edit · Delete) */}
                                        {isMe && !isBeingEdited && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full transition-opacity absolute left-full ml-1 flex">
                                                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-36 p-1 rounded-xl" side="right">
                                                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2" onClick={() => setReplyTo(msg)}>
                                                        <Send className="h-3 w-3 rotate-180" /> Reply
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2" onClick={() => startEdit(msg)}>
                                                        <Edit2 className="h-3 w-3" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-start text-xs h-8 gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        onClick={() => deleteMutation.mutate(msg.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-3 w-3" /> Delete
                                                    </Button>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.size > 0 && (
                        <div className="flex gap-3 animate-in fade-in duration-300">
                            <div className="w-8 shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-full border border-border/30">
                                <div className="flex gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {Array.from(typingUsers).join(", ")} {typingUsers.size > 1 ? "are" : "is"} typing
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className={`p-4 bg-card/80 backdrop-blur-md border-t border-border/40 transition-all ${replyTo ? "bg-primary/5" : ""}`}>
                {replyTo && (
                    <div className="flex items-center justify-between px-4 py-2 mb-3 bg-background/90 rounded-xl border border-primary/20 animate-in slide-in-from-bottom-2 shadow-sm">
                        <div className="flex flex-col overflow-hidden border-l-2 border-primary pl-2">
                            <span className="text-[10px] font-bold text-primary">Replying to {replyTo.user.username}</span>
                            <span className="text-xs text-muted-foreground truncate">{replyTo.content}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted shrink-0" onClick={() => setReplyTo(null)}>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <div className="flex items-end gap-2 relative">
                    <Button variant="ghost" size="icon" className="h-[44px] w-[44px] rounded-full shrink-0 text-muted-foreground hover:text-foreground">
                        <Paperclip className="h-5 w-5" />
                    </Button>

                    <div className="relative flex-1">
                        <Input
                            placeholder={replyTo ? `Reply to @${replyTo.user.username}...` : "Write a message..."}
                            className="rounded-3xl bg-muted/30 border-border/50 min-h-[44px] text-sm shadow-inner focus-visible:ring-primary/30 pl-4 pr-10"
                            value={content}
                            onChange={handleTyping}
                            onKeyDown={(e) => e.key === "Enter" && triggerSend()}
                        />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                            <Smile className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        size="icon"
                        className={`h-[44px] w-[44px] rounded-full shrink-0 transition-all duration-300 shadow-md ${content.trim() ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-primary/30" : "bg-muted text-muted-foreground"}`}
                        onClick={triggerSend}
                        disabled={!content.trim() || sendMutation.isPending}
                    >
                        <Send className="h-5 w-5 ml-0.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
