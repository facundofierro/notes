import * as React from "react";
import { ViewMode } from "@/lib/view-config";

export interface TestsSetupStatus {
  state: "missing" | "initializing" | "installing" | "ready" | "error";
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

export function useHomeState() {
  const [repositories, setRepositories] = React.useState<
    { name: string; path: string; folderConfigId?: string }[]
  >([]);
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  const [currentPath, setCurrentPath] = React.useState<string>("");
  const [fileTree, setFileTree] = React.useState<any | null>(null);
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
  const [testsSetupStatus, setTestsSetupStatus] =
    React.useState<TestsSetupStatus | null>(null);
  const [isSetupLogsVisible, setIsSetupLogsVisible] = React.useState(true);
  const [workEditorEditing, setWorkEditorEditing] = React.useState(false);
  const [promptDrafts, setPromptDrafts] = React.useState<Record<string, string>>(
    {
      default: "",
      "tests:steps": "",
      "tests:code": "",
      "tests:results": "",
    }
  );
  const [agentTools, setAgentTools] = React.useState<
    Array<{
      name: string;
      displayName: string;
      available: boolean;
    }>
  >([]);
  const [rightSidebarView, setRightSidebarView] = React.useState<
    "prompt" | "terminal" | "iframe"
  >("prompt");
  const [iframeUrl, setIframeUrl] = React.useState<string>("");
  const [projectConfig, setProjectConfig] = React.useState<{
    url?: string;
    commands?: Record<string, string>;
    workflowId?: string;
  } | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [filePickerOpen, setFilePickerOpen] = React.useState(false);
  const [fileSearch, setFileSearch] = React.useState("");
  const [allFiles, setAllFiles] = React.useState<
    { name: string; path: string }[]
  >([]);
  const [fileMap, setFileMap] = React.useState<Record<string, string>>({});
  const [isOpenCodeWebLoading, setIsOpenCodeWebLoading] = React.useState(false);
  const [openCodeWebLoadingLabel, setOpenCodeWebLoadingLabel] =
    React.useState("");
  const [openCodeWebError, setOpenCodeWebError] = React.useState("");
  const [pendingOpenCodeWebMessage, setPendingOpenCodeWebMessage] =
    React.useState<null | {
      sessionId: string;
      prompt: string;
      path?: string;
    }>(null);
  const [openCodeSessionId, setOpenCodeSessionId] = React.useState<string | null>(
    null
  );
  const [workDocIsDraft, setWorkDocIsDraft] = React.useState(false);
  const [promptMode, setPromptMode] = React.useState<"agent" | "plan" | "chat">(
    "agent"
  );
  const [docAiMode, setDocAiMode] = React.useState<"modify" | "start">(
    "modify"
  );
  const [toolModelsByTool, setToolModelsByTool] = React.useState<
    Record<string, string[]>
  >({});
  const [toolModelByTool, setToolModelByTool] = React.useState<
    Record<string, string>
  >({});
  const [isToolModelsLoading, setIsToolModelsLoading] = React.useState<
    Record<string, boolean>
  >({});
  const [terminalToolName, setTerminalToolName] = React.useState<string>("");
  const [terminalOutput, setTerminalOutput] = React.useState("");
  const [isTerminalRunning, setIsTerminalRunning] = React.useState(false);
  const [promptStatus, setPromptStatus] = React.useState("");
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
  const [isServiceRunning, setIsServiceRunning] = React.useState(false);
  const [isAppRunning, setIsAppRunning] = React.useState(false);
  const [isAppManaged, setIsAppManaged] = React.useState(false);
  const [appPid, setAppPid] = React.useState<number | null>(null);
  const [isAppActionsMenuOpen, setIsAppActionsMenuOpen] = React.useState(false);
  const [appLogs, setAppLogs] = React.useState<string>("");
  const [isAppStarting, setIsAppStarting] = React.useState(false);
  const [logStreamPid, setLogStreamPid] = React.useState<number | null>(null);
  const [terminalProcessId, setTerminalProcessId] = React.useState<string | null>(
    null
  );

  return {
    repositories,
    setRepositories,
    selectedRepo,
    setSelectedRepo,
    currentPath,
    setCurrentPath,
    fileTree,
    setFileTree,
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
    testsSetupStatus,
    setTestsSetupStatus,
    isSetupLogsVisible,
    setIsSetupLogsVisible,
    workEditorEditing,
    setWorkEditorEditing,
    promptDrafts,
    setPromptDrafts,
    agentTools,
    setAgentTools,
    rightSidebarView,
    setRightSidebarView,
    iframeUrl,
    setIframeUrl,
    projectConfig,
    setProjectConfig,
    isRecording,
    setIsRecording,
    filePickerOpen,
    setFilePickerOpen,
    fileSearch,
    setFileSearch,
    allFiles,
    setAllFiles,
    fileMap,
    setFileMap,
    isOpenCodeWebLoading,
    setIsOpenCodeWebLoading,
    openCodeWebLoadingLabel,
    setOpenCodeWebLoadingLabel,
    openCodeWebError,
    setOpenCodeWebError,
    pendingOpenCodeWebMessage,
    setPendingOpenCodeWebMessage,
    openCodeSessionId,
    setOpenCodeSessionId,
    workDocIsDraft,
    setWorkDocIsDraft,
    promptMode,
    setPromptMode,
    docAiMode,
    setDocAiMode,
    toolModelsByTool,
    setToolModelsByTool,
    toolModelByTool,
    setToolModelByTool,
    isToolModelsLoading,
    setIsToolModelsLoading,
    terminalToolName,
    setTerminalToolName,
    terminalOutput,
    setTerminalOutput,
    isTerminalRunning,
    setIsTerminalRunning,
    promptStatus,
    setPromptStatus,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsTab,
    setSettingsTab,
    isServiceRunning,
    setIsServiceRunning,
    isAppRunning,
    setIsAppRunning,
    isAppManaged,
    setIsAppManaged,
    appPid,
    setAppPid,
    isAppActionsMenuOpen,
    setIsAppActionsMenuOpen,
    appLogs,
    setAppLogs,
    isAppStarting,
    setIsAppStarting,
    logStreamPid,
    setLogStreamPid,
    terminalProcessId,
    setTerminalProcessId,
  };
}
