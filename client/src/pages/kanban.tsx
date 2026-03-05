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
  { id: "todo" as const, title: "To Study" },
  { id: "in-progress" as const, title: "Learning" },
  { id: "review" as const, title: "Revision" },
  { id: "completed" as const, title: "Mastered" },
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
    <div className="min-h-screen bg-transparent animate-fade-in pb-40 relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Modern Header Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 py-10 px-10 bg-card/60 backdrop-blur-2xl rounded-[2.5rem] border border-border/50 shadow-xl overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <LayoutGrid className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                    Study Board
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-3">Active</Badge>
                  </h1>
                  <p className="text-muted-foreground text-sm font-medium opacity-80 mt-1 max-w-xl">
                    Visualize your study path and manage your learning goals with precision.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 relative z-10">
              <div className="flex items-center gap-3 p-1.5 pl-4 rounded-2xl bg-muted/40 border border-border/40 focus-within:ring-2 ring-primary/20 transition-all">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-40 bg-transparent border-none font-bold text-xs uppercase tracking-wider focus:ring-0">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                    <SelectItem value="all" className="rounded-xl font-bold text-xs">All Subjects</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()} className="rounded-xl font-bold text-xs">{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => aiReorderMutation.mutate()}
                disabled={aiReorderMutation.isPending}
                className="h-12 px-8 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all group/ai"
              >
                {aiReorderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 group-hover/ai:rotate-12 transition-transform" />}
                Smart Optimize
              </Button>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {KANBAN_COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col gap-6 group/col">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full shadow-lg animate-pulse ${col.id === 'todo' ? 'bg-slate-400' :
                      col.id === 'in-progress' ? 'bg-blue-500' :
                        col.id === 'review' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                    <h3 className="text-sm font-black tracking-[0.15em] uppercase opacity-60 group-hover/col:opacity-100 transition-opacity">
                      {col.title.replace(/-/g, ' ')}
                    </h3>
                  </div>
                  <Badge variant="outline" className="h-6 min-w-[2rem] px-2 font-bold text-[10px] opacity-40 rounded-lg justify-center border-border/50">
                    {filteredTasks.filter((t) => t.status === col.id).length}
                  </Badge>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 min-h-[650px] rounded-[2rem] border-2 border-dashed transition-all duration-500 p-4 ${snapshot.isDraggingOver ? "bg-primary/5 border-primary/30 shadow-2xl" : "bg-card/20 border-border/20"
                        }`}
                    >
                      <div className="space-y-4">
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
                                  <Card className={`group/task border-none rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden relative ${snapshot.isDragging ? "shadow-2xl ring-4 ring-primary/20 rotate-1 scale-105" : "hover-elevate"
                                    }`}>
                                    <div className={`h-1.5 w-full absolute top-0 left-0 ${task.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-400' :
                                      task.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                      } opacity-40 group-hover/task:opacity-100 transition-opacity`} />

                                    <CardHeader className="p-5 pb-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2 flex-1">
                                          <CardTitle className="text-base font-bold tracking-tight leading-snug group-hover/task:text-primary transition-colors cursor-grab">
                                            {task.title}
                                          </CardTitle>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                              }`}>
                                              {task.priority}
                                            </Badge>
                                            {task.riskLevel === 'high' && (
                                              <Badge variant="destructive" className="text-[9px] font-black animate-pulse px-2 py-0.5 rounded-md uppercase">High Risk</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-20 group-hover/task:opacity-60 transition-opacity" />
                                      </div>
                                    </CardHeader>

                                    <CardContent className="p-5 pt-0 space-y-4">
                                      <div className="flex flex-wrap gap-2">
                                        {task.subjectId && subjectMap.has(task.subjectId) && (
                                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/30 border border-border/10">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectMap.get(task.subjectId!)?.color }} />
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{subjectMap.get(task.subjectId!)?.name}</span>
                                          </div>
                                        )}
                                        {task.deadline && (
                                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/30 border border-border/10">
                                            <Calendar className="h-3 w-3 text-muted-foreground opacity-60" />
                                            <span className="text-[9px] font-bold text-muted-foreground">{new Date(task.deadline).toLocaleDateString()}</span>
                                          </div>
                                        )}
                                        {task.estimatedMinutes && (
                                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/30 border border-border/10">
                                            <Clock className="h-3 w-3 text-muted-foreground opacity-60" />
                                            <span className="text-[9px] font-bold text-muted-foreground">{task.estimatedMinutes}m</span>
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
    </div>
  );
}
