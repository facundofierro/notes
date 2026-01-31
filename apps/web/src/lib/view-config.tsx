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
  plan: { label: "Plan", icon: Map },
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
  commands: {
    label: "Commands",
    icon: Terminal,
  },
  "cli-tools": {
    label: "Cli tools",
    icon: Wrench,
  },
  separator: {
    label: "Separator",
    icon: Minus,
  },
};

export type ViewMode = keyof typeof VIEW_MODE_CONFIG;
