import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Sparkles,
    Minimize2,
    Maximize2,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from "react-markdown";

type Message = {
    role: "user" | "model";
    content: string;
};

export function StudyBuddy() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", content: "Hi! I'm **StudyBuddy**. I know your subjects and pending tasks. How can I help you study more effectively today?" }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, isOpen, isMinimized]);

    const chatMutation = useMutation({
        mutationFn: async (message: string) => {
            const res = await apiRequest("POST", "/api/ai/chat", {
                message,
                history: messages
            });
            return res.json();
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: "model", content: data.message }]);
        }
    });

    const handleSend = () => {
        if (!input.trim() || chatMutation.isPending) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setInput("");
        chatMutation.mutate(userMessage);
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/40 p-0 overflow-hidden group border-2 border-primary/20 bg-background/80 backdrop-blur-md"
            >
                <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                <Sparkles className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
            </Button>
        );
    }

    return (
        <Card className={`fixed right-6 bottom-6 w-80 sm:w-96 shadow-2xl border-primary/20 overflow-hidden transition-all duration-300 z-50 flex flex-col bg-card/70 backdrop-blur-xl ${isMinimized ? 'h-14' : 'h-[500px]'}`}>
            <CardHeader className="p-4 bg-primary/10 flex flex-row items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-2">
                        <BrainIcon className="h-4 w-4 text-primary" />
                        StudyBuddy AI
                    </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setIsOpen(false)}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardHeader>

            {!isMinimized && (
                <>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full px-4 py-4">
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${msg.role === "user" ? "bg-primary text-white border-primary/20" : "bg-muted border-border/50"}`}>
                                            {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                                        </div>
                                        <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                                            <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.role === "user"
                                                ? "bg-primary text-white"
                                                : "bg-muted/50 text-foreground border border-border/50"
                                                }`}>
                                                <div className="prose prose-xs dark:prose-invert">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {chatMutation.isPending && (
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="bg-muted/30 rounded-2xl px-4 py-2 flex items-center gap-2">
                                            <div className="flex gap-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-4 bg-muted/20 border-t border-border/40">
                        <div className="flex gap-2 w-full relative">
                            <Input
                                placeholder="Ask me anything..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                className="rounded-xl border-border/50 pr-10 focus-visible:ring-primary shadow-inner"
                            />
                            <Button
                                size="icon"
                                className="absolute right-1 top-1 h-8 w-8 rounded-lg shadow-lg shadow-primary/10"
                                onClick={handleSend}
                                disabled={!input.trim() || chatMutation.isPending}
                            >
                                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardFooter>
                </>
            )}
        </Card>
    );
}

function BrainIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
        </svg>
    )
}
