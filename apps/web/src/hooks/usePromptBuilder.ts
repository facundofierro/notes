import React from "react";
import { ViewMode } from "@/lib/view-config";
import {
  formatTestOutputForPrompt,
  inferTestExecutionStatus,
} from "@/lib/test-output";

export interface PromptBuilderOptions {
  promptText: string;
  mode: "agent" | "plan" | "chat";
  docMode: "modify" | "start";
  file: {
    path: string;
  };
  viewMode: ViewMode;
  testContext?: {
    testViewMode: "steps" | "code" | "results";
    testOutput?: string;
    testStatus?: "success" | "failure" | "running";
  };
  selectedRepo: string | null;
}

export function usePromptBuilder() {
  const buildToolPrompt = React.useCallback(
    (opts: PromptBuilderOptions) => {
      const trimmed = opts.promptText.trim();
      if (!trimmed) return "";

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

      const effectiveDocMode: "modify" | "start" =
        isTestDoc || isAiDoc ? "modify" : opts.docMode;

      const operation =
        effectiveDocMode === "modify"
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

      if (operation === "create_tasks_from_epic") {
        return [
          `Create task files from the epic document at "${filePath}".`,
          "",
          "User instructions:",
          trimmed,
          "",
          "What to do:",
          "- Read the epic document and extract its goal and acceptance criteria.",
          "- Propose a set of tasks that together satisfy the epic acceptance criteria.",
          "- For each proposed task, include: title, story points, priority (two digits), short description, and the proposed file path.",
          "- Ask for confirmation before creating any task files.",
          "",
          "Where to create task files:",
          '- Prefer ".agelum/work/tasks/pending/<EPIC TITLE>/" if the repo uses ".agelum".',
          '- Otherwise use "agelum/tasks/pending/<EPIC TITLE>/" (legacy structure).',
          "",
          "Task file naming convention:",
          '- "<PRIORITY> <TASK TITLE> (<STORY_POINTS>).md" (example: "01 Design new hero section (3).md").',
          "",
          "Task file format:",
          "---",
          "title: <Task title>",
          "created: <ISO timestamp>",
          "type: task",
          "state: pending",
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
        return [
          `Work on the task document at "${filePath}" as the source of requirements and acceptance criteria.`,
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
