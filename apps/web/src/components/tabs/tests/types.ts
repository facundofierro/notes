
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
