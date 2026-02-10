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
  { label: string; icon: any }
> = {
  ideas: {
    label: "Ideas",
    icon: Lightbulb,
  },
  docs: {
    label: "Docs",
    icon: BookOpen,
  },
  epics: {
    label: "Epics",
    icon: Layers,
  },
  kanban: {
    label: "Tasks",
    icon: ListTodo,
  },
  tests: {
    label: "Tests",
    icon: TestTube,
  },
  review: {
    label: "Review",
    icon: Eye,
  },
  ai: {
    label: "AI",
    icon: Sparkles,
  },
  tools: {
    label: "Tools",
    icon: Wrench,
  },
  browser: {
    label: "Browser",
    icon: Globe,
  },
  logs: {
    label: "Terminal",
    icon: Terminal,
  },
  separator: {
    label: "Separator",
    icon: Minus,
  },
};

export type ViewMode = keyof typeof VIEW_MODE_CONFIG;
