import * as React from "react";
import { useAppLifecycle } from "./useAppLifecycle";
import { useTestsManager } from "./useTestsManager";
import { HomeState } from "./useHomeState";

export function useHomeCallbacks(state: HomeState) {
  const {
    setRepositories,
    setBasePath,
    setSelectedRepo,
    setSelectedFile,
    setWorkEditorEditing,
    setWorkDocIsDraft,
    setAppLogs,
    setIsAppStarting,
    setViewMode,
    setLogStreamPid,
    setAppPid,
    setIsAppRunning,
    setIsAppManaged,
    setIframeUrl,
    setTestOutput,
    setIsTestRunning,
    setTestViewMode,
    refetchSettings,
    selectedRepo,
    repositories,
    basePath,
    currentProject,
    currentProjectConfig,
    currentProjectPath,
    appLogsAbortControllerRef,
    testOutput,
    isTestRunning,
    viewMode,
  } = state;
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
        setRepositories(nextRepos);
        if (data.basePath) setBasePath(data.basePath);

        if (nextRepos.length > 0) {
          const saved = window.localStorage.getItem("agelum.selectedRepo");
          const nextSelected =
            saved && nextRepos.some((r) => r.name === saved) ? saved : nextRepos[0].name;
          setSelectedRepo(nextSelected);
        }
      });
  }, [setRepositories, setBasePath, setSelectedRepo]);

  const handleSettingsSave = React.useCallback(() => {
    fetchRepositories();
    refetchSettings();
  }, [fetchRepositories, refetchSettings]);

  const openWorkDraft = React.useCallback(
    (opts: { kind: "epic" | "task" | "idea"; state: string }) => {
      if (!selectedRepo) return;

      const repo = repositories.find((r) => r.name === selectedRepo);
      const repoPath = repo?.path || (basePath ? joinFsPath(basePath, selectedRepo) : null);

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

      setSelectedFile({
        path: draftPath,
        content,
      });
      setWorkEditorEditing(true);
      setWorkDocIsDraft(true);
    },
    [selectedRepo, repositories, basePath, joinFsPath, setSelectedFile, setWorkEditorEditing, setWorkDocIsDraft]
  );

  const { handleStartApp, handleStopApp, handleRestartApp } = useAppLifecycle({
    selectedRepo: selectedRepo,
    currentProjectConfig: currentProjectConfig,
    currentProjectPath: currentProjectPath,
    appLogsAbortControllerRef: appLogsAbortControllerRef,
    setAppLogs: setAppLogs,
    setIsAppStarting: setIsAppStarting,
    setViewMode: setViewMode,
    setLogStreamPid: setLogStreamPid,
    setAppPid: setAppPid,
    setIsAppRunning: setIsAppRunning,
    setIsAppManaged: setIsAppManaged,
    setIframeUrl: setIframeUrl,
  });

  const { handleRunTest } = useTestsManager({
    selectedRepo: selectedRepo,
    testOutput: testOutput,
    setTestOutput: setTestOutput,
    isTestRunning: isTestRunning,
    setIsTestRunning: setIsTestRunning,
    setTestViewMode: setTestViewMode,
    setPromptDrafts: () => {}, // Mocked out since we moved prompt drafts
    testsSetupStatus: null,
    setTestsSetupStatus: () => {},
    setIsSetupLogsVisible: () => {},
    viewMode: viewMode,
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

      setSelectedFile((prev: { path: string; content: string } | null) =>
        prev ? { ...prev, content: opts.content } : null
      );
    },
    [setSelectedFile]
  );

  const handleFileSelect = React.useCallback(
    async (node: any) => {
      if (node.type === "file") {
        const content = await fetch(
          `/api/file?path=${encodeURIComponent(node.path)}`
        ).then((res) => res.json());
        setSelectedFile({
          path: node.path,
          content: content.content || "",
        });
        setWorkEditorEditing(false);
        setWorkDocIsDraft(false);
      }
    },
    [setSelectedFile, setWorkEditorEditing, setWorkDocIsDraft]
  );

  const handleTaskSelect = React.useCallback(
    (task: any) => {
      if (!selectedRepo || !task.id) return;

      const fallbackPath =
        basePath && selectedRepo
          ? `${basePath}/${selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
          : "";

      const filePath = task.path || fallbackPath;
      if (!filePath) return;

      setWorkEditorEditing(false);
      setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [selectedRepo, basePath, setWorkEditorEditing, setWorkDocIsDraft, setSelectedFile]
  );

  const handleEpicSelect = React.useCallback(
    (epic: any) => {
      if (!selectedRepo || !epic.id) return;

      const fallbackPath =
        basePath && selectedRepo
          ? `${basePath}/${selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
          : "";

      const filePath = epic.path || fallbackPath;
      if (!filePath) return;

      setWorkEditorEditing(false);
      setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [selectedRepo, basePath, setWorkEditorEditing, setWorkDocIsDraft, setSelectedFile]
  );

  const handleIdeaSelect = React.useCallback(
    (idea: any) => {
      if (!selectedRepo || !idea.id) return;

      const fallbackPath =
        basePath && selectedRepo
          ? `${basePath}/${selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
          : "";

      const filePath = idea.path || fallbackPath;
      if (!filePath) return;

      setWorkEditorEditing(false);
      setWorkDocIsDraft(false);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedFile({
            path: filePath,
            content: data.content || "",
          });
        });
    },
    [selectedRepo, basePath, setWorkEditorEditing, setWorkDocIsDraft, setSelectedFile]
  );

  const handleInstallDeps = React.useCallback(async () => {
    if (!selectedRepo || !currentProject) return;
    const installCmd = "pnpm install";
    await fetch("/api/system/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: selectedRepo,
        command: installCmd,
      }),
    });
  }, [selectedRepo, currentProject]);

  const handleBuildApp = React.useCallback(async () => {
    if (!selectedRepo || !currentProject) return;
    const buildCmd = currentProject.commands?.build || "pnpm build";
    await fetch("/api/system/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: selectedRepo,
        command: buildCmd,
      }),
    });
  }, [selectedRepo, currentProject]);
  
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