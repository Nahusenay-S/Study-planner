import { useQuery } from "@tanstack/react-query";
import { Trophy, Flame, Zap, Clock, User, Award, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function GroupLeaderboard({ groupId }: { groupId: number }) {
    const { data: members = [], isLoading } = useQuery<{ username: string, streakCount: number, productivityScore: number, totalStudyMinutes: number, avatar: string | null }[]>({
        queryKey: [`/api/groups/${groupId}/leaderboard`],
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Trophy className="h-7 w-7 text-amber-500 drop-shadow-sm" /> Study Streaks
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">Top performers this week based on consistency.</p>
                </div>
                <div className="flex gap-4 p-4 rounded-3xl bg-muted/20 border border-border/40 shadow-sm">
                    <div className="text-center px-4 border-r border-border/40">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Global Group Rank</p>
                        <p className="text-2xl font-black text-primary">#14</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Members</p>
                        <p className="text-2xl font-black text-primary">{members.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top 3 Podiums */}
                {members.slice(0, 3).map((member, i) => (
                    <Card key={i} className={`relative overflow-hidden border-none shadow-2xl transition-all duration-500 hover:scale-105 group ${i === 0 ? "bg-gradient-to-br from-amber-50 to-amber-100/30 ring-2 ring-amber-500/20" : "bg-card/40 backdrop-blur-sm"}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Trophy className={`h-16 w-16 ${i === 0 ? "text-amber-500" : i === 1 ? "text-zinc-400" : "text-amber-700"}`} />
                        </div>
                        <CardHeader className="flex flex-row items-center gap-4 relative z-10">
                            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center font-black text-2xl border-2 ${i === 0 ? "bg-amber-500 text-white border-amber-300" : i === 1 ? "bg-zinc-400 text-white border-zinc-300" : "bg-amber-700 text-white border-amber-600"}`}>
                                {i + 1}
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-black">{member.username}</CardTitle>
                                <Badge variant="secondary" className="px-2 py-0 text-[10px] font-black tracking-widest uppercase">
                                    {i === 0 ? "Gold Scholar" : i === 1 ? "Silver Scholar" : "Bronze Scholar"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <div className="p-3 rounded-2xl bg-white/50 border border-white/80 shadow-inner flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" /> Current Streak</span>
                                <span className="text-lg font-black text-orange-600">{member.streakCount} Days</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-black uppercase text-muted-foreground px-1 pt-2">
                                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {member.productivityScore} Score</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.floor(member.totalStudyMinutes / 60)}h Focused</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-3 pt-4 animate-in slide-in-from-bottom-5 delay-300">
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">All Runners-up</h3>
                {members.slice(3).map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-4 px-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
                        <div className="flex items-center gap-6">
                            <span className="font-black text-muted-foreground/30 text-lg w-4">{i + 4}</span>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center border border-border/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    {member.avatar ? <img src={member.avatar} className="h-full w-full rounded-xl object-cover" /> : <User className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">{member.username}</p>
                                    <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                        <span className="text-[10px] font-bold uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.floor(member.totalStudyMinutes / 60)}h</span>
                                        <span className="text-[10px] font-bold uppercase flex items-center gap-1"><Zap className="h-3 w-3" /> {member.productivityScore} pts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-black text-orange-500 flex items-center gap-1">{member.streakCount} 🔥</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Streak</span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
