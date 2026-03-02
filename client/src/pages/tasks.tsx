import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CheckCircle2,
  Clock,
  Pencil,
  Calendar,
  Trash2,
  ListTodo,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PRIORITIES } from "@/lib/constants";
import type { Subject, Task } from "@shared/schema";

function TaskForm({
  task,
  subjects,
  onClose,
}: {
  task?: Task;
  subjects: Subject[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [subjectId, setSubjectId] = useState(task?.subjectId?.toString() || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [status, setStatus] = useState(task?.status || "todo");
  const [deadline, setDeadline] = useState(task?.deadline || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task?.estimatedMinutes?.toString() || ""
  );
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/tasks/${task!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update task", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;
    const data = {
      title: title.trim(),
      description: description.trim() || null,
      subjectId: parseInt(subjectId),
      priority,
      status,
      deadline: deadline || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    };
    if (task) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Complete Chapter 5 exercises"
          data-testid="input-task-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-desc">Description (optional)</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          className="resize-none"
          rows={3}
          data-testid="input-task-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger data-testid="select-task-subject">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="select-task-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-deadline">Deadline</Label>
          <Input
            id="task-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            data-testid="input-task-deadline"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-est">Est. Minutes</Label>
          <Input
            id="task-est"
            type="number"
            min="1"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="60"
            data-testid="input-task-estimated"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-task">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !title.trim() || !subjectId} data-testid="button-save-task">
          {isPending ? "Saving..." : task ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  subject,
  onEdit,
  onToggle,
  onDelete,
}: {
  task: Task;
  subject?: Subject;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const priority = PRIORITIES[task.priority as keyof typeof PRIORITIES] || PRIORITIES.medium;
  const PriorityIcon = priority.icon;
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== "completed";

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-4 transition-all duration-200 hover:border-primary/30 ${
        task.status === "completed" ? "opacity-60" : ""
      }`}
      data-testid={`card-task-${task.id}`}
    >
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={onToggle}
        className="mt-0.5"
        data-testid={`checkbox-task-${task.id}`}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-sm font-medium ${
              task.status === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </p>
          <PriorityIcon className={`h-3.5 w-3.5 shrink-0 ${priority.className}`} />
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {subject && (
            <span className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              {subject.name}
            </span>
          )}
          {deadline && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
              <Calendar className="h-3 w-3" />
              {deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {isOverdue && " (overdue)"}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes}min
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit task" data-testid={`button-edit-task-${task.id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete task" data-testid={`button-delete-task-${task.id}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const { toast } = useToast();

  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const { data: tasks = [], isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, {
        status: completed ? "completed" : "todo",
        completedAt: completed ? new Date().toISOString() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  const filteredTasks = filterSubject === "all"
    ? tasks
    : tasks.filter((t) => t.subjectId === parseInt(filterSubject));

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in-progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const openCreate = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const renderTaskList = (taskList: Task[], emptyMessage: string) => {
    if (taskList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ListTodo className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {taskList.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            subject={subjectMap.get(task.subjectId)}
            onEdit={() => openEdit(task)}
            onToggle={() =>
              toggleMutation.mutate({
                id: task.id,
                completed: task.status !== "completed",
              })
            }
            onDelete={() => deleteMutation.mutate(task.id)}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-tasks-title">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.length} total, {completedTasks.length} completed
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-40" data-testid="select-filter-subject">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
                <DialogDescription>
                  {editingTask ? "Update task details." : "Create a new study task."}
                </DialogDescription>
              </DialogHeader>
              <TaskForm
                task={editingTask}
                subjects={subjects}
                onClose={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList data-testid="tabs-task-status">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({filteredTasks.length})
          </TabsTrigger>
          <TabsTrigger value="todo" data-testid="tab-todo">
            To Do ({todoTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" data-testid="tab-in-progress">
            In Progress ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Done ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {renderTaskList(filteredTasks, "No tasks yet. Create your first task!")}
        </TabsContent>
        <TabsContent value="todo" className="mt-4">
          {renderTaskList(todoTasks, "No tasks to do")}
        </TabsContent>
        <TabsContent value="in-progress" className="mt-4">
          {renderTaskList(inProgressTasks, "No tasks in progress")}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderTaskList(completedTasks, "No completed tasks")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
