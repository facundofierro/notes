import {
  Lightbulb,
  BookOpen,
  Map,
  Layers,
  ListTodo,
  TestTube,
  Eye,
  Globe,
  Terminal,
  Wrench,
  Minus,
  ScrollText,
  Sparkles,
} from "lucide-react";

export const VIEW_MODE_CONFIG: Record<
  string,
  { label: string; icon: any; color: "amber" | "blue" | "green" }
> = {
  ideas: {
    label: "Ideas",
    icon: Lightbulb,
    color: "amber",
  },
  docs: {
    label: "Docs",
    icon: BookOpen,
    color: "amber",
  },
  epics: {
    label: "Epics",
    icon: Layers,
    color: "blue",
  },
  kanban: {
    label: "Tasks",
    icon: ListTodo,
    color: "blue",
  },
  tests: {
    label: "Tests",
    icon: TestTube,
    color: "green",
  },
  review: {
    label: "Review",
    icon: Eye,
    color: "blue",
  },
  ai: {
    label: "AI",
    icon: Sparkles,
    color: "amber",
  },
  tools: {
    label: "Tools",
    icon: Wrench,
    color: "blue",
  },
  browser: {
    label: "Browser",
    icon: Globe,
    color: "green",
  },
  logs: {
    label: "Terminal",
    icon: Terminal,
    color: "green",
  },
  separator: {
    label: "Separator",
    icon: Minus,
    color: "amber",
  },
};

export type ViewMode = keyof typeof VIEW_MODE_CONFIG;

export function getViewModeColor(mode: string | undefined): {
  text: string;
  bg: string;
  badge: string;
  border: string;
  icon: string;
  hover: string;
  folder: string;
  folderLight: string;
  file: string;
  folderBar: string;
  fileBar: string;
  folderGlow: string;
  fileGlow: string;
  dot: string;
} {
  const config = mode ? VIEW_MODE_CONFIG[mode] : null;
  const color = config?.color || "blue";

  switch (color) {
    case "amber":
      return {
        text: "text-amber-500",
        bg: "bg-amber-500/10",
        badge: "bg-amber-500/20",
        border: "border-amber-500/20",
        icon: "text-amber-400",
        hover: "hover:bg-amber-500/5",
        folder: "text-yellow-500",
        folderLight: "text-yellow-400",
        file: "text-muted-foreground",
        folderBar: "bg-yellow-500/70",
        fileBar: "bg-amber-500/70",
        folderGlow: "rgba(234, 179, 8, 0.4)",
        fileGlow: "rgba(245, 158, 11, 0.4)",
        dot: "bg-amber-500",
      };
    case "green":
      return {
        text: "text-green-500",
        bg: "bg-green-500/10",
        badge: "bg-green-500/20",
        border: "border-green-500/20",
        icon: "text-green-400",
        hover: "hover:bg-green-500/5",
        folder: "text-emerald-500",
        folderLight: "text-emerald-400",
        file: "text-muted-foreground",
        folderBar: "bg-emerald-500/70",
        fileBar: "bg-green-500/70",
        folderGlow: "rgba(16, 185, 129, 0.4)",
        fileGlow: "rgba(34, 197, 94, 0.4)",
        dot: "bg-green-500",
      };
    case "blue":
    default:
      return {
        text: "text-blue-500",
        bg: "bg-blue-500/10",
        badge: "bg-blue-500/20",
        border: "border-blue-500/20",
        icon: "text-blue-400",
        hover: "hover:bg-blue-500/5",
        folder: "text-blue-500",
        folderLight: "text-blue-400",
        file: "text-muted-foreground",
        folderBar: "bg-blue-500/70",
        fileBar: "bg-indigo-500/70",
        folderGlow: "rgba(59, 130, 246, 0.4)",
        fileGlow: "rgba(99, 102, 241, 0.4)",
        dot: "bg-blue-500",
      };
  }
}
