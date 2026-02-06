import * as React from "react";
import { useAppLifecycle } from "./useAppLifecycle";
import { useTestsManager } from "./useTestsManager";
import { HomeState } from "./useHomeState";

export function useHomeCallbacks(state: HomeState) {
  const { refetchSettings } = state;
  const browserIframeRef = React.useRef<HTMLIFrameElement>(null);

  const joinFsPath = React.useCallback(
    (...parts: string[]) =>
      parts
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/"),
    []
  );

  const fetchRepositories = React.useCallback(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        const nextRepos = (data.repositories || []) as {
          name: string;
          path: string;
        }[];
        state.setRepositories(nextRepos);
        if (data.basePath) state.setBasePath(data.basePath);

        if (nextRepos.length > 0) {
          const saved = window.localStorage.getItem("agelum.selectedRepo");
          const nextSelected =
            saved && nextRepos.some((r) => r.name === saved) ? saved : nextRepos[0].name;
          state.setSelectedRepo(nextSelected);
        }
      });
  }, [state]);

  const handleSettingsSave = React.useCallback(() => {
    fetchRepositories();
    refetchSettings();
  }, [fetchRepositories, refetchSettings]);

  const openWorkDraft = React.useCallback(
    (opts: { kind: "epic" | "task" | "idea"; state: string }) => {
      if (!state.selectedRepo) return;

      const repo = state.repositories.find((r) => r.name === state.selectedRepo);
      const repoPath = repo?.path || (state.basePath ? joinFsPath(state.basePath, state.selectedRepo) : null);

      if (!repoPath) {
        console.error("Could not determine repository path");
        return;
      }

      const createdAt = new Date().toISOString();
      const id = `${opts.kind}-${Date.now()}`;

      const baseDir =
        opts.kind === "epic"
          ? joinFsPath(repoPath, ".agelum", "work", "epics", opts.state)
          : opts.kind === "task"
            ? joinFsPath(repoPath, ".agelum", "work", "tasks", opts.state)
            : joinFsPath(repoPath, ".agelum", "doc", "ideas", opts.state);

      const draftPath = joinFsPath(baseDir, `${id}.md`);
      const content = `---
created: ${createdAt}
state: ${opts.state}
---

# ${id}

`;

      state.setSelectedFile({
        path: draftPath,
        content,
      });
      state.setWorkEditorEditing(true);
      state.setWorkDocIsDraft(true);
    },
    [state, joinFsPath]
  );

  const { handleStartApp, handleStopApp, handleRestartApp } = useAppLifecycle({
    selectedRepo: state.selectedRepo,
    currentProjectConfig: state.currentProjectConfig,
    currentProjectPath: state.currentProjectPath,
    appLogsAbortControllerRef: state.appLogsAbortControllerRef,
    setAppLogs: state.setAppLogs,
    setIsAppStarting: state.setIsAppStarting,
    setViewMode: state.setViewMode,
    setLogStreamPid: state.setLogStreamPid,
    setAppPid: state.setAppPid,
    setIsAppRunning: state.setIsAppRunning,
    setIsAppManaged: state.setIsAppManaged,
    setIframeUrl: state.setIframeUrl,
  });

  const { handleRunTest } = useTestsManager({
    selectedRepo: state.selectedRepo,
    testOutput: state.testOutput,
    setTestOutput: state.setTestOutput,
    isTestRunning: state.isTestRunning,
    setIsTestRunning: state.setIsTestRunning,
    setTestViewMode: state.setTestViewMode,
    setPromptDrafts: () => {}, // Mocked out since we moved prompt drafts
    testsSetupStatus: null,
    setTestsSetupStatus: () => {},
    setIsSetupLogsVisible: () => {},
    viewMode: state.viewMode,
    testsSetupState: null,
  });

  const handleSaveFile = React.useCallback(
    async (opts: { path: string; content: string }) => {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: opts.path,
          content: opts.content,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save file");
      }

      state.setSelectedFile((prev: { path: string; content: string } | null) =>
        prev ? { ...prev, content: opts.content } : null
      );
    },
    [state]
  );

  const handleFileSelect = React.useCallback(
    async (node: any) => {
      if (node.type === "file") {
        const content = await fetch(
          `/api/file?path=${encodeURIComponent(node.path)}`
        ).then((res) => res.json());
        state.setSelectedFile({
          path: node.path,
          content: content.content || "",
        });
        state.setWorkEditorEditing(false);
        state.setWorkDocIsDraft(false);
      }
    },
    [state]
  );

  const handleTaskSelect = React.useCallback(
    (task: any) => {
      if (!state.selectedRepo || !task.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
          : "";

      const filePath = task.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleEpicSelect = React.useCallback(
    (epic: any) => {
      if (!state.selectedRepo || !epic.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
          : "";

      const filePath = epic.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleIdeaSelect = React.useCallback(
    (idea: any) => {
      if (!state.selectedRepo || !idea.id) return;

      const fallbackPath =
        state.basePath && state.selectedRepo
          ? `${state.basePath}/${state.selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
          : "";

      const filePath = idea.path || fallbackPath;
      if (!filePath) return;

      state.setWorkEditorEditing(false);
      state.setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          state.setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [state]
  );

  const handleInstallDeps = React.useCallback(async () => {
    if (!state.selectedRepo || !state.currentProject) return;
    const installCmd = "pnpm install";
    await fetch("/api/system/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: state.selectedRepo,
        command: installCmd,
      }),
    });
  }, [state]);

  const handleBuildApp = React.useCallback(async () => {
    if (!state.selectedRepo || !state.currentProject) return;
    const buildCmd = state.currentProject.commands?.build || "pnpm build";
    await fetch("/api/system/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: state.selectedRepo,
        command: buildCmd,
      }),
    });
  }, [state]);
  
  const requestEmbeddedCapture = React.useCallback(() => {
    if (window.electronAPI?.browserView) {
      return window.electronAPI.browserView.capture();
    }
    return Promise.resolve(null);
  }, []);

  return {
    fetchRepositories,
    handleSettingsSave,
    openWorkDraft,
    handleStartApp,
    handleStopApp,
    handleRestartApp,
    handleRunTest,
    handleSaveFile,
    handleFileSelect,
    handleTaskSelect,
    handleEpicSelect,
    handleIdeaSelect,
    joinFsPath,
    browserIframeRef,
    handleInstallDeps,
    handleBuildApp,
    requestEmbeddedCapture,
  };
}