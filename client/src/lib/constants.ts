import {
  BookOpen,
  Calculator,
  Code,
  Atom,
  Clock,
  GraduationCap,
  Beaker,
  Globe,
  Music,
  Palette,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
} from "lucide-react";

export const PRIORITIES = {
  high: { label: "High", color: "#EF4444", icon: ArrowUpCircle, className: "text-red-500" },
  medium: { label: "Medium", color: "#F59E0B", icon: ArrowRightCircle, className: "text-yellow-500" },
  low: { label: "Low", color: "#10B981", icon: ArrowDownCircle, className: "text-green-500" },
} as const;

export const STATUSES = {
  todo: { label: "To Do", color: "#64748B" },
  "in-progress": { label: "In Progress", color: "#3B82F6" },
  review: { label: "Review", color: "#F59E0B" },
  completed: { label: "Completed", color: "#10B981" },
} as const;

export const SUBJECT_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

export const SUBJECT_ICONS: Record<string, React.ElementType> = {
  BookOpen,
  Calculator,
  Code,
  Atom,
  Clock,
  GraduationCap,
  Beaker,
  Globe,
  Music,
  Palette,
};

export type PriorityKey = keyof typeof PRIORITIES;
export type StatusKey = keyof typeof STATUSES;
