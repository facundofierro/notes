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
    icon: Wrench,
  },
  browser: {
    label: "Browser",
    icon: Globe,
  },
  logs: {
    label: "Logs",
    icon: ScrollText,
  },
  separator: {
    label: "Separator",
    icon: Minus,
  },
};

export type ViewMode = keyof typeof VIEW_MODE_CONFIG;
