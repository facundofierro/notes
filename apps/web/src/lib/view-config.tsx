import {
  Lightbulb,
  BookOpen,
  Map,
  Layers,
  ListTodo,
  TestTube,
  Terminal,
  Wrench,
  Minus,
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
  ai: {
    label: "AI",
    icon: Wrench,
  },
  separator: {
    label: "Separator",
    icon: Minus,
  },
};

export type ViewMode = keyof typeof VIEW_MODE_CONFIG;
