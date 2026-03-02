import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  BookOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SUBJECT_COLORS, SUBJECT_ICONS } from "@/lib/constants";
import type { Subject, Task } from "@shared/schema";

function SubjectForm({
  subject,
  onClose,
}: {
  subject?: Subject;
  onClose: () => void;
}) {
  const [name, setName] = useState(subject?.name || "");
  const [color, setColor] = useState(subject?.color || SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState(subject?.icon || "BookOpen");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; icon: string }) => {
      const res = await apiRequest("POST", "/api/subjects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Subject created successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create subject", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; icon: string }) => {
      const res = await apiRequest("PATCH", `/api/subjects/${subject!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Subject updated successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update subject", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), color, icon };
    if (subject) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject-name">Name</Label>
        <Input
          id="subject-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mathematics"
          data-testid="input-subject-name"
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                }`}
              style={{ backgroundColor: c }}
              data-testid={`color-option-${c}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUBJECT_ICONS).map(([key, IconComp]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-all ${icon === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover-elevate"
                }`}
              data-testid={`icon-option-${key}`}
            >
              <IconComp className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-subject">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !name.trim()} data-testid="button-save-subject">
          {isPending ? "Saving..." : subject ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

export default function SubjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const { toast } = useToast();

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Subject deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingSubject(undefined);
    setDialogOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-subjects-title">Subjects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your study subjects and organize tasks.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="button-add-subject">
              <Plus className="h-4 w-4 mr-1" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? "Edit Subject" : "New Subject"}</DialogTitle>
              <DialogDescription>
                {editingSubject ? "Update your subject details." : "Add a new study subject."}
              </DialogDescription>
            </DialogHeader>
            <SubjectForm
              subject={editingSubject}
              onClose={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No subjects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first subject to start organizing your studies.
            </p>
            <Button onClick={openCreate} data-testid="button-add-first-subject">
              <Plus className="h-4 w-4 mr-1" />
              Add Subject
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, index) => {
            const IconComp = SUBJECT_ICONS[subject.icon] || BookOpen;
            const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
            const completed = subjectTasks.filter((t) => t.status === "completed").length;
            const total = subjectTasks.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card key={subject.id} className="hover-elevate group animate-scale-in opacity-0" style={{ animationDelay: `${index * 0.05}s` }} data-testid={`card-subject-${subject.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${subject.color}20`, color: subject.color }}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground">{total} tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(subject)}
                        aria-label="Edit subject"
                        data-testid={`button-edit-subject-${subject.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(subject.id)}
                        aria-label="Delete subject"
                        data-testid={`button-delete-subject-${subject.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: subject.color }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{completed} done</span>
                      <span className="text-border">|</span>
                      <span>{total - completed} remaining</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1" data-testid={`difficulty-${subject.id}`}>
                      <span className="text-xs text-muted-foreground mr-1">Difficulty</span>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-2 w-2 rounded-full ${level > (subject.difficultyLevel ?? 3) ? "bg-muted" : ""}`}
                          style={level <= (subject.difficultyLevel ?? 3) ? { backgroundColor: subject.color } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
