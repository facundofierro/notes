import { z } from "zod";

// Base step
const StepBase = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  timeout: z.number().optional(),
});

// 1. Navigation & Setup
export const OpenStep = StepBase.extend({
  action: z.literal("open"),
  url: z.string(),
});

export const WaitStep = StepBase.extend({
  action: z.literal("wait"),
  type: z.enum(["element", "text", "url", "time"]),
  value: z.union([z.string(), z.number()]), // number for time, string for others
});

export const SetViewportStep = StepBase.extend({
  action: z.literal("setViewport"),
  width: z.number(),
  height: z.number(),
});

// 2. Interaction
export const ClickStep = StepBase.extend({
  action: z.literal("click"),
  selector: z.string(), // Can be ref (@e1) or css
});

export const TypeStep = StepBase.extend({
  action: z.literal("type"),
  selector: z.string(),
  text: z.string(),
});

export const SelectStep = StepBase.extend({
  action: z.literal("select"),
  selector: z.string(),
  option: z.string(),
});

export const CheckStep = StepBase.extend({
  action: z.literal("check"),
  selector: z.string(),
});

export const HoverStep = StepBase.extend({
  action: z.literal("hover"),
  selector: z.string(),
});

export const PressStep = StepBase.extend({
  action: z.literal("press"),
  key: z.string(),
});

export const ScrollStep = StepBase.extend({
  action: z.literal("scroll"),
  target: z.string().optional(), // element selector
  x: z.number().optional(),
  y: z.number().optional(),
});

// 3. State & Observation
export const SnapshotStep = StepBase.extend({
  action: z.literal("snapshot"),
});

export const ScreenshotStep = StepBase.extend({
  action: z.literal("screenshot"),
  name: z.string().optional(),
});

// 4. AI & Validation
export const AIPromptStep = StepBase.extend({
  action: z.literal("prompt"),
  instruction: z.string(),
});

export const VerifyVisibleStep = StepBase.extend({
  action: z.literal("verifyVisible"),
  selector: z.string(),
});

export const TestStep = z.discriminatedUnion("action", [
  OpenStep,
  WaitStep,
  SetViewportStep,
  ClickStep,
  TypeStep,
  SelectStep,
  CheckStep,
  HoverStep,
  PressStep,
  ScrollStep,
  SnapshotStep,
  ScreenshotStep,
  AIPromptStep,
  VerifyVisibleStep,
]);

export type TestStep = z.infer<typeof TestStep>;

export const TestScenario = z.object({
  name: z.string(),
  steps: z.array(TestStep),
});

export type TestScenario = z.infer<typeof TestScenario>;
