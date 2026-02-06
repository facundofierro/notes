import React from "react";
import { inferTestExecutionStatus } from "@/lib/test-output";
import { TestsSetupStatus } from "./useHomeState";

export function useTestsManager(state: {
  selectedRepo: string | null;
  testOutput: string;
  setTestOutput: (val: string | ((prev: string) => string)) => void;
  isTestRunning: boolean;
  setIsTestRunning: (val: boolean) => void;
  setTestViewMode: (val: "steps" | "code" | "results") => void;
  setPromptDrafts: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  testsSetupStatus: TestsSetupStatus | null;
  setTestsSetupStatus: (val: TestsSetupStatus | null) => void;
  setIsSetupLogsVisible: (val: boolean) => void;
  viewMode: string;
  testsSetupState: string | null;
}) {
  const handleRunTest = React.useCallback(
    async (path: string) => {
      state.setTestOutput("");
      state.setIsTestRunning(true);
      state.setTestViewMode("results");

      let fullOutput = "";
      try {
        const response = await fetch("/api/tests/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          fullOutput += text;
          state.setTestOutput((prev) => prev + text);
        }
      } catch (error) {
        fullOutput += "\nError running test";
        state.setTestOutput((prev) => prev + "\nError running test");
      } finally {
        state.setIsTestRunning(false);
        const status = inferTestExecutionStatus(fullOutput, false);
        if (status === "failure") {
          state.setPromptDrafts((prev) => {
            const key = "tests:results";
            if (prev[key]?.trim()) return prev;
            return {
              ...prev,
              [key]: `Fix the error in "${path}" so the test passes.`,
            };
          });
        }
      }
    },
    [state]
  );

  return {
    handleRunTest,
  };
}
