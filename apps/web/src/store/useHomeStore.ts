import { create } from "zustand";
import { ViewMode } from "@/lib/view-config";
import { UserSettings } from "@/hooks/use-settings";
import { Annotation, AnnotationType, TestsSetupStatus } from "@/types/entities";
import { inferTestExecutionStatus } from "@/lib/test-output";

export interface ProjectState {
  viewMode: ViewMode;
  testViewMode: "steps" | "code" | "results";
  selectedFile: { path: string; content: string } | null;
  currentPath: string;
  isAppRunning: boolean;
  isAppManaged: boolean;
  appPid: number | null;
  appLogs: string;
  isAppStarting: boolean;
  logStreamPid: number | null;
  appLogsAbortController: AbortController | null;
  testOutput: string;
  isTestRunning: boolean;
  iframeUrl: string;
  isIframeInsecure: boolean;
  projectConfig: { url?: string; commands?: Record<string, string>; workflowId?: string } | null;
  isScreenshotMode: boolean;
  screenshot: string | null;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  selectedTool: AnnotationType | null;
  workEditorEditing: boolean;
  workDocIsDraft: boolean;
}

const createDefaultProjectState = (): ProjectState => ({
  viewMode: "epics",
  testViewMode: "code",
  selectedFile: null,
  currentPath: "",
  isAppRunning: false,
  isAppManaged: false,
  appPid: null,
  appLogs: "",
  isAppStarting: false,
  logStreamPid: null,
  appLogsAbortController: null,
  testOutput: "",
  isTestRunning: false,
  iframeUrl: "",
  isIframeInsecure: false,
  projectConfig: null,
  isScreenshotMode: false,
  screenshot: null,
  annotations: [],
  selectedAnnotationId: null,
  selectedTool: null,
  workEditorEditing: false,
  workDocIsDraft: false,
});

export interface HomeState {
  // Global State
  settings: UserSettings;
  isSettingsLoading: boolean;
  settingsError: string | null;
  repositories: { name: string; path: string; folderConfigId?: string }[];
  selectedRepo: string | null;
  basePath: string;
  isSettingsOpen: boolean;
  settingsTab: string;
  agentTools: Array<{ name: string; displayName: string; available: boolean }>;
  isElectron: boolean;
  preservedIframeUrls: Record<string, string>;

  // Per-Project States
  projectStates: Record<string, ProjectState>;

  // Helpers
  getProjectState: () => ProjectState;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (repo: string | null) => void;
  setIsElectron: (isElectron: boolean) => void;
  setAgentTools: (tools: any[]) => void;
  
  // Project-Specific Setters (operates on selectedRepo)
  setProjectState: (updater: (prev: ProjectState) => Partial<ProjectState>) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedFile: (file: { path: string; content: string } | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: any) => void;
  setAppLogs: (updater: string | ((prev: string) => string)) => void;
  setIframeUrl: (url: string) => void;

  // Logic Actions (operates on selectedRepo)
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
  settings: defaultSettings,
  isSettingsLoading: true,
  settingsError: null,
  repositories: [],
  selectedRepo: null,
  basePath: "",
  isSettingsOpen: false,
  settingsTab: "defaults",
  agentTools: [],
  isElectron: false,
  preservedIframeUrls: {},
  projectStates: {},

  getProjectState: () => {
    const { selectedRepo, projectStates } = get();
    return (selectedRepo ? projectStates[selectedRepo] : null) || createDefaultProjectState();
  },

  setSelectedRepo: (selectedRepo) => {
    if (!selectedRepo) {
      set({ selectedRepo: null });
      return;
    }
    set((state) => {
      const projectStates = { ...state.projectStates };
      if (!projectStates[selectedRepo]) {
        projectStates[selectedRepo] = createDefaultProjectState();
      }
      return { selectedRepo, projectStates };
    });
  },

  setIsElectron: (isElectron) => set({ isElectron }),
  setAgentTools: (agentTools) => set({ agentTools }),

  setProjectState: (updater) => {
    const { selectedRepo } = get();
    if (!selectedRepo) return;
    set((state) => {
      const currentState = state.projectStates[selectedRepo] || createDefaultProjectState();
      const nextState = typeof updater === "function" ? updater(currentState) : updater;
      return {
        projectStates: {
          ...state.projectStates,
          [selectedRepo]: { ...currentState, ...nextState }
        }
      };
    });
  },

  setViewMode: (viewMode) => get().setProjectState(() => ({ viewMode })),
  setSelectedFile: (selectedFile) => get().setProjectState(() => ({ selectedFile })),
  setIframeUrl: (iframeUrl) => get().setProjectState(() => ({ iframeUrl })),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  setAppLogs: (updater) => {
    get().setProjectState((prev) => ({
      appLogs: typeof updater === "function" ? updater(prev.appLogs) : updater
    }));
  },

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

  fetchRepositories: async () => {
    const res = await fetch("/api/repositories");
    const data = await res.json();
    const nextRepos = (data.repositories || []) as { name: string; path: string }[];
    set({ repositories: nextRepos });
    if (data.basePath) set({ basePath: data.basePath });

    if (nextRepos.length > 0) {
      const saved = window.localStorage.getItem("agelum.selectedRepo");
      const nextSelected = saved && nextRepos.some((r) => r.name === saved) ? saved : nextRepos[0].name;
      get().setSelectedRepo(nextSelected);
    }
  },

  handleStartApp: async () => {
    const { selectedRepo, repositories, settings, projectStates } = get();
    if (!selectedRepo) return;
    const pState = projectStates[selectedRepo];

    const project = settings.projects?.find((p) => p.name === selectedRepo);
    const devCommand = project?.commands?.dev || pState.projectConfig?.commands?.dev || "pnpm dev";
    const repoPath = repositories.find(r => r.name === selectedRepo)?.path || project?.path || "unknown";

    const banner = [
      `\x1b[36m━━━ Starting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");

    get().setProjectState(() => ({ appLogs: banner, isAppStarting: true, viewMode: "logs", logStreamPid: null }));

    if (pState.appLogsAbortController) {
      pState.appLogsAbortController.abort();
    }

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "start" }),
      });
      const data = await res.json();
      if (!data.success) {
        get().setProjectState((prev) => ({ 
          appLogs: prev.appLogs + `\x1b[31mError: ${data.error || "Failed to start app"}\x1b[0m\n`,
          isAppStarting: false 
        }));
        return;
      }

      if (data.pid) {
        get().setProjectState(() => ({ appPid: data.pid, isAppRunning: true, isAppManaged: true, logStreamPid: data.pid }));
      } else {
        get().setProjectState((prev) => ({ 
          appLogs: prev.appLogs + "\x1b[31mError: Missing process id from start response\x1b[0m\n",
          isAppStarting: false 
        }));
      }
    } catch (error) {
      get().setProjectState((prev) => ({ 
        appLogs: prev.appLogs + `\x1b[31mError: ${error}\x1b[0m\n`,
        isAppStarting: false 
      }));
    }
  },

  handleStopApp: async () => {
    const { selectedRepo, projectStates } = get();
    if (!selectedRepo) return;
    const pState = projectStates[selectedRepo];

    if (pState.appLogsAbortController) {
      pState.appLogsAbortController.abort();
    }
    get().setProjectState(() => ({ logStreamPid: null, appLogsAbortController: null }));

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "stop" }),
      });
      const data = await res.json();
      if (!data.success) {
        get().setProjectState((prev) => ({ appLogs: prev.appLogs + `\x1b[31mError stopping: ${data.error}\x1b[0m\n` }));
      } else {
        get().setProjectState((prev) => ({ 
          appLogs: prev.appLogs + "\x1b[33m[Stopped]\x1b[0m\n",
          isAppRunning: false,
          isAppManaged: false,
          appPid: null
        }));
      }
    } catch (error) {
      get().setProjectState((prev) => ({ appLogs: prev.appLogs + `\x1b[31mError stopping: ${error}\x1b[0m\n` }));
    }
  },

  handleRestartApp: async () => {
    const { selectedRepo, repositories, settings, projectStates } = get();
    if (!selectedRepo) return;
    const pState = projectStates[selectedRepo];

    const project = settings.projects?.find((p) => p.name === selectedRepo);
    const devCommand = project?.commands?.dev || pState.projectConfig?.commands?.dev || "pnpm dev";
    const repoPath = repositories.find(r => r.name === selectedRepo)?.path || project?.path || "unknown";

    if (pState.appLogsAbortController) {
      pState.appLogsAbortController.abort();
    }

    const banner = [
      `\x1b[36m━━━ Restarting: ${selectedRepo} ━━━\x1b[0m`,
      `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
      `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
      `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
      "",
    ].join("\n");

    get().setProjectState(() => ({ appLogs: banner, isAppStarting: true, viewMode: "logs", logStreamPid: null }));

    try {
      const res = await fetch("/api/app-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, action: "restart" }),
      });
      const data = await res.json();
      if (!data.success) {
        get().setProjectState((prev) => ({ 
          appLogs: prev.appLogs + `\x1b[31mError: ${data.error || "Failed to restart app"}\x1b[0m\n`,
          isAppStarting: false 
        }));
      } else if (data.pid) {
        get().setProjectState(() => ({ appPid: data.pid, isAppRunning: true, isAppManaged: true, logStreamPid: data.pid }));
      }
    } catch (error) {
      get().setProjectState((prev) => ({ 
        appLogs: prev.appLogs + `\x1b[31mError: ${error}\x1b[0m\n`,
        isAppStarting: false 
      }));
    }
  },

  handleRunTest: async (path: string) => {
    get().setProjectState(() => ({ testOutput: "", isTestRunning: true, testViewMode: "results" }));

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
        get().setProjectState((prev) => ({ testOutput: prev.testOutput + text }));
      }
    } catch (error) {
      fullOutput += "\nError running test";
      get().setProjectState((prev) => ({ testOutput: prev.testOutput + "\nError running test" }));
    } finally {
      get().setProjectState(() => ({ isTestRunning: false }));
      const status = inferTestExecutionStatus(fullOutput, false);
      if (status === "failure") {
        // logic for failure
      }
    }
  },

  handleFileSelect: async (node: any) => {
    if (node.type === "file") {
      const data = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`).then((res) => res.json());
      get().setProjectState(() => ({ 
        selectedFile: { path: node.path, content: data.content || "" },
        workEditorEditing: false,
        workDocIsDraft: false
      }));
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

    get().setProjectState(() => ({ workEditorEditing: false, workDocIsDraft: false }));
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    get().setProjectState(() => ({ selectedFile: { path: filePath, content: data.content || "" } }));
  },

  handleEpicSelect: async (epic: any) => {
    const { selectedRepo, basePath } = get();
    if (!selectedRepo || !epic.id) return;

    const fallbackPath = basePath && selectedRepo
      ? `${basePath}/${selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
      : "";

    const filePath = epic.path || fallbackPath;
    if (!filePath) return;

    get().setProjectState(() => ({ workEditorEditing: false, workDocIsDraft: false }));
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    get().setProjectState(() => ({ selectedFile: { path: filePath, content: data.content || "" } }));
  },

  handleIdeaSelect: async (idea: any) => {
    const { selectedRepo, basePath } = get();
    if (!selectedRepo || !idea.id) return;

    const fallbackPath = basePath && selectedRepo
      ? `${basePath}/${selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
      : "";

    const filePath = idea.path || fallbackPath;
    if (!filePath) return;

    get().setProjectState(() => ({ workEditorEditing: false, workDocIsDraft: false }));
    const data = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`).then((res) => res.json());
    get().setProjectState(() => ({ selectedFile: { path: filePath, content: data.content || "" } }));
  },

  saveFile: async (opts) => {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: opts.path, content: opts.content }),
    });

    if (!res.ok) throw new Error("Failed to save file");

    get().setProjectState((prev) => ({
      selectedFile: prev.selectedFile ? { ...prev.selectedFile, content: opts.content } : null
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
    const content = `---\ncreated: ${createdAt}\nstate: ${opts.state}\n---\n\n# ${id}\n\n`;

    get().setProjectState(() => ({
      selectedFile: { path: draftPath, content },
      workEditorEditing: true,
      workDocIsDraft: true
    }));
  },
}));
