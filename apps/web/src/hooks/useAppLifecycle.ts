import React from "react";

export function useAppLifecycle(state: {
  selectedRepo: string | null;
  currentProjectConfig: { url?: string; commands?: Record<string, string> } | null;
  currentProjectPath: string | null;
  appLogsAbortControllerRef: React.MutableRefObject<AbortController | null>;
  setAppLogs: (fn: (prev: string) => string) => void;
  setIsAppStarting: (val: boolean) => void;
  setViewMode: (val: string) => void;
  setLogStreamPid: (val: number | null) => void;
  setAppPid: (val: number | null) => void;
  setIsAppRunning: (val: boolean) => void;
  setIsAppManaged: (val: boolean) => void;
  setIframeUrl: (val: string) => void;
}) {
  const handleStartApp = React.useCallback(async () => {
    if (!state.selectedRepo) return;

    const devCommand =
      state.currentProjectConfig?.commands?.dev || "pnpm dev";
    const repoPath = state.currentProjectPath || "unknown";

    const banner = [
      `\x1b[36m━━━ Starting: ${state.selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");

    state.setAppLogs(() => banner);
    state.setIsAppStarting(true);
    state.setViewMode("logs");

    if (state.appLogsAbortControllerRef.current) {
      state.appLogsAbortControllerRef.current.abort();
    }
    state.setLogStreamPid(null);

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: state.selectedRepo,
          action: "start",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        state.setAppLogs(
          (prev) =>
            prev + `\x1b[31mError: ${data.error || "Failed to start app"}\x1b[0m\n`
        );
        state.setIsAppStarting(false);
        return;
      }

      if (data.pid) {
        state.setAppPid(data.pid);
        state.setIsAppRunning(true);
        state.setIsAppManaged(true);
        state.setLogStreamPid(data.pid);
      } else {
        state.setAppLogs(
          (prev) =>
            prev +
            "\x1b[31mError: Missing process id from start response\x1b[0m\n"
        );
        state.setIsAppStarting(false);
      }
    } catch (error) {
      state.setAppLogs((prev) => prev + `\x1b[31mError: ${error}\x1b[0m\n`);
      state.setIsAppStarting(false);
    }
  }, [state]);

  const handleStopApp = React.useCallback(async () => {
    if (!state.selectedRepo) return;

    if (state.appLogsAbortControllerRef.current) {
      state.appLogsAbortControllerRef.current.abort();
      state.appLogsAbortControllerRef.current = null;
    }
    state.setLogStreamPid(null);

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: state.selectedRepo,
          action: "stop",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        state.setAppLogs(
          (prev) => prev + `\x1b[31mError stopping: ${data.error}\x1b[0m\n`
        );
      } else {
        state.setAppLogs((prev) => prev + "\x1b[33m[Stopped]\x1b[0m\n");
        state.setIsAppRunning(false);
        state.setIsAppManaged(false);
        state.setAppPid(null);
      }
    } catch (error) {
      state.setAppLogs(
        (prev) => prev + `\x1b[31mError stopping: ${error}\x1b[0m\n`
      );
    }
  }, [state]);

  const handleRestartApp = React.useCallback(async () => {
    if (!state.selectedRepo) return;

    const devCommand =
      state.currentProjectConfig?.commands?.dev || "pnpm dev";
    const repoPath = state.currentProjectPath || "unknown";

    if (state.appLogsAbortControllerRef.current) {
      state.appLogsAbortControllerRef.current.abort();
    }
    state.setLogStreamPid(null);

    const banner = [
      `\x1b[36m━━━ Restarting: ${state.selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");

    state.setAppLogs(() => banner);
    state.setIsAppStarting(true);
    state.setViewMode("logs");

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: state.selectedRepo,
          action: "restart",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        state.setAppLogs(
          (prev) =>
            prev +
            `\x1b[31mError: ${data.error || "Failed to restart app"}\x1b[0m\n`
        );
        state.setIsAppStarting(false);
      } else if (data.pid) {
        state.setAppPid(data.pid);
        state.setIsAppRunning(true);
        state.setIsAppManaged(true);
        state.setLogStreamPid(data.pid);
      }
    } catch (error) {
      state.setAppLogs((prev) => prev + `\x1b[31mError: ${error}\x1b[0m\n`);
      state.setIsAppStarting(false);
    }
  }, [state]);

  return {
    handleStartApp,
    handleStopApp,
    handleRestartApp,
  };
}
