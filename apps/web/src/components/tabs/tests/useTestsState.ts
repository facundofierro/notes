import * as React from "react";
import type { TestScenario, TestCenterView, TestExecution, TestExecutionSummary } from "./types";

export function useTestsState() {
  // Tests list
  const [tests, setTests] = React.useState<TestScenario[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Selection & view
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(null);
  const [centerView, setCenterView] = React.useState<TestCenterView>({ kind: "dashboard" });

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Execution streaming
  const [isRunning, setIsRunning] = React.useState(false);
  const [runningTestId, setRunningTestId] = React.useState<string | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = React.useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = React.useState<string[]>([]);
  const [executionScreenshots, setExecutionScreenshots] = React.useState<string[]>([]);

  // Execution history
  const [executions, setExecutions] = React.useState<TestExecutionSummary[]>([]);
  const [executionsLoading, setExecutionsLoading] = React.useState(false);

  // --- Fetch tests ---
  const fetchTests = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // --- Fetch executions ---
  const fetchExecutions = React.useCallback(async (testId?: string) => {
    setExecutionsLoading(true);
    try {
      const url = testId ? `/api/tests/executions?testId=${testId}` : "/api/tests/executions";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecutionsLoading(false);
    }
  }, []);

  // --- Sidebar resize ---
  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 200 && newWidth < 500) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- Navigation ---
  const selectTest = React.useCallback((test: TestScenario) => {
    setSelectedTestId(test.id);
    setCenterView({ kind: "detail", testId: test.id });
  }, []);

  const goToDashboard = React.useCallback(() => {
    setSelectedTestId(null);
    setCenterView({ kind: "dashboard" });
    fetchTests();
    fetchExecutions();
  }, [fetchTests, fetchExecutions]);

  const openExecution = React.useCallback((executionId: string, testId: string) => {
    setCenterView({ kind: "execution", executionId, testId });
  }, []);

  // --- CRUD ---
  const createTest = React.useCallback(async (name?: string, group?: string) => {
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        body: JSON.stringify({ name: name || "Untitled Test", group: group || "experimental", steps: [] }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        await fetchTests();
        setSelectedTestId(data.id);
        setCenterView({ kind: "detail", testId: data.id });
        return data;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [fetchTests]);

  const deleteTest = React.useCallback(async (id: string) => {
    try {
      await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (selectedTestId === id) {
        goToDashboard();
      }
      await fetchTests();
    } catch (e) {
      console.error(e);
    }
  }, [selectedTestId, goToDashboard, fetchTests]);

  // --- Run test ---
  const runTest = React.useCallback(async (testId: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunningTestId(testId);
    setExecutionLogs([]);
    setExecutionScreenshots([]);
    setCurrentExecutionId(null);

    try {
      const res = await fetch("/api/tests/execute", {
        method: "POST",
        body: JSON.stringify({ id: testId }),
        headers: { "Content-Type": "application/json" }
      });

      const execId = res.headers.get("X-Execution-Id");
      if (execId) {
        setCurrentExecutionId(execId);
        setCenterView({ kind: "execution", executionId: execId, testId });
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        const lastPart = lines.pop();
        buffer = lastPart !== undefined ? lastPart : "";

        for (const line of lines) {
          if (!line.trim()) continue;
          setExecutionLogs(prev => [...prev, line]);

          try {
            const jsonMatch = line.match(/^\{.*\}$/);
            if (jsonMatch) {
              const event = JSON.parse(jsonMatch[0]);
              if (event.type === "exec_start" && event.executionId) {
                setCurrentExecutionId(event.executionId);
                if (!execId) {
                  setCenterView({ kind: "execution", executionId: event.executionId, testId });
                }
              }
              if (event.type === "screenshot" && event.path) {
                const parts = event.path.split(".agelum/tests/runs/");
                if (parts.length > 1) {
                  const url = `/api/tests/artifacts/${parts[1]}`;
                  setExecutionScreenshots(prev => [...prev, url]);
                }
              }
            }
          } catch {
            // not JSON
          }
        }
      }
    } catch (e: any) {
      setExecutionLogs(prev => [...prev, `Error: ${e.message}`]);
    } finally {
      setIsRunning(false);
      setRunningTestId(null);
      // Refresh executions after run
      fetchExecutions(testId);
    }
  }, [isRunning, fetchExecutions]);

  // Selected test object
  const selectedTest = React.useMemo(() => {
    return tests.find(t => t.id === selectedTestId) || null;
  }, [tests, selectedTestId]);

  return {
    // Tests
    tests,
    loading,
    fetchTests,
    selectedTest,
    selectedTestId,

    // Center view
    centerView,
    setCenterView,

    // Sidebar
    sidebarWidth,
    isResizing,
    sidebarRef,
    startResizing,

    // Navigation
    selectTest,
    goToDashboard,
    openExecution,

    // CRUD
    createTest,
    deleteTest,

    // Execution
    isRunning,
    runningTestId,
    currentExecutionId,
    executionLogs,
    executionScreenshots,
    runTest,

    // Execution history
    executions,
    executionsLoading,
    fetchExecutions,
  };
}
