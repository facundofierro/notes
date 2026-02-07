export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

export type TestsSetupState =
  | "missing"
  | "initializing"
  | "installing"
  | "ready"
  | "error";

export interface TestsSetupStatus {
  state: TestsSetupState;
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority" // Legacy
    | "fixes"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  epic?: string;
  assignee?: string;
  path?: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "fixes"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  path?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  state:
    | "thinking"
    | "important"
    | "priority"
    | "planned"
    | "done";
  createdAt: string;
  path?: string;
}

export type AnnotationType = "modify" | "arrow" | "remove";

export interface Annotation {
  id: number;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  prompt: string;
}

export interface NetworkLog {
  requestId: string;
  method: string;
  url: string;
  status?: number;
  type?: string;
  size?: number;
  timestamp: number;
  duration?: number;
  finished: boolean;
}
