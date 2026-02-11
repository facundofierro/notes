import React from "react";
import { ViewMode } from "@/lib/view-config";
import {
  formatTestOutputForPrompt,
  inferTestExecutionStatus,
} from "@/lib/test-output";

export interface PromptBuilderOptions {
  promptText: string;
  mode: "agent" | "plan" | "chat";
  docMode: "modify" | "start" | "plan";
  file: {
    path: string;
    planPath?: string;
  };
  viewMode: ViewMode;
  testContext?: {
    testViewMode: "steps" | "code" | "results";
    testOutput?: string;
    testStatus?: "success" | "failure" | "running";
  };
  selectedRepo: string | null;
  generatedPlanPath?: string; // Pre-generated plan path for deterministic linking
  generatedSummaryPath?: string; // Pre-generated summary path for deterministic linking
}

export function usePromptBuilder() {
  const buildToolPrompt = React.useCallback(
    (opts: PromptBuilderOptions) => {
      const trimmed = opts.promptText.trim();
      const isPlanOrStart = opts.docMode === "plan" || opts.docMode === "start";
      if (!trimmed && !isPlanOrStart) return "";

      const filePath = opts.file.path;
      const normalizedPath = filePath.replace(/\\/g, "/");
      const isEpicDoc =
        normalizedPath.includes("/.agelum/work/epics/") ||
        normalizedPath.includes("/agelum/epics/") ||
        opts.viewMode === "epics";
      const isTaskDoc =
        normalizedPath.includes("/.agelum/work/tasks/") ||
        normalizedPath.includes("/agelum/tasks/") ||
        opts.viewMode === "kanban" ||
        opts.viewMode === "tasks";
      const isTestDoc =
        normalizedPath.includes("/.agelum/work/tests/") ||
        normalizedPath.includes("/agelum-test/tests/") ||
        opts.viewMode === "tests";
      const isAiDoc =
        normalizedPath.includes("/.agelum/ai/") ||
        normalizedPath.includes("/ai/") ||
        opts.viewMode === "ai";

      const effectiveDocMode: "modify" | "start" | "plan" =
        isTestDoc || isAiDoc ? "modify" : opts.docMode;

      const operation =
        effectiveDocMode === "plan"
          ? "create_plan"
          : effectiveDocMode === "modify"
            ? isTestDoc
              ? "modify_test"
              : "modify_document"
            : isEpicDoc
              ? "create_tasks_from_epic"
              : isTaskDoc
                ? "work_on_task"
                : "start";

      if (operation === "modify_test") {
        if (
          opts.testContext?.testViewMode === "results" &&
          opts.testContext?.testStatus === "failure" &&
          opts.testContext?.testOutput
        ) {
          const formattedOutput = formatTestOutputForPrompt(
            opts.testContext.testOutput
          );
          return [
            `Fix the failing Stagehand test file at "${filePath}".`,
            "",
            "Failure logs from the last execution:",
            "```",
            formattedOutput,
            "```",
            "",
            "User instructions:",
            trimmed,
            "",
            "Rules:",
            "- Only modify the specified file with Stagehand test code. Request confirmation before making any other modifications.",
          ].join("\n");
        }
        return [
          `Modify the test file at "${filePath}" with these user instructions:`,
          trimmed,
          "",
          "Rules:",
          "- Only modify the specified file with Stagehand test code. Request confirmation before making any other modifications.",
        ].join("\n");
      }

      if (operation === "modify_document") {
        return [
          `Modify the file at "${filePath}" with these user instructions:`,
          trimmed,
        ].join("\n");
      }

      if (operation === "create_plan") {
        // Use the pre-generated plan path if provided, otherwise generate one
        let planPath: string;
        if (opts.generatedPlanPath) {
          planPath = opts.generatedPlanPath;
        } else {
          // Fallback: generate timestamp-based ID (shouldn't normally happen)
          const taskFileName = filePath.split('/').pop()?.replace('.md', '') || 'plan';
          const timestamp = Date.now();
          planPath = `.agelum/work/plans/${taskFileName}-${timestamp}.md`;
        }
        
        return [
          `Create a comprehensive implementation plan for the task at "${filePath}".`,
          "",
          "User instructions:",
          trimmed || "Create a plan for this task.",
          "",
          "Objectives:",
          "1. Research the codebase to understand the context and requirements.",
          "2. Ask clarifying questions if any critical information is missing or ambiguous.",
          `3. Create a detailed plan document at "${planPath}" (relative to project root).`,
          "   - If the task is large, divide the plan into phases.",
          "   - The plan should be detailed enough for an LLM to directly start working from it.",
          "   - Do NOT include testing steps (testing will be handled separately).",
          "",
          "NOTE: The task file will be automatically updated with a link to this plan, so you don't need to do that.",
        ].join("\n");
      }

      if (operation === "create_tasks_from_epic") {
        return [
          `Create task files from the epic document at "${filePath}".`,
          "",
          "User instructions:",
          trimmed,
          "",
          "Process:",
          "1. Read the epic document to understand the goal and acceptance criteria.",
          "2. Propose a set of tasks. For each task, provide:",
          "   - Title",
          "   - A very brief description",
          "   - Proposed priority (two digits, e.g., 01, 02...)",
          "   - Story points",
          "3. CRITICAL: Do NOT create any files yet. Present this list to the user and ask for confirmation or modifications.",
          "4. Once confirmed by the user (in the next turn), create the task files.",
          "",
          "Where to create task files:",
          '- Use ".agelum/work/tasks/backlog/" directory.',
          "",
          "Task file naming convention:",
          '- "<PRIORITY> <TASK TITLE> (<STORY_POINTS>).md" (example: "01 Design new hero section (3).md").',
          "",
          "Task file format:",
          "---",
          "title: <Task title>",
          "created: <ISO timestamp>",
          "type: task",
          "state: backlog",
          "priority: <two digits>",
          "storyPoints: <number>",
          "epic: <Epic title>",
          "---",
          "",
          "# <Task title>",
          "",
          "<Task description>",
          "",
          "## Acceptance Criteria",
          "- [ ] ...",
        ].join("\n");
      }

      if (operation === "work_on_task") {
        // If a plan file exists and has content, use it instead of the task file
        const planPath = opts.file.planPath;
        const targetPath = planPath || filePath;
        const contextType = planPath ? "implementation plan" : "task document";
        
        // If generating a summary, prioritize that instruction
        if (opts.generatedSummaryPath) {
          return [
            `Start working on the task at "${filePath}".`,
            "",
            `CRITICAL FIRST STEP: Create a summary of the task and your approach in "${opts.generatedSummaryPath}".`,
            "This summary file should contain a high-level overview of what needs to be done.",
            "",
            `Then, proceed with the task execution using the ${contextType} at "${targetPath}" as context.`,
            "",
            "User instructions:",
            trimmed,
            "",
            "NOTE: The task file will be automatically updated with a link to the summary.",
          ].join("\n");
        }
        
        return [
          `Work on the ${contextType} at "${targetPath}" as the source of requirements and acceptance criteria.`,
          "",
          "User instructions:",
          trimmed,
        ].join("\n");
      }

      return [
        `Start work using "${filePath}" as context.`,
        "",
        "User instructions:",
        trimmed,
      ].join("\n");
    },
    []
  );

  return { buildToolPrompt };
}
