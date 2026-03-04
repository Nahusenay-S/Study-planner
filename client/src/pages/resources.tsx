import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertResourceSchema } from "@shared/schema";
import {
    FileText,
    Link as LinkIcon,
    StickyNote,
    MessageSquare,
    Trash2,
    Plus,
    Filter,
    Search,
    Download,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    User,
    Users,
    Clock,
    Send,
    Lock,
    Globe,
    Sparkles,
    Brain,
    HelpCircle,
    CheckCircle2,
    XCircle,
    Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import type { Resource, Subject, StudyGroup, Comment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

function CommentSection({ resourceId }: { resourceId: number }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState("");

    const { data: comments = [], isLoading } = useQuery<(Comment & { user: { id: number, username: string, displayName: string | null, avatar: string | null } })[]>({
        queryKey: [`/api/resources/${resourceId}/comments`],
    });

    const mutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await apiRequest("POST", `/api/resources/${resourceId}/comments`, { content });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}/comments`] });
            setContent("");
        },
        onError: (err: Error) => {
            toast({ title: "Comment failed", description: err.message, variant: "destructive" });
        }
    });

    if (isLoading) return <Skeleton className="h-20 w-full" />;

    return (
        <div className="space-y-4 pt-4 border-t border-border/40 mt-4">
            <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm bg-muted/30 p-2.5 rounded-xl border border-border/20">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            {comment.user.avatar ? (
                                <img src={comment.user.avatar} className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <User className="h-4 w-4 text-primary" />
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{comment.user.displayName || comment.user.username}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-foreground/80 leading-relaxed">{comment.content}</p>
                        </div>
                    </div>
                ))}
                {comments.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4 italic">No comments yet. Start the conversation!</p>
                )}
            </div>

            <div className="flex gap-2 relative group-focus-within:shadow-lg transition-all duration-300">
                <Input
                    placeholder="Write a comment..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="rounded-xl bg-card border-border/50 h-9 text-xs pr-10"
                    onKeyDown={(e) => e.key === "Enter" && content && mutation.mutate(content)}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0 h-9 w-9 text-primary hover:bg-transparent"
                    onClick={() => mutation.mutate(content)}
                    disabled={!content || mutation.isPending}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function QuizSection({ resourceId, title }: { resourceId: number, title: string }) {
    const { toast } = useToast();
    const [quiz, setQuiz] = useState<{ question: string, options: string[], correctIndex: number }[] | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [showResults, setShowResults] = useState(false);

    const quizMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/resources/${resourceId}/quiz`);
            return res.json();
        },
        onSuccess: (data) => {
            setQuiz(data);
            setSelectedAnswers(new Array(data.length).fill(-1));
            setShowResults(false);
        },
        onError: (err: Error) => {
            toast({ title: "Quiz generation failed", description: err.message, variant: "destructive" });
        }
    });

    if (quizMutation.isPending) return (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm font-medium animate-pulse">Generating your custom quiz...</p>
        </div>
    );

    if (!quiz) return (
        <div className="flex flex-col items-center justify-center py-6 border-t border-border/40 mt-4">
            <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary" onClick={() => quizMutation.mutate()}>
                <HelpCircle className="h-4 w-4" /> Generate Practice Quiz
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold">5 MCQs from your resource</p>
        </div>
    );

    return (
        <div className="space-y-4 pt-4 border-t border-border/40 mt-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Practice Quiz
                </h4>
                {showResults && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setQuiz(null); quizMutation.mutate(); }}>
                        Retake Quiz
                    </Button>
                )}
            </div>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {quiz.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-3">
                        <p className="text-sm font-semibold">{qIdx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, oIdx) => {
                                const isSelected = selectedAnswers[qIdx] === oIdx;
                                const isCorrect = q.correctIndex === oIdx;
                                return (
                                    <button
                                        key={oIdx}
                                        disabled={showResults}
                                        onClick={() => {
                                            const newAns = [...selectedAnswers];
                                            newAns[qIdx] = oIdx;
                                            setSelectedAnswers(newAns);
                                        }}
                                        className={`text-left text-xs p-3 rounded-xl border transition-all ${showResults
                                            ? isCorrect
                                                ? "bg-green-500/20 border-green-500/50"
                                                : isSelected
                                                    ? "bg-red-500/20 border-red-500/50"
                                                    : "bg-muted/30 border-border/30 opacity-60"
                                            : isSelected
                                                ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20"
                                                : "bg-card border-border/50 hover:border-primary/30"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{opt}</span>
                                            {showResults && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                            {showResults && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {!showResults && (
                <Button
                    className="w-full rounded-xl"
                    disabled={selectedAnswers.includes(-1)}
                    onClick={() => setShowResults(true)}
                >
                    Submit Quiz
                </Button>
            )}

            {showResults && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-in zoom-in-95">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quiz Results</span>
                        <Badge variant="outline" className="bg-background font-mono text-primary border-primary/30">
                            {selectedAnswers.reduce((acc, curr, idx) => acc + (curr === quiz[idx].correctIndex ? 1 : 0), 0)} / {quiz.length} Correct
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedAnswers.reduce((acc, curr, idx) => acc + (curr === quiz[idx].correctIndex ? 1 : 0), 0) === quiz.length
                            ? "Perfect! You've mastered this resource content. 🏆"
                            : "Great effort! Review the incorrect answers to strengthen your knowledge."}
                    </p>
                </div>
            )}
        </div>
    );
}

function AddResourceDialog({ open, onOpenChange, subjects, groups }: { open: boolean, onOpenChange: (open: boolean) => void, subjects: Subject[], groups: StudyGroup[] }) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const form = useForm({
        resolver: zodResolver(insertResourceSchema),
        defaultValues: {
            title: "",
            description: "",
            type: "link",
            url: "",
            subjectId: null,
            groupId: null,
            isPublic: 1,
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const formData = new FormData();

            // Core fields
            formData.append("title", data.title);
            formData.append("type", data.type);
            formData.append("isPublic", String(data.isPublic));

            if (data.description) formData.append("description", data.description);
            if (data.url) formData.append("url", data.url);

            // Numeric fields need careful handling from the Select/Input values
            if (data.subjectId && data.subjectId !== "null") formData.append("subjectId", String(data.subjectId));
            if (data.groupId && data.groupId !== "null") formData.append("groupId", String(data.groupId));

            if (file) formData.append("file", file);

            const res = await fetch("/api/resources", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || "Failed to add resource");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
            onOpenChange(false);
            form.reset();
            setFile(null);
            toast({ title: "Resource added successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Failed to add resource", description: err.message, variant: "destructive" });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl overflow-hidden p-0 gap-0 border-none bg-background/80 backdrop-blur-xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-black">Add New Resource</DialogTitle>
                    <DialogDescription>Share study materials with your groups or save them personally.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="p-6 space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input placeholder="Calculus Notes, Intro to ML..." {...field} className="rounded-xl" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="link">Link</SelectItem><SelectItem value="file">File</SelectItem><SelectItem value="note">Note</SelectItem></SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="subjectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(v === "null" ? null : parseInt(v))} value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}>
                                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="General / No Subject" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="null">General / No Subject</SelectItem>
                                                {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {form.watch("type") === "link" && (
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL</FormLabel>
                                        <FormControl><Input placeholder="https://..." {...field} value={field.value || ""} className="rounded-xl" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {form.watch("type") === "file" && (
                            <div className="space-y-2">
                                <Label>Select File</Label>
                                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl h-auto py-1.5" />
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{form.watch("type") === "note" ? "Note Content" : "Description (for AI)"}</FormLabel>
                                    <FormControl><Textarea placeholder="Paste content or summary..." {...field} value={field.value || ""} className="rounded-xl min-h-[100px]" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="groupId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Share to Group</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(v === "null" ? null : parseInt(v))} value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}>
                                            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="No Group (Private)" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="null">No Group (Private)</SelectItem>
                                                {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isPublic"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-xl border p-3 shadow-sm bg-muted/20">
                                        <FormLabel className="text-xs">Make Public</FormLabel>
                                        <FormControl><Switch checked={field.value === 1} onCheckedChange={(v) => field.onChange(v ? 1 : 0)} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full rounded-xl" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Resource
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ResourceCard({ resource, subjects, groups }: { resource: Resource, subjects: Subject[], groups: StudyGroup[] }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [showComments, setShowComments] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const subject = subjects.find(s => s.id === resource.subjectId);
    const group = groups.find(g => g.id === resource.groupId);
    const canDelete = resource.userId === user?.id;

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/resources/${resource.id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
            queryClient.invalidateQueries({ queryKey: ["/api/resources/mine"] });
            toast({ title: "Resource deleted", variant: "default" });
        }
    });

    const getIcon = () => {
        switch (resource.type) {
            case "link": return <LinkIcon className="h-5 w-5" />;
            case "file": return <FileText className="h-5 w-5" />;
            default: return <StickyNote className="h-5 w-5" />;
        }
    };

    const summarizeMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/resources/${resource.id}/summarize`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
            queryClient.invalidateQueries({ queryKey: ["/api/resources/mine"] });
            toast({ title: "Summary generated", variant: "default" });
        },
        onError: (err: Error) => {
            toast({ title: "Summarization failed", description: err.message, variant: "destructive" });
        }
    });

    const formatExternalLink = (url: string | null) => {
        if (!url) return "#";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return `https://${url}`;
    };

    return (
        <Card className="hover-elevate transition-all duration-300 border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            {getIcon()}
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-base font-bold truncate">{resource.title}</CardTitle>
                            <CardDescription className="text-xs truncate flex items-center gap-1.5 mt-0.5">
                                {resource.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {resource.isPublic ? "Public" : "Private"}
                                {group && <span className="flex items-center gap-1"><span className="opacity-40">•</span> <Users className="h-3 w-3" /> {group.name}</span>}
                            </CardDescription>
                        </div>
                    </div>
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] leading-relaxed">
                    {resource.description || "No description provided."}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                    {subject && (
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ borderColor: subject.color + '40', color: subject.color, backgroundColor: subject.color + '08' }}>
                            {subject.name}
                        </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full opacity-60">
                        {resource.type}
                    </Badge>
                </div>

                {resource.aiSummary && showSummary && (
                    <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3 animate-in fade-in zoom-in-95 duration-500 shadow-sm relative overflow-hidden group/summary">
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/summary:opacity-20 transition-opacity">
                            <Sparkles className="h-12 w-12 text-primary" />
                        </div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">AI Insights & Flashcards</h4>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10" onClick={() => setShowSummary(false)}>
                                <ChevronUp className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="prose prose-xs dark:prose-invert max-w-none text-xs text-foreground/80 leading-relaxed relative z-10">
                            <ReactMarkdown>{resource.aiSummary}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col pt-2 border-t border-border/40 mt-2 bg-muted/20">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5" onClick={() => setShowComments(!showComments)}>
                            <MessageSquare className="h-3.5 w-3.5" />
                            {showComments ? "Hide" : "Comments"}
                        </Button>

                        <div className="flex items-center gap-1">
                            {resource.aiSummary ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`text-xs h-8 gap-1.5 ${showSummary ? 'text-primary bg-primary/5' : ''}`}
                                    onClick={() => setShowSummary(!showSummary)}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {showSummary ? "Hide AI" : "AI View"}
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full"
                                    onClick={() => summarizeMutation.mutate()}
                                    disabled={summarizeMutation.isPending}
                                    title="Summarize with AI"
                                >
                                    <Sparkles className={`h-4 w-4 ${summarizeMutation.isPending ? 'animate-pulse' : ''}`} />
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                className={`text-xs h-8 gap-1.5 ${showQuiz ? 'text-amber-600 bg-amber-50' : 'text-amber-500'}`}
                                onClick={() => setShowQuiz(!showQuiz)}
                                title="Practice Quiz"
                            >
                                <HelpCircle className="h-3.5 w-3.5" />
                                {showQuiz ? "Hide Quiz" : "Quiz"}
                            </Button>
                        </div>
                    </div>

                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 rounded-lg font-bold" asChild>
                        {resource.type === "link" ? (
                            <a href={formatExternalLink(resource.url)} target="_blank" rel="noopener noreferrer">
                                Visit Link <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : (
                            <a href={resource.filePath || "#"} download={resource.fileName}>
                                {resource.type === "file" ? "Download" : "Open Note"} <Download className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </Button>
                </div>

                {showComments && <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300"><CommentSection resourceId={resource.id} /></div>}
                {showQuiz && <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300"><QuizSection resourceId={resource.id} title={resource.title} /></div>}
            </CardFooter>
        </Card>
    );
}

export default function ResourcesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [isAdding, setIsAdding] = useState(false);

    const { data: resources = [], isLoading: loadingResources } = useQuery<Resource[]>({
        queryKey: ["/api/resources"],
    });
    const { data: mine = [], isLoading: loadingMine } = useQuery<Resource[]>({
        queryKey: ["/api/resources/mine"],
    });
    const { data: subjects = [] } = useQuery<Subject[]>({
        queryKey: ["/api/subjects"],
    });
    const { data: groups = [] } = useQuery<StudyGroup[]>({
        queryKey: ["/api/groups"],
    });

    const allResources = useMemo(() => {
        const map = new Map();
        resources.forEach(r => map.set(r.id, r));
        mine.forEach(r => map.set(r.id, r));
        return Array.from(map.values()) as Resource[];
    }, [resources, mine]);

    const filteredResources = useMemo(() => {
        return allResources.filter(r => {
            const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === "all" || r.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [allResources, searchTerm, filterType]);

    if (loadingResources || loadingMine) {
        return (
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight">Study Resources</h1>
                    <p className="text-muted-foreground">Access shared documents, tutorials, and external links.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="rounded-xl shadow-lg shadow-primary/10 h-10 px-6 gap-2" onClick={() => setIsAdding(true)}>
                        <Plus className="h-5 w-5" /> Add Resource
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search resources..."
                        className="pl-10 rounded-xl bg-card border-border/50 h-11 focus-visible:ring-primary shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "link", "file", "note"].map((type) => (
                        <Button
                            key={type}
                            variant={filterType === type ? "default" : "outline"}
                            size="sm"
                            className="rounded-lg h-11 px-6 capitalize font-bold transition-all duration-300"
                            onClick={() => setFilterType(type)}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            {filteredResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/10 border border-dashed border-border rounded-3xl">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Filter className="h-8 w-8 text-muted-foreground opacity-30" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">No Resources Found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            We couldn't find any resources matching your search criteria. Try a different query or add a new resource.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} subjects={subjects} groups={groups} />
                    ))}
                </div>
            )}

            <AddResourceDialog
                open={isAdding}
                onOpenChange={setIsAdding}
                subjects={subjects}
                groups={groups}
            />
        </div>
    );
}
