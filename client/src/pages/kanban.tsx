import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  GripVertical,
} from "lucide-react";
import { PRIORITIES, STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subject, Task } from "@shared/schema";

const KANBAN_COLUMNS = [
  { id: "todo" as const, title: "Backlog" },
  { id: "in-progress" as const, title: "In Progress" },
  { id: "review" as const, title: "Review" },
  { id: "completed" as const, title: "Completed" },
];

export default function KanbanPage() {
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
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

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const taskId = parseInt(result.draggableId);
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

  const getColumnTasks = (columnId: string) => {
    return tasks
      .filter((t) => t.status === columnId)
      .sort((a, b) => (a.kanbanOrder ?? 0) - (b.kanbanOrder ?? 0));
  };

  if (loadingTasks) {
    return (
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 h-full animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-kanban-title">Kanban Board</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag and drop tasks between columns to update their status.
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[60vh]">
          {KANBAN_COLUMNS.map((column, colIndex) => {
            const columnTasks = getColumnTasks(column.id);
            const statusCfg = STATUSES[column.id];
            return (
              <div key={column.id} className="flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1 animate-slide-in" style={{ animationDelay: `${colIndex * 0.05}s`, opacity: 0 }}>
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusCfg.color }}
                  />
                  <h3 className="text-sm font-semibold">{column.title}</h3>
                  <Badge
                    variant="secondary"
                    className="ml-auto"
                    style={{ backgroundColor: `${statusCfg.color}15`, color: statusCfg.color }}
                    data-testid={`badge-column-count-${column.id}`}
                  >
                    {columnTasks.length}
                  </Badge>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-lg p-2 space-y-2 transition-colors min-h-[200px] ${
                        snapshot.isDraggingOver
                          ? "bg-primary/5 border-2 border-dashed border-primary/30"
                          : "bg-muted/30 border border-border/50"
                      }`}
                      data-testid={`kanban-column-${column.id}`}
                    >
                      {columnTasks.map((task, index) => {
                        const subject = subjectMap.get(task.subjectId);
                        const priorityKey = (task.priority as keyof typeof PRIORITIES) || "medium";
                        const priorityCfg = PRIORITIES[priorityKey] || PRIORITIES.medium;
                        const PriorityIcon = priorityCfg.icon;
                        const deadline = task.deadline ? new Date(task.deadline) : null;

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
                                className={`rounded-md border bg-card p-3 space-y-2 transition-all duration-200 ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
                                }`}
                                data-testid={`kanban-task-${task.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight">
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <PriorityIcon className={`h-4 w-4 shrink-0 ${priorityCfg.className}`} />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {subject && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                      style={{
                                        borderColor: subject.color,
                                        color: subject.color,
                                      }}
                                    >
                                      {subject.name}
                                    </Badge>
                                  )}
                                  {deadline && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {deadline.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                  {task.estimatedMinutes && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {task.estimatedMinutes}m
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
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                          Drop tasks here
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
