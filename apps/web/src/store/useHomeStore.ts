import { create } from "zustand";
import { ViewMode } from "@/lib/view-config";
import { UserSettings, ProjectConfig } from "@/hooks/use-settings";
import { Annotation, AnnotationType, TestsSetupStatus } from "@/types/entities";
import { inferTestExecutionStatus } from "@/lib/test-output";

export interface HomeState {
  // Settings
  settings: UserSettings;
  isSettingsLoading: boolean;
  settingsError: string | null;

  // Repositories & Path
  repositories: { name: string; path: string; folderConfigId?: string }[];
  selectedRepo: string | null;
  currentPath: string;
  basePath: string;
  selectedFile: { path: string; content: string } | null;

  // UI State
  viewMode: ViewMode;
  testViewMode: "steps" | "code" | "results";
  isSettingsOpen: boolean;
  settingsTab:
    | "projects"
    | "agents"
    | "tests"
    | "defaults"
    | "workflows"
    | "project-config"
    | "project-commands"
    | "project-preview";

  // App Lifecycle
  isAppRunning: boolean;
  isAppManaged: boolean;
  appPid: number | null;
  appLogs: string;
  isAppStarting: boolean;
  logStreamPid: number | null;
  appLogsAbortController: AbortController | null;

  // Tests
  testOutput: string;
  isTestRunning: boolean;
  testsSetupStatus: TestsSetupStatus | null;
  promptDrafts: Record<string, string>;

  // Misc
  workEditorEditing: boolean;
  workDocIsDraft: boolean;
  agentTools: Array<{ name: string; displayName: string; available: boolean }>;
  iframeUrl: string;
  preservedIframeUrls: Record<string, string>;
  isIframeInsecure: boolean;
  projectConfig: { url?: string; commands?: Record<string, string>; workflowId?: string } | null;
  isElectron: boolean;
  isScreenshotMode: boolean;
  screenshot: string | null;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  selectedTool: AnnotationType | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  
  setRepositories: (repos: { name: string; path: string }[]) => void;
  setSelectedRepo: (repo: string | null) => void;
  setCurrentPath: (path: string) => void;
  setBasePath: (path: string) => void;
  setSelectedFile: (file: { path: string; content: string } | null) => void;
  
  setViewMode: (mode: ViewMode) => void;
  setTestViewMode: (mode: "steps" | "code" | "results") => void;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: any) => void;

  setWorkEditorEditing: (editing: boolean) => void;
  setWorkDocIsDraft: (isDraft: boolean) => void;
  setAgentTools: (tools: any[]) => void;
  setIframeUrl: (url: string) => void;
  setProjectConfig: (config: any) => void;
  setIsElectron: (isElectron: boolean) => void;
  setIsScreenshotMode: (isMode: boolean) => void;
  setAppLogs: (logs: string | ((prev: string) => string)) => void;
  setAppLogsAbortController: (ac: AbortController | null) => void;
  setLogStreamPid: (pid: number | null) => void;
  setIsAppRunning: (running: boolean) => void;
  setIsAppManaged: (managed: boolean) => void;
  setAppPid: (pid: number | null) => void;
  setIsAppStarting: (starting: boolean) => void;

  // Logic Actions
  fetchRepositories: () => Promise<void>;
  handleStartApp: () => Promise<void>;
  handleStopApp: () => Promise<void>;
  handleRestartApp: () => Promise<void>;
  handleRunTest: (path: string) => Promise<void>;
  handleFileSelect: (node: any) => Promise<void>;
  handleTaskSelect: (task: any) => Promise<void>;
  handleEpicSelect: (epic: any) => Promise<void>;
  handleIdeaSelect: (idea: any) => Promise<void>;
  saveFile: (opts: { path: string; content: string }) => Promise<void>;
  openWorkDraft: (opts: { kind: "epic" | "task" | "idea"; state: string }) => void;
}

const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  notifications: true,
  autoSave: true,
  defaultView: "epics",
  sidebarCollapsed: false,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  showLineNumbers: true,
  wordWrap: true,
  aiModel: "default",
  aiProvider: "auto",
  projects: [],
  enabledAgents: [],
  stagehandApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  googleApiKey: "",
  grokApiKey: "",
  workflows: [],
  createBranchPerTask: false,
};

export const useHomeStore = create<HomeState>((set, get) => ({
  // Initial State
  settings: defaultSettings,
  isSettingsLoading: true,
  settingsError: null,
  repositories: [],
  selectedRepo: null,
  currentPath: "",
  basePath: "",
  selectedFile: null,
  viewMode: "epics",
  testViewMode: "code",
  isSettingsOpen: false,
  settingsTab: "defaults",
  isAppRunning: false,
  isAppManaged: false,
  appPid: null,
  appLogs: "",
  isAppStarting: false,
  logStreamPid: null,
  appLogsAbortController: null,
  testOutput: "",
  isTestRunning: false,
  testsSetupStatus: null,
  promptDrafts: {},
  workEditorEditing: false,
  workDocIsDraft: false,
  agentTools: [],
  iframeUrl: "",
  preservedIframeUrls: {},
  isIframeInsecure: false,
  projectConfig: null,
  isElectron: false,
  isScreenshotMode: false,
  screenshot: null,
  annotations: [],
  selectedAnnotationId: null,
  selectedTool: null,

  // Simple Setters
  setRepositories: (repositories) => set({ repositories }),
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  setCurrentPath: (currentPath) => set({ currentPath }),
  setBasePath: (basePath) => set({ basePath }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setViewMode: (viewMode) => set({ viewMode }),
  setTestViewMode: (testViewMode) => set({ testViewMode }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setWorkEditorEditing: (workEditorEditing) => set({ workEditorEditing }),
  setWorkDocIsDraft: (workDocIsDraft) => set({ workDocIsDraft }),
  setAgentTools: (agentTools) => set({ agentTools }),
  setIframeUrl: (iframeUrl) => set({ iframeUrl }),
  setProjectConfig: (projectConfig) => set({ projectConfig }),
  setIsElectron: (isElectron) => set({ isElectron }),
  setIsScreenshotMode: (isScreenshotMode) => set({ isScreenshotMode }),
  setAppLogs: (updater) => set((state) => ({ 
    appLogs: typeof updater === "function" ? updater(state.appLogs) : updater 
  })),
  setAppLogsAbortController: (appLogsAbortController) => set({ appLogsAbortController }),
  setLogStreamPid: (logStreamPid) => set({ logStreamPid }),
  setIsAppRunning: (isAppRunning) => set({ isAppRunning }),
  setIsAppManaged: (isAppManaged) => set({ isAppManaged }),
  setAppPid: (appPid) => set({ appPid }),
  setIsAppStarting: (isAppStarting) => set({ isAppStarting }),

  // Settings Actions
  fetchSettings: async () => {
    try {
      set({ isSettingsLoading: true });
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      set({ settings: data.settings, settingsError: null });
    } catch (err) {
      set({ settingsError: "Failed to load settings" });
    } finally {
      set({ isSettingsLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      set({ isSettingsLoading: true });
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      const data = await response.json();
      set({ settings: data.settings, settingsError: null });
    } catch (err) {
      set({ settingsError: "Failed to save settings" });
      throw err;
    } finally {
      set({ isSettingsLoading: false });
    }
  },

  resetSettings: async () => {
    try {
      set({ isSettingsLoading: true });
      const response = await fetch("/api/settings", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to reset settings");
      const data = await response.json();
      set({ settings: data.settings, settingsError: null });
    } catch (err) {
      set({ settingsError: "Failed to reset settings" });
      throw err;
    } finally {
      set({ isSettingsLoading: false });
    }
  },

  // Repository Actions
  fetchRepositories: async () => {
    const res = await fetch("/api/repositories");
    const data = await res.json();
    const nextRepos = (data.repositories || []) as { name: string; path: string }[];
    set({ repositories: nextRepos });
    if (data.basePath) set({ basePath: data.basePath });

    if (nextRepos.length > 0) {
      const saved = window.localStorage.getItem("agelum.selectedRepo");
      const nextSelected = saved && nextRepos.some((r) => r.name === saved) ? saved : nextRepos[0].name;
      set({ selectedRepo: nextSelected });
    }
  },

  // App Lifecycle Actions
  handleStartApp: async () => {
    const { selectedRepo, repositories, settings, projectConfig, appLogsAbortController } = get();
    if (!selectedRepo) return;

    const project = settings.projects?.find((p) => p.name === selectedRepo);
    const devCommand = project?.commands?.dev || projectConfig?.commands?.dev || "pnpm dev";
    const repoPath = repositories.find(r => r.name === selectedRepo)?.path || project?.path || "unknown";

    const banner = [
      `\x1b[36m━━━ Starting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("
");

    set({ appLogs: banner, isAppStarting: true, viewMode: "logs", logStreamPid: null });

    if (appLogsAbortController) {
      appLogsAbortController.abort();
    }

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "start" }),
      });
      const data = await res.json();
      if (!data.success) {
        set((state) => ({ 
          appLogs: state.appLogs + `\x1b[31mError: ${data.error || "Failed to start app"}\x1b[0m
`,
          isAppStarting: false 
        }));
        return;
      }

      if (data.pid) {
        set({ appPid: data.pid, isAppRunning: true, isAppManaged: true, logStreamPid: data.pid });
      } else {
        set((state) => ({ 
          appLogs: state.appLogs + "\x1b[31mError: Missing process id from start response\x1b[0m
",
          isAppStarting: false 
        }));
      }
    } catch (error) {
      set((state) => ({ 
        appLogs: state.appLogs + `\x1b[31mError: ${error}\x1b[0m
`,
        isAppStarting: false 
      }));
    }
  },

  handleStopApp: async () => {
    const { selectedRepo, appLogsAbortController } = get();
    if (!selectedRepo) return;

    if (appLogsAbortController) {
      appLogsAbortController.abort();
    }
    set({ logStreamPid: null, appLogsAbortController: null });

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "stop" }),
      });
      const data = await res.json();
      if (!data.success) {
        set((state) => ({ appLogs: state.appLogs + `\x1b[31mError stopping: ${data.error}\x1b[0m
` }));
      } else {
        set((state) => ({ 
          appLogs: state.appLogs + "\x1b[33m[Stopped]\x1b[0m
",
          isAppRunning: false,
          isAppManaged: false,
          appPid: null
        }));
      }
    } catch (error) {
      set((state) => ({ appLogs: state.appLogs + `\x1b[31mError stopping: ${error}\x1b[0m
` }));
    }
  },

  handleRestartApp: async () => {
    const { selectedRepo, repositories, settings, projectConfig, appLogsAbortController } = get();
    if (!selectedRepo) return;

    const project = settings.projects?.find((p) => p.name === selectedRepo);
    const devCommand = project?.commands?.dev || projectConfig?.commands?.dev || "pnpm dev";
    const repoPath = repositories.find(r => r.name === selectedRepo)?.path || project?.path || "unknown";

    if (appLogsAbortController) {
      appLogsAbortController.abort();
    }

    const banner = [
      `\x1b[36m━━━ Restarting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("
");

    set({ appLogs: banner, isAppStarting: true, viewMode: "logs", logStreamPid: null });

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "restart" }),
      });
      const data = await res.json();
      if (!data.success) {
        set((state) => ({ 
          appLogs: state.appLogs + `\x1b[31mError: ${data.error || "Failed to restart app"}\x1b[0m
`,
          isAppStarting: false 
        }));
      } else if (data.pid) {
        set({ appPid: data.pid, isAppRunning: true, isAppManaged: true, logStreamPid: data.pid });
      }
    } catch (error) {
      set((state) => ({ 
        appLogs: state.appLogs + `\x1b[31mError: ${error}\x1b[0m
`,
        isAppStarting: false 
      }));
    }
  },

  // Test Actions
  handleRunTest: async (path: string) => {
    set({ testOutput: "", isTestRunning: true, testViewMode: "results" });

    let fullOutput = "";
    try {
      const response = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        fullOutput += text;
        set((state) => ({ testOutput: state.testOutput + text }));
      }
    } catch (error) {
      fullOutput += "
Error running test";
      set((state) => ({ testOutput: state.testOutput + "
Error running test" }));
    } finally {
      set({ isTestRunning: false });
      const status = inferTestExecutionStatus(fullOutput, false);
      if (status === "failure") {
        set((state) => {
          const key = "tests:results";
          if (state.promptDrafts[key]?.trim()) return state;
          return {
            promptDrafts: {
              ...state.promptDrafts,
              [key]: `Fix the error in "${path}" so the test passes.`,
            },
          };
        });
      }
    }
  },

  // File & Node Selection Actions
  handleFileSelect: async (node: any) => {
    if (node.type === "file") {
      const data = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`).then((res) => res.json());
      set({ 
        selectedFile: { path: node.path, content: data.content || "" },
        workEditorEditing: false,
        workDocIsDraft: false
      });
    }
  },

  handleTaskSelect: async (task: any) => {
    const { selectedRepo, basePath } = get();
    if (!selectedRepo || !task.id) return;

    const fallbackPath = basePath && selectedRepo
      ? `${basePath}/${selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
      : "";

    const filePath = task.path || fallbackPath;
    if (!filePath) return;

    set({ workEditorEditing: false, workDocIsDraft: false });
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    set({ selectedFile: { path: filePath, content: data.content || "" } });
  },

  handleEpicSelect: async (epic: any) => {
    const { selectedRepo, basePath } = get();
    if (!selectedRepo || !epic.id) return;

    const fallbackPath = basePath && selectedRepo
      ? `${basePath}/${selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
      : "";

    const filePath = epic.path || fallbackPath;
    if (!filePath) return;

    set({ workEditorEditing: false, workDocIsDraft: false });
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    set({ selectedFile: { path: filePath, content: data.content || "" } });
  },

  handleIdeaSelect: async (idea: any) => {
    const { selectedRepo, basePath } = get();
    if (!selectedRepo || !idea.id) return;

    const fallbackPath = basePath && selectedRepo
      ? `${basePath}/${selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
      : "";

    const filePath = idea.path || fallbackPath;
    if (!filePath) return;

    set({ workEditorEditing: false, workDocIsDraft: false });
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    set({ selectedFile: { path: filePath, content: data.content || "" } });
  },

  saveFile: async (opts) => {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: opts.path, content: opts.content }),
    });

    if (!res.ok) throw new Error("Failed to save file");

    set((state) => ({
      selectedFile: state.selectedFile ? { ...state.selectedFile, content: opts.content } : null
    }));
  },

  openWorkDraft: (opts) => {
    const { selectedRepo, repositories, basePath } = get();
    if (!selectedRepo) return;

    const repo = repositories.find((r) => r.name === selectedRepo);
    const repoPath = repo?.path || (basePath ? `${basePath}/${selectedRepo}`.replace(/\/+/g, "/") : null);

    if (!repoPath) {
      console.error("Could not determine repository path");
      return;
    }

    const createdAt = new Date().toISOString();
    const id = `${opts.kind}-${Date.now()}`;
    
    const joinFsPath = (...parts: string[]) => parts.filter(Boolean).join("/").replace(/\/+/g, "/");

    const baseDir = opts.kind === "epic"
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

    set({
      selectedFile: { path: draftPath, content },
      workEditorEditing: true,
      workDocIsDraft: true
    });
  },
}), { file_path: "apps/web/src/store/useHomeStore.ts" } as any);
