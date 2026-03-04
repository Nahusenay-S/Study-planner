import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PRIORITIES, STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task, StudyGroup } from "@shared/schema";

const KANBAN_COLUMNS = [
  { id: "todo" as const, title: "DATA-QUEUE" },
  { id: "in-progress" as const, title: "ACTIVE-OP" },
  { id: "review" as const, title: "INTEL-VAL" },
  { id: "completed" as const, title: "MISSION-SUCCESS" },
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
    onSuccess: async (data: any) => {
      if (Array.isArray(data)) {
        toast({ title: "Neural Optimization Active", description: "Generating optimal mission engagement vectors." });

        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const taskId = typeof item.taskId === 'number' ? item.taskId : tasks.find(t => t.title === item.taskId || t.title === item.title)?.id;
          if (taskId) {
            await apiRequest("PATCH", `/api/tasks/${taskId}`, { kanbanOrder: (i + 1) * 1000 });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({ title: "Engagement Optimized", description: "Operational queue recalibrated for maximum throughput." });
      } else {
        toast({ title: "Neural Sync", description: data.message || "Registry is currently at peak operation." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Neural Failure", description: "AI sync protocol interrupted. Retry engagement.", variant: "destructive" });
    }
  });

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const draggableId = result.draggableId;
    const taskId = parseInt(draggableId);
    const newStatus = result.destination.droppableId;
    const destinationIndex = result.destination.index;

    const columnTasks = tasks
      .filter((t) => t.status === newStatus)
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

    updateMutation.mutate({ id: taskId, status: newStatus, kanbanOrder: newOrder });
  }, [tasks, updateMutation]);

  if (loadingTasks) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-16 space-y-12 animate-pulse">
        <div className="h-40 bg-card/40 rounded-[3rem] border-2 border-border/20" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[40rem] bg-card/40 rounded-[2.5rem] border-2 border-border/20" />
          ))}
        </div>
      </div>
    );
  }

  const filteredTasks = filterGroup === "all"
    ? tasks
    : tasks.filter((t) => t.groupId === parseInt(filterGroup));

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-16 space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 pb-40">
      {/* Tactical Grid Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 py-12 px-10 bg-card/40 backdrop-blur-3xl rounded-[3rem] border-2 border-border/20 shadow-elevation-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-none uppercase" data-testid="text-kanban-title">COMMAND-GRID</h1>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[11px] uppercase font-black px-5 py-2 rounded-full hidden sm:inline-flex tracking-[0.3em] shadow-lg shadow-primary/10">MISSION-PHASE</Badge>
          </div>
          <p className="text-muted-foreground font-black text-xl tracking-tight italic opacity-60 max-w-2xl leading-snug">
            Strategic deployment of study units across the temporal engagement grid. Synchronize and execute.
          </p>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex items-center gap-4 p-4 rounded-[1.75rem] bg-muted/20 border-2 border-border/20 shadow-inner focus-within:border-primary/40 transition-all">
            <Filter className="h-5 w-5 text-primary opacity-40 ml-2" />
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-48 bg-transparent border-none font-black text-xs uppercase tracking-[0.2em] focus:ring-0">
                <SelectValue placeholder="FILTER SQUAD" />
              </SelectTrigger>
              <SelectContent className="rounded-[2rem] border-2 border-border/20 bg-card/95 backdrop-blur-3xl p-2">
                <SelectItem value="all" className="rounded-xl font-black text-[10px] uppercase tracking-widest">GLOBAL QUEUE</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()} className="rounded-xl font-black text-[10px] uppercase tracking-widest">{g.name.toUpperCase()} UNIT</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => aiReorderMutation.mutate()}
            disabled={aiReorderMutation.isPending}
            className="h-16 px-10 rounded-[1.75rem] font-black uppercase text-sm tracking-widest shadow-elevation-2xl shadow-primary/30 bg-gradient-to-br from-primary via-primary to-purple-600 text-white hover:scale-[1.05] transition-all group/ai"
          >
            {aiReorderMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Brain className="h-6 w-6 mr-3 group-hover/ai:scale-125 transition-transform" />}
            NEURAL-SYNC
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col gap-8">
              <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                  <div className={`h-4 w-4 rounded-full shadow-lg ${col.id === 'todo' ? 'bg-muted-foreground' :
                    col.id === 'in-progress' ? 'bg-blue-500' :
                      col.id === 'review' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                  <h3 className="text-3xl font-black tracking-tighter uppercase leading-none opacity-80">{col.title}</h3>
                </div>
                <Badge variant="outline" className="h-8 min-w-[3rem] px-3 font-black text-[10px] opacity-40 rounded-xl border-border/40 justify-center">
                  {filteredTasks.filter((t) => t.status === col.id).length}
                </Badge>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 min-h-[600px] rounded-[3rem] border-4 border-dashed transition-all duration-500 p-6 ${snapshot.isDraggingOver ? "bg-primary/5 border-primary/40 shadow-elevation-lg" : "bg-muted/5 border-border/20"
                      }`}
                  >
                    <div className="space-y-6">
                      {filteredTasks
                        .filter((t) => t.status === col.id)
                        .sort((a, b) => (a.kanbanOrder || 0) - (b.kanbanOrder || 0))
                        .map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                className={`transform transition-all active:scale-95 ${snapshot.isDragging ? "z-50" : ""}`}
                              >
                                <Card className={`group/task border-none rounded-[2rem] bg-card/60 backdrop-blur-xl shadow-elevation-md hover:shadow-elevation-xl transition-all duration-300 overflow-hidden relative ${snapshot.isDragging ? "shadow-elevation-3xl border-2 border-primary/40 rotate-2 scale-105" : ""
                                  }`}>
                                  <div className={`h-2 w-full absolute top-0 left-0 ${task.priority === 'high' ? 'bg-red-500' :
                                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                    } opacity-60 group-hover/task:opacity-100 transition-opacity`} />
                                  <CardHeader className="p-8 pb-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-3 flex-1">
                                        <CardTitle className="text-xl font-black tracking-tight leading-snug group-hover/task:text-primary transition-colors cursor-grab">
                                          {task.title.toUpperCase()}
                                        </CardTitle>
                                        <Badge variant="outline" className={`text-[9px] uppercase font-black px-4 py-1 rounded-full ${task.priority === 'high' ? 'border-red-500/40 text-red-500 bg-red-500/5' :
                                          task.priority === 'medium' ? 'border-amber-500/40 text-amber-500 bg-amber-500/5' : 'border-blue-500/40 text-blue-500 bg-blue-500/5'
                                          }`}>
                                          {task.priority.toUpperCase()} PRIORITY
                                        </Badge>
                                      </div>
                                      <GripVertical className="h-6 w-6 text-muted-foreground opacity-20 group-hover/task:opacity-60 transition-opacity" />
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-8 pt-4 space-y-4">
                                    <div className="flex flex-wrap gap-4">
                                      {task.subjectId && subjectMap.has(task.subjectId) && (
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border-2 border-border/10">
                                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectMap.get(task.subjectId!)?.color }} />
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{subjectMap.get(task.subjectId!)?.name}</span>
                                        </div>
                                      )}
                                      {task.deadline && (
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border-2 border-border/10">
                                          <Calendar className="h-3.5 w-3.5 opacity-40" />
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{new Date(task.deadline).toLocaleDateString()}</span>
                                        </div>
                                      )}
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
    </div>
  );
}
