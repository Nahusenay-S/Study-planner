import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
    LayoutGrid,
    Plus,
    Calendar,
    Clock,
    Users,
    MessageSquare,
    Paperclip,
    Lock,
    Unlock,
    MoreVertical,
    AlertCircle,
    Sparkles,
    Trash2,
    CheckCircle2,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    GripVertical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskAssignment, KanbanActivity, GroupMember } from "@shared/schema";

const COLUMNS = [
    { id: "todo", title: "To Do", color: "bg-slate-400" },
    { id: "in-progress", title: "In Progress", color: "bg-blue-500" },
    { id: "review", title: "Review", color: "bg-amber-500" },
    { id: "completed", title: "Completed", color: "bg-green-500" },
];

type EnrichedTask = Task & {
    assignments: (TaskAssignment & { user: { username: string, avatar: string | null } })[]
};

type KanbanData = {
    tasks: EnrichedTask[];
    activity: (KanbanActivity & { user: { username: string, avatar: string | null }, taskTitle: string | null })[];
};

export function GroupKanban({ groupId, members = [], isAdmin = false }: { groupId: number, members: any[], isAdmin?: boolean }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data, isLoading } = useQuery<KanbanData>({
        queryKey: [`/api/groups/${groupId}/kanban`],
    });

    useEffect(() => {
        if (selectedTask && data?.tasks) {
            const updated = data.tasks.find(t => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
        }
    }, [data?.tasks]);

    // Create Task State
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPriority, setNewPriority] = useState("medium");
    const [newDeadline, setNewDeadline] = useState("");

    const moveMutation = useMutation({
        mutationFn: async ({ taskId, status, kanbanOrder }: { taskId: number, status: string, kanbanOrder: number }) => {
            const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status, kanbanOrder });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
        },
        onError: (err: any) => {
            toast({ title: "Move Failed", description: err.message, variant: "destructive" });
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/tasks", {
                title: newTitle,
                description: newDesc,
                priority: newPriority,
                deadline: newDeadline || null,
                groupId,
                status: "todo"
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
            setIsCreateOpen(false);
            setNewTitle("");
            setNewDesc("");
            toast({ title: "Task Created", description: "Operation queued in the Kanban." });
        }
    });

    const clearActivityMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/groups/${groupId}/kanban/activity`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
            toast({ title: "Feed Cleared", description: "Pulse history has been wiped." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (taskId: number) => {
            await apiRequest("DELETE", `/api/tasks/${taskId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
            setSelectedTask(null);
            toast({ title: "Task Deleted" });
        }
    });

    const assignMutation = useMutation({
        mutationFn: async ({ taskId, userId }: { taskId: number, userId: number }) => {
            const res = await apiRequest("POST", `/api/tasks/${taskId}/assign`, { userId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
            toast({ title: "Personnel Deployed" });
        }
    });

    const unassignMutation = useMutation({
        mutationFn: async ({ taskId, userId }: { taskId: number, userId: number }) => {
            await apiRequest("DELETE", `/api/tasks/${taskId}/assign/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/kanban`] });
            toast({ title: "Personnel Recalled" });
        }
    });

    const onDragEnd = useCallback((result: DropResult) => {
        if (!result.destination || !data) return;
        const taskId = parseInt(result.draggableId);
        const newStatus = result.destination.droppableId;
        const destinationIndex = result.destination.index;

        const columnTasks = data.tasks
            .filter(t => t.status === newStatus)
            .sort((a, b) => (a.kanbanOrder || 0) - (b.kanbanOrder || 0));

        let newOrder: number;
        if (columnTasks.length === 0) {
            newOrder = 1000;
        } else if (destinationIndex === 0) {
            newOrder = (columnTasks[0].kanbanOrder || 0) / 2;
        } else if (destinationIndex >= columnTasks.length) {
            newOrder = (columnTasks[columnTasks.length - 1].kanbanOrder || 0) + 1000;
        } else {
            const prev = columnTasks[destinationIndex - 1].kanbanOrder || 0;
            const next = columnTasks[destinationIndex].kanbanOrder || 0;
            newOrder = (prev + next) / 2;
        }

        moveMutation.mutate({ taskId, status: newStatus, kanbanOrder: newOrder });
    }, [data, moveMutation]);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Initializing Kanban protocols...</div>;

    const tasks = data?.tasks || [];
    const activity = data?.activity || [];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Kanban Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                        <LayoutGrid className="h-8 w-8 text-primary" /> Group Kanban
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Shared mission board for real-time collaboration.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="h-12 px-6 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" /> New Mission
                        </Button>
                    )}
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="flex flex-col gap-6 group/col">
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`h-2.5 w-2.5 rounded-full shadow-lg ${col.color}`} />
                                    <h3 className="text-xs font-black tracking-[0.2em] uppercase opacity-60 group-hover/col:opacity-100 transition-opacity">
                                        {col.title}
                                    </h3>
                                </div>
                                <Badge variant="secondary" className="rounded-lg font-black text-[10px] bg-muted/50 border-none">
                                    {tasks.filter(t => t.status === col.id).length}
                                </Badge>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 min-h-[500px] rounded-[2.5rem] border-2 border-dashed transition-all duration-300 p-4 ${snapshot.isDraggingOver ? "bg-primary/5 border-primary/30" : "bg-card/20 border-border/10"
                                            }`}
                                    >
                                        <div className="space-y-4">
                                            {tasks
                                                .filter(t => t.status === col.id)
                                                .sort((a, b) => (a.kanbanOrder || 0) - (b.kanbanOrder || 0))
                                                .map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedTask(task)}
                                                                className={`group/task transform transition-all active:scale-95 ${snapshot.isDragging ? "rotate-2 scale-105" : ""}`}
                                                            >
                                                                <Card className={`group/task border-none rounded-2xl bg-card text-card-foreground border border-border/40 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden relative cursor-pointer ${snapshot.isDragging ? "shadow-2xl ring-4 ring-primary/20 rotate-1 scale-105" : "hover-elevate"}`}>
                                                                    <div className={`h-1.5 w-full absolute top-0 left-0 ${task.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-400' :
                                                                        task.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                                                        } opacity-40 group-hover/task:opacity-100 transition-opacity`} />

                                                                    <CardHeader className="p-5 pb-3">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="space-y-2 flex-1">
                                                                                <CardTitle className="text-base font-bold text-card-foreground tracking-tight leading-snug group-hover/task:text-primary transition-colors cursor-grab">
                                                                                    {task.title}
                                                                                </CardTitle>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Badge variant="secondary" className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                                                                        task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                                                                        }`}>
                                                                                        {task.priority}
                                                                                    </Badge>
                                                                                    {task.assignments && task.assignments.length > 0 ? (
                                                                                        <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md border-primary/20 bg-primary/5 text-primary">Assigned</Badge>
                                                                                    ) : (
                                                                                        <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md border-border text-muted-foreground bg-muted/20">Unassigned</Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-20 group-hover/task:opacity-60 transition-opacity" />
                                                                        </div>
                                                                    </CardHeader>

                                                                    <CardContent className="p-5 pt-0 space-y-4">
                                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 font-medium leading-relaxed">
                                                                            {task.description || "No description provided."}
                                                                        </p>

                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex -space-x-2">
                                                                                {task.assignments?.slice(0, 3).map((a, i) => (
                                                                                    <Avatar key={i} className="h-6 w-6 border-2 border-background ring-2 ring-transparent group-hover/task:ring-primary/20 transition-all">
                                                                                        <AvatarImage src={a.user.avatar || ""} />
                                                                                        <AvatarFallback className="text-[8px] font-black">{a.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                                    </Avatar>
                                                                                ))}
                                                                                {task.assignments?.length > 3 && (
                                                                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-black border-2 border-background">
                                                                                        +{task.assignments.length - 3}
                                                                                    </div>
                                                                                )}
                                                                                {(!task.assignments || task.assignments.length === 0) && (
                                                                                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground/40">
                                                                                        <Users className="h-3 w-3" />
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center gap-3">
                                                                                {task.deadline && (
                                                                                    <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground/60">
                                                                                        <Calendar className="h-3 w-3" />
                                                                                        {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                                    </div>
                                                                                )}
                                                                                {task.isLocked === 1 && <Lock className="h-3 w-3 text-amber-500/60" />}
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                        </div>
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Premium Activity Feed */}
            <div className="pt-10 border-t border-border/40">
                <div className="flex items-center gap-3 px-2 mb-6">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Operational Pulse</h3>
                    <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-bold bg-background text-foreground">Live Activity</Badge>
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => clearActivityMutation.mutate()}
                            title="Clear Activity Feed"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
                <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] border border-border/40 p-6 shadow-xl relative overflow-hidden">
                    <div className="space-y-4">
                        {activity.length === 0 && <p className="text-center py-10 text-xs text-muted-foreground italic font-medium">System standby. Awaiting first operational vector.</p>}
                        {activity.slice(0, 5).map(act => (
                            <div key={act.id} className="flex items-center gap-4 group/act">
                                <Avatar className="h-8 w-8 rounded-xl border border-border/20">
                                    <AvatarImage src={act.user.avatar || ""} />
                                    <AvatarFallback className="text-[10px] font-bold">{act.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground leading-tight">
                                        <span className="font-black text-primary">{act.user.username}</span>
                                        {" "}
                                        {act.action === 'moved' ? `moved "${act.taskTitle}"` :
                                            act.action === 'created' ? `forged a new mission: "${act.taskTitle}"` :
                                                act.action === 'assigned' ? `deployed resources to "${act.taskTitle}"` :
                                                    act.action === 'commented' ? `transmitted data to "${act.taskTitle}"` :
                                                        `updated "${act.taskTitle}"`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-tighter opacity-60">
                                        {act.details || act.action.replace('_', ' ')} • Just now
                                    </p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-primary/0 group-hover/act:text-primary transition-all rotate-45" />
                            </div>
                        ))}
                    </div>
                    {/* Decorative bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
                </div>
            </div>

            {/* Task Creation Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="rounded-[2.5rem] bg-card/95 backdrop-blur-xl border-border/40 max-w-lg p-0 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-primary to-purple-500" />
                    <div className="p-8 space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                <Plus className="h-6 w-6 text-primary" /> New Task
                            </DialogTitle>
                            <DialogDescription className="font-medium">Define a new mission parameter for the circle.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                                <Input
                                    placeholder="e.g. Study Neural Networks"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="h-12 rounded-2xl bg-muted/40 border-border/40 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                                <textarea
                                    placeholder="Break down the learning objectives..."
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    className="w-full h-24 rounded-2xl bg-muted/40 border-border/40 p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 ring-primary/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Priority</label>
                                    <div className="flex gap-2">
                                        {['low', 'medium', 'high'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setNewPriority(p)}
                                                className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${newPriority === p ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deadline</label>
                                    <Input
                                        type="date"
                                        value={newDeadline}
                                        onChange={e => setNewDeadline(e.target.value)}
                                        className="h-10 rounded-xl bg-muted/40 border-border/40 text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!newTitle.trim() || createMutation.isPending}
                                className="rounded-xl px-8 font-black uppercase text-xs tracking-widest bg-primary shadow-lg shadow-primary/20"
                            >
                                {createMutation.isPending ? "Deploying..." : "Launch Task"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Task Detail Dialog (Comments, Assignments, etc.) */}
            <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
                {selectedTask && (
                    <DialogContent className="rounded-[2.5rem] bg-background border border-border shadow-2xl max-w-2xl p-0 overflow-hidden">
                        <div className={`h-2 ${selectedTask.priority === 'high' ? 'bg-red-500' :
                            selectedTask.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <DialogHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="rounded-full uppercase text-[9px] font-black tracking-widest border-primary/30 text-primary">{selectedTask.status.replace('-', ' ')}</Badge>
                                        <Badge variant="secondary" className="rounded-full uppercase text-[9px] font-black tracking-widest">{selectedTask.priority} Priority</Badge>
                                    </div>
                                    <DialogTitle className="text-3xl font-black tracking-tight leading-tight">{selectedTask.title}</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-2 leading-relaxed">
                                        {selectedTask.description || "The administrator has provided no detailed telemetry for this mission."}
                                    </DialogDescription>
                                </DialogHeader>

                                {/* Task Comments Preview */}
                                <div className="space-y-4 pt-4 border-t border-border/40">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <MessageSquare className="h-3.5 w-3.5" /> Intelligence Feed
                                    </h5>
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground italic bg-muted/20 px-4 py-3 rounded-2xl border border-dashed border-border/40">
                                            The intelligence module is coming online. Real-time data transmission initiated.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 bg-muted/30 p-6 rounded-[2rem] border border-border">
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5" /> Mission Personnel
                                    </h5>
                                    <div className="space-y-2">
                                        {selectedTask.assignments?.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 rounded-lg border border-border/20 shadow-sm">
                                                    <AvatarImage src={a.user.avatar || ""} />
                                                    <AvatarFallback className="text-[8px] font-black">{a.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold text-foreground/80">{a.user.username}</span>
                                            </div>
                                        ))}
                                        {(!selectedTask.assignments || selectedTask.assignments.length === 0) && (
                                            <p className="text-[10px] text-muted-foreground italic">No members assigned yet.</p>
                                        )}
                                    </div>
                                    {isAdmin && members && members.length > 0 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full rounded-xl h-9 text-[10px] font-black border-none bg-primary/10 text-primary hover:bg-primary/20">
                                                    Assign Personnel
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-56 rounded-2xl bg-background border-border shadow-xl">
                                                {selectedTask.assignments && selectedTask.assignments.length > 0 && (
                                                    <>
                                                        <DropdownMenuItem
                                                            className="flex items-center gap-2 text-xs font-bold cursor-pointer rounded-xl my-1 text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                // Unassign all one by one
                                                                selectedTask.assignments?.forEach(a => {
                                                                    unassignMutation.mutate({ taskId: selectedTask.id, userId: a.userId });
                                                                });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Unassign All
                                                        </DropdownMenuItem>
                                                        <div className="h-px bg-border/60 my-1 mx-2" />
                                                    </>
                                                )}
                                                {members.map(m => {
                                                    const isAssigned = selectedTask.assignments?.some(a => a.userId === m.user.id);
                                                    return (
                                                        <DropdownMenuItem
                                                            key={m.user.id}
                                                            className="flex items-center justify-between text-xs font-bold cursor-pointer rounded-xl my-1"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                if (isAssigned) {
                                                                    unassignMutation.mutate({ taskId: selectedTask.id, userId: m.user.id });
                                                                } else {
                                                                    assignMutation.mutate({ taskId: selectedTask.id, userId: m.user.id });
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={m.user.avatar || ""} />
                                                                    <AvatarFallback className="text-[8px]">{m.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                {m.user.username}
                                                            </div>
                                                            {isAssigned && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                        </DropdownMenuItem>
                                                    )
                                                })}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border/20">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" /> Time Horizon
                                    </h5>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black">{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : "No Deadline"}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold">UTC SYNCHRONIZED</p>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="pt-10 flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            className="rounded-xl h-10 text-[10px] font-black text-destructive hover:bg-destructive hover:text-white transition-all border-none bg-destructive/5"
                                            onClick={() => deleteMutation.mutate(selectedTask.id)}
                                        >
                                            Abort Mission
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
