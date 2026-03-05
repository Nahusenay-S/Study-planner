import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Brain,
    Swords,
    Trophy,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Clock,
    Zap,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quiz, QuizQuestion } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

type QuizWithQuestions = Quiz & { questions: QuizQuestion[] };

export default function QuizBattlePage() {
    const [, params] = useRoute("/quizzes/:id");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const quizId = params?.id;

    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [showCorrection, setShowCorrection] = useState(false);

    const { data: quiz, isLoading, error } = useQuery<QuizWithQuestions>({
        queryKey: [`/api/quizzes/${quizId}`],
        enabled: !!quizId,
    });

    const submitMutation = useMutation({
        mutationFn: async (results: { score: number; totalQuestions: number }) => {
            await apiRequest("POST", `/api/quizzes/${quizId}/submit`, {
                quizId: parseInt(quizId!),
                ...results
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/analytics/insights"] });
            queryClient.invalidateQueries({ queryKey: [`/api/quizzes?groupId=${quiz?.groupId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${quiz?.groupId}/members`] });
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${quiz?.groupId}/leaderboard`] });
            toast({ title: "Battle Logged!", description: "Your score has been added to the group leaderboard." });
        }
    });

    if (isLoading) return <QuizLoadingSkeleton />;
    if (error || !quiz) return <QuizErrorState />;

    const questions = quiz.questions;
    const currentQuestion = questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

    const handleAnswerSelect = (optIdx: number) => {
        if (showCorrection) return;
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIdx] = optIdx;
        setSelectedAnswers(newAnswers);
        setShowCorrection(true);
    };

    const handleNext = () => {
        if (currentQuestionIdx < questions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
            setShowCorrection(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        let score = 0;
        questions.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correctIndex) score++;
        });

        setIsFinished(true);
        submitMutation.mutate({ score, totalQuestions: questions.length });
    };

    if (isFinished) {
        const score = questions.reduce((acc, q, idx) => {
            return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
        }, 0);
        const percentage = Math.round((score / questions.length) * 100);

        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-12 animate-in fade-in duration-1000">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <Trophy className="h-32 w-32 text-primary relative z-10 drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
                </div>

                <div className="text-center space-y-4 relative z-10">
                    <h1 className="text-5xl font-black tracking-tighter">Battle Results</h1>
                    <p className="text-xl text-muted-foreground font-medium">{quiz.title}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                    <ResultStatCard label="Score" value={`${score}/${questions.length}`} subValue={`${percentage}%`} icon={<Zap className="text-amber-500" />} />
                    <ResultStatCard label="Rank" value="MVP" subValue="Top 10%" icon={<Trophy className="text-primary" />} />
                    <ResultStatCard label="XP Gained" value={`+${score * 10}`} subValue="Level Up!" icon={<Sparkles className="text-blue-500" />} />
                </div>

                <div className="flex gap-4">
                    <Button variant="outline" className="rounded-2xl h-14 px-8 font-black border-2" onClick={() => setLocation(`/groups/${quiz.groupId}`)}>
                        Return to Squad
                    </Button>
                    <Button className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20" onClick={() => window.location.reload()}>
                        Rematch
                    </Button>
                </div>
            </div>
        );
    }

    const options = JSON.parse(currentQuestion.options);
    const correctIdx = currentQuestion.correctIndex;
    const userSelectedIdx = selectedAnswers[currentQuestionIdx];

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 max-w-5xl mx-auto space-y-12">
            <header className="flex items-center justify-between">
                <Button variant="ghost" className="rounded-full h-12 w-12 p-0" onClick={() => setLocation(`/groups/${quiz.groupId}`)}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-3">
                    <Badge className="rounded-full bg-primary/10 text-primary border-none px-4 py-1.5 font-black text-xs">Battle Arena</Badge>
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs uppercase tracking-widest">
                        <Clock className="h-4 w-4" /> 04:59
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight">{currentQuestionIdx + 1} / {questions.length}</span>
                </div>
            </header>

            <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-3 rounded-full bg-muted/40" />
            </div>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Badge variant="outline" className="rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-widest px-3">Question {currentQuestionIdx + 1}</Badge>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                            {currentQuestion.question}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {options.map((opt: string, idx: number) => {
                            const isSelected = userSelectedIdx === idx;
                            const isCorrect = correctIdx === idx;

                            let buttonClass = "h-auto p-6 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden group ";
                            if (showCorrection) {
                                if (isCorrect) buttonClass += "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400 scale-[1.02] shadow-lg shadow-green-500/10";
                                else if (isSelected) buttonClass += "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400 opacity-80";
                                else buttonClass += "bg-muted/10 border-border/20 opacity-40";
                            } else {
                                if (isSelected) buttonClass += "bg-primary/5 border-primary ring-4 ring-primary/10 scale-[1.02]";
                                else buttonClass += "bg-card border-border/40 hover:border-primary/40 hover:bg-primary/[0.02]";
                            }

                            return (
                                <button
                                    key={idx}
                                    className={buttonClass}
                                    onClick={() => handleAnswerSelect(idx)}
                                >
                                    <div className="flex items-center justify-between relative z-10 gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black transition-colors ${showCorrection ? (isCorrect ? "bg-green-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-muted") : (isSelected ? "bg-primary text-white" : "bg-muted group-hover:bg-primary/10 group-hover:text-primary")
                                                }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="font-bold text-lg">{opt}</span>
                                        </div>
                                        {showCorrection && isCorrect && <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />}
                                        {showCorrection && isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500 animate-in zoom-in duration-300" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col justify-end space-y-8">
                    <AnimatePresence mode="wait">
                        {showCorrection && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-primary/5 rounded-[2.5rem] p-10 space-y-4 border border-primary/10 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                    <Brain className="h-32 w-32" />
                                </div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" /> AI Explanation
                                </h3>
                                <p className="text-muted-foreground font-medium leading-relaxed leading-relaxed">
                                    {currentQuestion.explanation || "This answer is correct because it aligns with the core principles discussed in the resource material."}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between gap-4 pt-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Streak</span>
                            <span className="text-lg font-black">{selectedAnswers.filter((a, i) => a === options.indexOf(questions[i].correctAnswer)).length} Correct</span>
                        </div>
                        <Button
                            className="rounded-3xl h-16 px-12 gap-3 font-black text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                            disabled={!showCorrection}
                            onClick={handleNext}
                        >
                            {currentQuestionIdx < questions.length - 1 ? "Next Challenge" : "Finish Battle"} <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ResultStatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
    return (
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-md relative overflow-hidden group">
            <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                    {icon}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
                    <p className="text-4xl font-black tracking-tight">{value}</p>
                    <p className="text-xs font-bold text-primary">{subValue}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function QuizLoadingSkeleton() {
    return (
        <div className="min-h-screen p-12 max-w-5xl mx-auto space-y-12">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                </div>
                <Skeleton className="h-full w-full rounded-[2.5rem]" />
            </div>
        </div>
    );
}

function QuizErrorState() {
    const [, setLocation] = useLocation();
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center space-y-8">
            <AlertCircle className="h-24 w-24 text-red-500/20" />
            <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight">Battle Not Found</h2>
                <p className="text-muted-foreground font-medium">The quiz you are looking for has been retired or moved.</p>
            </div>
            <Button className="rounded-2xl" onClick={() => setLocation("/groups")}>Back to Groups</Button>
        </div>
    );
}
