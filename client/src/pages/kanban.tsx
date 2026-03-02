import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  GripVertical,
  Users,
  LayoutGrid,
  Filter,
  Sparkles,
  Brain,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PRIORITIES, STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task, StudyGroup } from "@shared/schema";

const KANBAN_COLUMNS = [
  { id: "todo" as const, title: "Backlog" },
  { id: "in-progress" as const, title: "In Progress" },
  { id: "review" as const, title: "Review" },
  { id: "completed" as const, title: "Completed" },
];

export default function KanbanPage() {
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const { toast } = useToast();

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  const { data: groups = [] } = useQuery<StudyGroup[]>({
    queryKey: ["/api/groups"],
  });

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, kanbanOrder }: { id: number; status: string; kanbanOrder: number }) => {
      const completedAt = status === "completed" ? new Date().toISOString() : null;
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status, completedAt, kanbanOrder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const aiReorderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/schedule");
      return res.json();
    },
    onSuccess: async (data) => {
      if (Array.isArray(data)) {
        toast({ title: "AI Reordering...", description: "Optimizing your schedule based on deadlines and subjects." });

        // Update each task's kanbanOrder based on AI recommendation
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const taskId = typeof item.taskId === 'number' ? item.taskId : tasks.find(t => t.title === item.taskId || t.title === item.title)?.id;
          if (taskId) {
            await apiRequest("PATCH", `/api/tasks/${taskId}`, { kanbanOrder: (i + 1) * 1000 });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Schedule Optimized", description: "Tasks have been reordered for maximum productivity." });
      } else {
        toast({ title: "AI Reorder", description: data.message || "No changes needed at this time." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "AI Reorder Failed", description: err.message, variant: "destructive" });
    }
  });

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const draggableId = result.draggableId;
    const taskId = parseInt(draggableId);
    const newStatus = result.destination.droppableId;
    const destinationIndex = result.destination.index;

    const destTasks = tasks
      .filter((t) => t.status === newStatus && t.id !== taskId)
      .sort((a, b) => (a.kanbanOrder ?? 0) - (b.kanbanOrder ?? 0));

    let newOrder: number;
    if (destTasks.length === 0) {
      newOrder = 1000;
    } else if (destinationIndex === 0) {
      newOrder = (destTasks[0].kanbanOrder ?? 0) - 1000;
    } else if (destinationIndex >= destTasks.length) {
      newOrder = (destTasks[destTasks.length - 1].kanbanOrder ?? 0) + 1000;
    } else {
      const before = destTasks[destinationIndex - 1].kanbanOrder ?? 0;
      const after = destTasks[destinationIndex].kanbanOrder ?? 0;
      newOrder = Math.round((before + after) / 2);
    }

    updateMutation.mutate({ id: taskId, status: newStatus, kanbanOrder: newOrder });
  }, [updateMutation, tasks]);

  const getFilteredTasks = () => {
    if (filterGroup === "personal") return tasks.filter(t => !t.groupId);
    if (filterGroup === "all") return tasks;
    return tasks.filter(t => t.groupId === parseInt(filterGroup));
  };

  const currentTasks = getFilteredTasks();

  const getColumnTasks = (columnId: string) => {
    return currentTasks
      .filter((t) => t.status === columnId)
      .sort((a, b) => (a.kanbanOrder ?? 0) - (b.kanbanOrder ?? 0));
  };

  if (loadingTasks) {
    return (
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[70vh] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 h-full animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight" data-testid="text-kanban-title">Sprint Board</h1>
          <p className="text-muted-foreground text-sm">
            Visualize your progress and manage team collaboration effortlessly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl h-10 gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm"
            onClick={() => aiReorderMutation.mutate()}
            disabled={aiReorderMutation.isPending}
          >
            <Sparkles className={`h-4 w-4 ${aiReorderMutation.isPending ? 'animate-pulse' : ''}`} />
            {aiReorderMutation.isPending ? "Analysing..." : "AI Reorder"}
          </Button>

          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter:</span>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-48 h-8 border-none bg-transparent shadow-none focus:ring-0 font-medium">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="personal">Personal Board</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {g.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[70vh] items-stretch pb-10">
          {KANBAN_COLUMNS.map((column, colIndex) => {
            const columnTasks = getColumnTasks(column.id);
            const statusCfg = STATUSES[column.id];

            return (
              <div key={column.id} className="flex flex-col space-y-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3 w-3 rounded-full shadow-sm"
                      style={{
                        backgroundColor: statusCfg.color,
                        boxShadow: `0 0 10px ${statusCfg.color}40`
                      }}
                    />
                    <h3 className="text-sm font-bold tracking-tight uppercase">{column.title}</h3>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2.5 min-w-[24px] flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${statusCfg.color}10`, color: statusCfg.color }}
                  >
                    {columnTasks.length}
                  </Badge>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-3 space-y-3 transition-all duration-300 min-h-[500px] border relative ${snapshot.isDraggingOver
                        ? "bg-primary/[0.03] border-primary/40 shadow-inner"
                        : "bg-muted/20 border-border/50 backdrop-blur-sm"
                        }`}
                    >
                      {columnTasks.map((task, index) => {
                        const subject = subjectMap.get(task.subjectId!);
                        const group = groups.find(g => g.id === task.groupId);
                        const priorityKey = (task.priority as keyof typeof PRIORITIES) || "medium";
                        const priorityCfg = PRIORITIES[priorityKey] || PRIORITIES.medium;
                        const PriorityIcon = priorityCfg.icon;
                        const deadline = task.deadline ? new Date(task.deadline) : null;

                        const getRiskStatus = () => {
                          if (task.status === "completed") return null;
                          if (!deadline) return { label: "High Risk", color: "#ef4444", icon: AlertCircle };
                          const diffDays = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          if (diffDays < 1) return { label: "Extreme Risk", color: "#dc2626", icon: AlertTriangle };
                          if (diffDays < 3) return { label: "High Risk", color: "#ef4444", icon: AlertCircle };
                          if (diffDays < 7) return { label: "Medium Risk", color: "#f59e0b", icon: AlertCircle };
                          return { label: "On Track", color: "#10b981", icon: CheckCircle2 };
                        };
                        const risk = getRiskStatus();

                        return (
                          <Draggable
                            key={task.id}
                            draggableId={task.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-xl border bg-card p-4 space-y-3 transition-all duration-300 group cursor-grab active:cursor-grabbing ${snapshot.isDragging
                                  ? "shadow-2xl ring-2 ring-primary/40 rotate-[1.5deg] scale-[1.05] z-50 bg-background/90 backdrop-blur-md opacity-90 border-primary"
                                  : "hover:shadow-lg hover:border-primary/30"
                                  }`}
                                data-testid={`kanban-task-${task.id}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="pt-1.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className={`p-1.5 rounded-lg ${priorityCfg.className} bg-current opacity-10 flex flex-col items-center gap-1.5`} style={{ backgroundColor: priorityCfg.color + '15', color: priorityCfg.color }}>
                                    <PriorityIcon className="h-3.5 w-3.5" />
                                    {risk && (
                                      <div className="flex h-1 w-1 rounded-full animate-pulse" style={{ backgroundColor: risk.color }} />
                                    )}
                                  </div>
                                </div>

                                {risk && (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-muted/30 w-fit" style={{ borderColor: risk.color + '20' }}>
                                    <risk.icon className="h-3 w-3" style={{ color: risk.color }} />
                                    <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: risk.color }}>{risk.label}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 flex-wrap pt-1.5">
                                  {subject && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border-none"
                                      style={{
                                        backgroundColor: `${subject.color}15`,
                                        color: subject.color,
                                      }}
                                    >
                                      {subject.name}
                                    </Badge>
                                  )}
                                  {group && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5 opacity-80"
                                    >
                                      <Users className="h-3 w-3" />
                                      {group.name}
                                    </Badge>
                                  )}
                                  {deadline && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-auto">
                                      <Calendar className="h-3 w-3" />
                                      {deadline.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10 text-center space-y-2">
                          <LayoutGrid className="h-8 w-8 text-muted-foreground/10" />
                          <p className="text-xs font-medium text-muted-foreground/30 italic uppercase tracking-widest">Empty</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
