import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { HelpCircle, Sparkles, Trophy, Plus, Brain, BookOpen, Clock, PlayCircle, Zap, Swords, Save, Trash2, CheckCircle2, ListFilter, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Quiz, Resource } from "@shared/schema";

export function GroupQuizzes({ groupId, hideHeader = false }: { groupId: number, hideHeader?: boolean }) {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [selectedResourceId, setSelectedResourceId] = useState<string>("");
    const [quizTitle, setQuizTitle] = useState("");
    const [quizCount, setQuizCount] = useState("5");
    const [quizType, setQuizType] = useState("multiple-choice");
    const [battleMode, setBattleMode] = useState<"ai" | "manual">("ai");
    const [manualQuestions, setManualQuestions] = useState([{
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0
    }]);

    const { data: quizzes = [], isLoading: quizzesLoading } = useQuery<Quiz[]>({
        queryKey: [`/api/quizzes?groupId=${groupId}`],
    });

    const { data: resources = [] } = useQuery<Resource[]>({
        queryKey: [`/api/groups/${groupId}/resources`],
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            if (battleMode === "ai") {
                if (!selectedResourceId) throw new Error("Please select a resource");
                const res = await apiRequest("POST", `/api/resources/${selectedResourceId}/create-quiz`, {
                    title: quizTitle || `Group Quiz: ${resources.find(r => r.id === parseInt(selectedResourceId))?.title}`,
                    count: parseInt(quizCount),
                    type: quizType,
                    groupId,
                    isBattle: 1
                });
                return res.json();
            } else {
                if (!quizTitle) throw new Error("Please enter a quiz title");
                if (manualQuestions.some(q => !q.question || q.options.some(o => !o))) throw new Error("Please fill all questions and options");

                const res = await apiRequest("POST", "/api/quizzes", {
                    title: quizTitle,
                    description: `Custom Battle Arena: ${quizTitle}`,
                    groupId,
                    difficulty: "medium",
                    isBattle: 1,
                    questions: manualQuestions.map(q => ({
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.options[q.correctIndex],
                        correctIndex: q.correctIndex
                    }))
                });
                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/quizzes?groupId=${groupId}`] });
            setIsCreating(false);
            setQuizTitle("");
            setSelectedResourceId("");
            setManualQuestions([{ question: "", options: ["", "", "", ""], correctIndex: 0 }]);
            toast({ title: "Battle Ready!", description: "Challenge posted to the group arena." });
        },
        onError: (err: Error) => {
            toast({ title: "Failed to create quiz", description: err.message, variant: "destructive" });
        }
    });
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/quizzes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/quizzes?groupId=${groupId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
            toast({ title: "Battle Removed", description: "The battle arena has been dismantled." });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
        }
    });

    if (quizzesLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
                    <div className="space-y-1 text-center md:text-left">
                        <h2 className="text-3xl font-black tracking-tight flex items-center justify-center md:justify-start gap-4">
                            <Swords className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] animate-bounce-slow" /> Group Quiz Battles
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto md:mx-0">Generate group-wide assessments from shared resources and compete for the top score.</p>
                    </div>
                    <Button
                        className="rounded-3xl shadow-2xl shadow-primary/20 h-14 px-10 gap-3 font-black text-base transition-all hover:scale-105 active:scale-95 group overflow-hidden relative"
                        onClick={() => setIsCreating(true)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Zap className="h-5 w-5 fill-current" /> START BATTLE ARENA
                    </Button>
                </div>
            )}

            {hideHeader && (
                <div className="flex justify-end pt-4">
                    <Button className="rounded-2xl shadow-xl h-12 px-8 gap-2 font-black text-sm" onClick={() => setIsCreating(true)}>
                        <Zap className="h-4 w-4 fill-current" /> NEW BATTLE
                    </Button>
                </div>
            )}

            {quizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-muted/20 border border-dashed border-border/40 rounded-3xl animate-in zoom-in-95 duration-700 shadow-inner">
                    <div className="h-24 w-24 rounded-3xl bg-white flex items-center justify-center border-2 border-primary/20 shadow-lg group hover:rotate-6 transition-all duration-300">
                        <HelpCircle className="h-12 w-12 text-primary/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black tracking-tight">No Quiz Battles Active</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto font-medium">Be the first to challenge your group! Select a shared resource to generate an AI quiz.</p>
                    </div>
                    <Button variant="outline" className="rounded-2xl border-2 px-8 font-black hover:bg-primary/5 hover:text-primary" onClick={() => setIsCreating(true)}>
                        <Sparkles className="h-5 w-5 mr-2" /> Start First Battle
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {quizzes.map((quiz) => (
                        <Card key={quiz.id} className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group/card rounded-[2.5rem] bg-card/60 backdrop-blur-md">
                            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-primary/40 to-primary/80" />
                            <CardHeader className="pb-4 pt-10 px-8 relative z-10">
                                <div className="absolute top-0 right-0 p-6 flex items-start gap-2">
                                    {(quiz.userId === authUser?.id) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all z-20"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (confirm("Are you sure you want to delete this battle?")) {
                                                    deleteMutation.mutate(quiz.id);
                                                }
                                            }}
                                        >
                                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    )}
                                    <div className="opacity-5 group-hover/card:opacity-15 transition-all duration-700 rotate-12 group-hover/card:rotate-45">
                                        <Trophy className="h-24 w-24 text-primary" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className="rounded-full bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3">Active Battle</Badge>
                                        <Badge variant="outline" className="rounded-full border-primary/20 text-muted-foreground font-black text-[9px] uppercase tracking-widest px-3">{quiz.difficulty}</Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-black tracking-tight leading-tight group-hover/card:text-primary transition-colors">{quiz.title}</CardTitle>
                                    <CardDescription className="text-sm font-medium line-clamp-2 min-h-[40px] opacity-80">{quiz.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="px-8 pb-10 space-y-6 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-3xl bg-muted/40 border border-border/20 flex flex-col items-center justify-center transition-all group-hover/card:bg-muted/80">
                                        <Brain className="h-6 w-6 text-primary mb-2 opacity-60" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expertise</span>
                                        <span className="text-base font-black text-foreground">Level 4</span>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-muted/40 border border-border/20 flex flex-col items-center justify-center transition-all group-hover/card:bg-muted/80">
                                        <Zap className="h-6 w-6 text-amber-500 mb-2 opacity-60" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rewards</span>
                                        <span className="text-base font-black text-foreground">+50 Pts</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-t border-border/30 pt-4">
                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 5-10 Mins</span>
                                    <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {quiz.totalQuestions || 0} Questions</span>
                                </div>

                                <Link href={`/quizzes/${quiz.id}`}>
                                    <Button className="w-full h-14 rounded-3xl gap-4 font-black text-base shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] hover:shadow-xl group/btn">
                                        <PlayCircle className="h-6 w-6 transition-transform group-hover/btn:scale-110" /> Join Battle Arena
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] bg-card/90 backdrop-blur-3xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tight text-center">Setup Battle Arena</DialogTitle>
                            <DialogDescription className="text-center text-base font-medium opacity-70">Create a challenge for your study group.</DialogDescription>
                        </DialogHeader>

                        <div className="flex items-center justify-center gap-4">
                            <Button
                                variant={battleMode === "ai" ? "default" : "outline"}
                                className="rounded-2xl font-black gap-2"
                                onClick={() => setBattleMode("ai")}
                            >
                                <Sparkles className="h-4 w-4" /> AI Summoner
                            </Button>
                            <Button
                                variant={battleMode === "manual" ? "default" : "outline"}
                                className="rounded-2xl font-black gap-2"
                                onClick={() => setBattleMode("manual")}
                            >
                                <Plus className="h-4 w-4" /> Manual Forge
                            </Button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Battle Title</Label>
                                <Input
                                    placeholder="e.g. Calculus Midterm Prep"
                                    className="h-14 rounded-2xl bg-muted/20 border-border/20 font-bold text-base focus-visible:ring-primary/30 shadow-inner"
                                    value={quizTitle}
                                    onChange={(e) => setQuizTitle(e.target.value)}
                                />
                            </div>

                            {battleMode === "ai" ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Select Knowledge Source</Label>
                                        <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/20 font-bold text-base focus:ring-primary/30 shadow-inner overflow-hidden">
                                                <SelectValue placeholder="Pick a Shared Resource" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                                {resources.map(res => (
                                                    <SelectItem key={res.id} value={res.id.toString()} className="rounded-xl p-3 font-bold focus:bg-primary/5 focus:text-primary transition-colors">
                                                        {res.title} ({res.type})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Format</Label>
                                            <Select value={quizType} onValueChange={setQuizType}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/20 font-bold text-base focus:ring-primary/30 shadow-inner">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                                    <SelectItem value="multiple-choice" className="rounded-xl p-3 font-medium">Multiple Choice</SelectItem>
                                                    <SelectItem value="true-false" className="rounded-xl p-3 font-medium">True / False</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Intensity</Label>
                                            <Select value={quizCount} onValueChange={setQuizCount}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/20 font-bold text-base focus:ring-primary/30 shadow-inner">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                                    {["3", "5", "8", "10"].map(n => <SelectItem key={n} value={n} className="rounded-xl p-3 font-medium">{n} Questions</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-60 ml-1">Questions Bucket</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-primary font-black gap-2 h-8 rounded-full hover:bg-primary/10"
                                            onClick={() => setManualQuestions([...manualQuestions, { question: "", options: ["", "", "", ""], correctIndex: 0 }])}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add Question
                                        </Button>
                                    </div>

                                    <div className="space-y-12">
                                        {manualQuestions.map((q, qIndex) => (
                                            <div key={qIndex} className="space-y-4 p-6 rounded-[2rem] bg-muted/10 border border-border/10 relative group/q">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover/q:opacity-100 transition-opacity hover:bg-destructive hover:text-white border border-destructive/20"
                                                    onClick={() => setManualQuestions(manualQuestions.filter((_, idx) => idx !== qIndex))}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Question #{qIndex + 1}</Label>
                                                    <Input
                                                        placeholder="Enter the challenge question..."
                                                        className="rounded-xl bg-muted/20 border-none font-bold"
                                                        value={q.question}
                                                        onChange={(e) => {
                                                            const newQs = [...manualQuestions];
                                                            newQs[qIndex].question = e.target.value;
                                                            setManualQuestions(newQs);
                                                        }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.options.map((opt, oIndex) => (
                                                        <div key={oIndex} className="relative flex items-center">
                                                            <Input
                                                                placeholder={`Option ${oIndex + 1}`}
                                                                className={`pl-10 rounded-xl bg-card border-none font-medium text-sm h-10 ${q.correctIndex === oIndex ? "ring-2 ring-primary bg-primary/5 text-primary" : ""}`}
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newQs = [...manualQuestions];
                                                                    newQs[qIndex].options[oIndex] = e.target.value;
                                                                    setManualQuestions(newQs);
                                                                }}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={`absolute left-1 h-8 w-8 rounded-lg transition-colors ${q.correctIndex === oIndex ? "text-primary bg-primary/10" : "text-muted-foreground/30"}`}
                                                                onClick={() => {
                                                                    const newQs = [...manualQuestions];
                                                                    newQs[qIndex].correctIndex = oIndex;
                                                                    setManualQuestions(newQs);
                                                                }}
                                                            >
                                                                <Check className={`h-4 w-4 ${q.correctIndex === oIndex ? "opacity-100" : "opacity-20"}`} />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-col gap-3 pt-6 pb-10 px-10">
                        <Button
                            className="w-full h-14 rounded-3xl font-black text-lg shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || (battleMode === "ai" && !selectedResourceId) || (battleMode === "manual" && (manualQuestions.length === 0 || !quizTitle))}
                        >
                            {createMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" /> {battleMode === "ai" ? "Summoning AI..." : "Forging Arena..."}
                                </span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    {battleMode === "ai" ? <Sparkles className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                                    {battleMode === "ai" ? "Initialize AI Battle" : "Finalize Manual Battle"}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-3xl font-black opacity-40 hover:opacity-100 hover:bg-transparent transition-opacity" onClick={() => setIsCreating(false)}>
                            Rethink Challenge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
