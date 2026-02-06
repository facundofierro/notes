import * as React from "react";
import { ViewMode } from "@/lib/view-config";
import { useSettings } from "@/hooks/use-settings";

export function useHomeState() {
  const {
    settings,
    refetch: refetchSettings,
  } = useSettings();
  const [repositories, setRepositories] = React.useState<
    { name: string; path: string; folderConfigId?: string }[]
  >([]);
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  const [currentPath, setCurrentPath] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<{
    path: string;
    content: string;
  } | null>(null);
  const [basePath, setBasePath] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("epics");
  const [testViewMode, setTestViewMode] = React.useState<
    "steps" | "code" | "results"
  >("code");
  const [testOutput, setTestOutput] = React.useState<string>("");
  const [isTestRunning, setIsTestRunning] = React.useState(false);
  const [workEditorEditing, setWorkEditorEditing] = React.useState(false);
  const [workDocIsDraft, setWorkDocIsDraft] = React.useState(false);

  const [agentTools, setAgentTools] = React.useState<
    Array<{
      name: string;
      displayName: string;
      available: boolean;
    }>
  >([]);
  const [iframeUrl, setIframeUrl] = React.useState<string>("");
  const [isIframeInsecure, setIsIframeInsecure] = React.useState(false);
  const [projectConfig, setProjectConfig] = React.useState<{
    url?: string;
    commands?: Record<string, string>;
    workflowId?: string;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<
    | "projects"
    | "agents"
    | "tests"
    | "defaults"
    | "workflows"
    | "project-config"
    | "project-commands"
    | "project-preview"
  >("defaults");
  const [isAppRunning, setIsAppRunning] = React.useState(false);
  const [isAppManaged, setIsAppManaged] = React.useState(false);
  const [appPid, setAppPid] = React.useState<number | null>(null);
  const [appLogs, setAppLogs] = React.useState<string>("");
  const [isAppStarting, setIsAppStarting] = React.useState(false);
  const [logStreamPid, setLogStreamPid] = React.useState<number | null>(null);
  const appLogsAbortControllerRef = React.useRef<AbortController | null>(null);
  const [isElectron, setIsElectron] = React.useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = React.useState(false);

  const currentProject = React.useMemo(() => {
    if (!selectedRepo || !settings.projects) return null;
    return settings.projects.find((p) => p.name === selectedRepo);
  }, [selectedRepo, settings]);

  const currentProjectPath = React.useMemo(() => {
    if (!selectedRepo) return null;
    return (
      repositories.find((r) => r.name === selectedRepo)?.path ||
      currentProject?.path ||
      null
    );
  }, [currentProject?.path, repositories, selectedRepo]);

  const currentProjectConfig = React.useMemo(() => {
    return currentProject || projectConfig || null;
  }, [currentProject, projectConfig]);

  return {
    repositories,
    setRepositories,
    selectedRepo,
    setSelectedRepo,
    currentPath,
    setCurrentPath,
    selectedFile,
    setSelectedFile,
    basePath,
    setBasePath,
    viewMode,
    setViewMode,
    testViewMode,
    setTestViewMode,
    testOutput,
    setTestOutput,
    isTestRunning,
    setIsTestRunning,
    workEditorEditing,
    setWorkEditorEditing,
    workDocIsDraft,
    setWorkDocIsDraft,
    agentTools,
    setAgentTools,
    iframeUrl,
    setIframeUrl,
    isIframeInsecure,
    setIsIframeInsecure,
    projectConfig,
    setProjectConfig,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    setSettingsTab,
    isAppRunning,
    setIsAppRunning,
    isAppManaged,
    setIsAppManaged,
    appPid,
    setAppPid,
    appLogs,
    setAppLogs,
    isAppStarting,
    setIsAppStarting,
    logStreamPid,
    setLogStreamPid,
    appLogsAbortControllerRef,
    isElectron,
    setIsElectron,
    isScreenshotMode,
    setIsScreenshotMode,
    currentProject,
    currentProjectPath,
    currentProjectConfig,
    settings,
    refetchSettings,
  };
}

export type HomeState = ReturnType<typeof useHomeState>;
