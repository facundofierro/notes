
export interface TestStep {
  action: string;
  [key: string]: any;
}

export interface TestScenario {
  id: string;
  name: string;
  group: string; // e.g., "login", "navigation"
  folder: string;
  steps: TestStep[]; // Populated when details fetched
  updatedAt: string;
  description?: string;
  stepsCount?: number;
}

export interface TestExecution {
  id: string;
  testId: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "passed" | "failed" | "error";
  logs: string[];
  screenshots: string[];
  duration?: number; // ms
  exitCode?: number;
}

export interface TestExecutionSummary {
  id: string;
  testId: string;
  testName: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "passed" | "failed" | "error";
  duration?: number;
  screenshotCount: number;
}

export type TestCenterView =
  | { kind: "dashboard" }
  | { kind: "detail"; testId: string }
  | { kind: "execution"; executionId: string; testId: string }
  | { kind: "record"; testId: string };

export type RecordingAIBackend = "google-api" | "gemini-cli";
