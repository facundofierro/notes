import { create } from "zustand";
import {
  persist,
  createJSONStorage,
} from "zustand/middleware";
import { ViewMode } from "@/lib/view-config";
import { UserSettings } from "@/hooks/use-settings";
import {
  Annotation,
  AnnotationType,
  TestsSetupStatus,
  NetworkLog,
} from "@/types/entities";
import { inferTestExecutionStatus } from "@/lib/test-output";

export interface TerminalState {
  id: string;
  title: string;
  output: string;
  processId?: string;
}

export interface TerminalSessionInfo {
  processId: string;
  toolName: string;
  contextKey: string;
  isRunning: boolean;
  startedAt: number;
}

export interface ProjectState {
  viewMode: ViewMode;
  testViewMode:
    | "steps"
    | "code"
    | "results";
  selectedFile: {
    path: string;
    content: string;
  } | null;
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
  electronLoadedUrl: string;
  isIframeInsecure: boolean;
  projectConfig: {
    url?: string;
    commands?: Record<string, string>;
    workflowId?: string;
    browserPages?: string[];
  } | null;
  activeBrowserPageIndex: number;
  browserPagesCurrentUrls: string[];
  isScreenshotMode: boolean;
  screenshot: string | null;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  selectedTool: AnnotationType | null;
  networkLogs: NetworkLog[];
  workEditorEditing: boolean;
  workDocIsDraft: boolean;
  terminals: TerminalState[];
  activeTerminalId: string;
  terminalSessions: TerminalSessionInfo[];
}

const createDefaultProjectState =
  (): ProjectState => ({
    viewMode: "kanban",
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
    electronLoadedUrl: "",
    isIframeInsecure: false,
    projectConfig: null,
    activeBrowserPageIndex: 0,
    browserPagesCurrentUrls: [],
    isScreenshotMode: false,
    screenshot: null,
    annotations: [],
    selectedAnnotationId: null,
    selectedTool: "modify",
    networkLogs: [],
    workEditorEditing: false,
    workDocIsDraft: false,
    terminals: [],
    activeTerminalId: "logs",
    terminalSessions: [],
  });

export interface HomeState {
  // Global State
  settings: UserSettings;
  isSettingsLoading: boolean;
  settingsError: string | null;
  repositories: {
    name: string;
    path: string;
    folderConfigId?: string;
  }[];
  selectedRepo: string | null;
  basePath: string;
  isSettingsOpen: boolean;
  settingsTab: string;
  agentTools: Array<{
    name: string;
    displayName: string;
    available: boolean;
  }>;
  isElectron: boolean;

  // Per-Project States
  projectStates: Record<
    string,
    ProjectState
  >;

  // Helpers
  getProjectState: () => ProjectState;

  // Actions
  fetchSettings: () => Promise<void>;
  fetchAgentTools: () => Promise<void>;
  updateSettings: (
    newSettings: Partial<UserSettings>,
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (
    repo: string | null,
  ) => void;
  setIsElectron: (
    isElectron: boolean,
  ) => void;
  setAgentTools: (tools: any[]) => void;

  // Project-Specific Setters (operates on selectedRepo)
  setProjectState: (
    updater: (
      prev: ProjectState,
    ) => Partial<ProjectState>,
  ) => void;
  setProjectStateForRepo: (
    repo: string,
    updater: (
      prev: ProjectState,
    ) => Partial<ProjectState>,
  ) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedFile: (
    file: {
      path: string;
      content: string;
    } | null,
  ) => void;
  setIsSettingsOpen: (
    open: boolean,
  ) => void;
  setSettingsTab: (tab: any) => void;
  setAppLogs: (
    updater:
      | string
      | ((prev: string) => string),
  ) => void;
  setIframeUrl: (url: string) => void;
  clearNetworkLogs: () => void;
  addTerminal: (
    terminal: TerminalState,
  ) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminalId: (
    id: string,
  ) => void;
  updateTerminalOutput: (
    id: string,
    updater:
      | string
      | ((prev: string) => string),
  ) => void;
  registerTerminalSession: (
    session: TerminalSessionInfo,
  ) => void;
  updateTerminalSession: (
    processId: string,
    updates: Partial<TerminalSessionInfo>,
  ) => void;
  removeTerminalSession: (
    processId: string,
  ) => void;
  getTerminalSessionForContext: (
    contextKey: string,
  ) => TerminalSessionInfo | undefined;

  // Logic Actions (operates on selectedRepo)
  handleStartApp: () => Promise<void>;
  handleStopApp: () => Promise<void>;
  handleRestartApp: () => Promise<void>;
  handleBuildApp: () => Promise<void>;
  handleRunTest: (
    path: string,
  ) => Promise<void>;
  handleFileSelect: (
    node: any,
  ) => Promise<void>;
  handleTaskSelect: (
    task: any,
  ) => Promise<void>;
  handleEpicSelect: (
    epic: any,
  ) => Promise<void>;
  handleIdeaSelect: (
    idea: any,
  ) => Promise<void>;
  saveFile: (opts: {
    path: string;
    content: string;
  }) => Promise<void>;
  saveProjectConfig: (
    config: any,
  ) => Promise<void>;
  openWorkDraft: (opts: {
    kind: "epic" | "task" | "idea";
    state: string;
  }) => void;
}

const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  notifications: true,
  autoSave: true,
  defaultView: "kanban",
  sidebarCollapsed: false,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  showLineNumbers: true,
  wordWrap: true,
  aiModel: "default",
  aiProvider: "auto",
  projects: [],
  enabledAgents: ["*"],
  stagehandApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  googleApiKey: "",
  grokApiKey: "",
  workflows: [],
  createBranchPerTask: false,
};

export const useHomeStore =
  create<HomeState>()(
    persist(
      (set, get) => ({
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
        projectStates: {},

        getProjectState: () => {
          const {
            selectedRepo,
            projectStates,
          } = get();
          return (
            (selectedRepo
              ? projectStates[
                  selectedRepo
                ]
              : null) ||
            createDefaultProjectState()
          );
        },

        setSelectedRepo: (
          selectedRepo,
        ) => {
          if (!selectedRepo) {
            set({ selectedRepo: null });
            return;
          }
          set((state) => {
            const projectStates = {
              ...state.projectStates,
            };
            projectStates[selectedRepo] = {
              ...createDefaultProjectState(),
              ...(projectStates[
                selectedRepo
              ] || {}),
            };
            return {
              selectedRepo,
              projectStates,
            };
          });
        },

        setIsElectron: (isElectron) =>
          set({ isElectron }),
        setAgentTools: (agentTools) =>
          set({ agentTools }),

        setProjectStateForRepo: (
          repo,
          updater,
        ) => {
          if (!repo) return;
          set((state) => {
            const currentState = {
              ...createDefaultProjectState(),
              ...(state.projectStates[
                repo
              ] || {}),
            };
            const updates =
              typeof updater ===
              "function"
                ? updater(currentState)
                : updater;

            // Check if anything actually changed to avoid infinite loops
            const hasChanges =
              Object.keys(updates).some(
                (key) => {
                  const val = (
                    updates as any
                  )[key];
                  const cur = (
                    currentState as any
                  )[key];
                  if (
                    Array.isArray(
                      val,
                    ) &&
                    Array.isArray(cur)
                  ) {
                    if (
                      val.length !==
                      cur.length
                    )
                      return true;
                    return val.some(
                      (v, i) =>
                        v !== cur[i],
                    );
                  }
                  return val !== cur;
                },
              );

            if (!hasChanges)
              return state;

            return {
              projectStates: {
                ...state.projectStates,
                [repo]: {
                  ...currentState,
                  ...updates,
                },
              },
            };
          });
        },

        setProjectState: (updater) => {
          const { selectedRepo } =
            get();
          if (!selectedRepo) return;
          get().setProjectStateForRepo(
            selectedRepo,
            updater,
          );
        },

        setViewMode: (viewMode) =>
          get().setProjectState(() => ({
            viewMode,
          })),
        setSelectedFile: (
          selectedFile,
        ) =>
          get().setProjectState(() => ({
            selectedFile,
          })),
        setIframeUrl: (iframeUrl) =>
          get().setProjectState(() => ({
            iframeUrl,
          })),
        clearNetworkLogs: () =>
          get().setProjectState(() => ({
            networkLogs: [],
          })),
        setIsSettingsOpen: (
          isSettingsOpen,
        ) => set({ isSettingsOpen }),
        setSettingsTab: (settingsTab) =>
          set({ settingsTab }),
        setAppLogs: (updater) => {
          get().setProjectState(
            (prev) => ({
              appLogs:
                typeof updater ===
                "function"
                  ? updater(
                      prev.appLogs,
                    )
                  : updater,
            }),
          );
        },

        addTerminal: (terminal) => {
          get().setProjectState(
            (prev) => ({
              terminals: [
                ...prev.terminals,
                terminal,
              ],
              activeTerminalId:
                terminal.id,
            }),
          );
        },

        removeTerminal: (id) => {
          get().setProjectState(
            (prev) => {
              const terminals =
                prev.terminals.filter(
                  (t) => t.id !== id,
                );
              let activeTerminalId =
                prev.activeTerminalId;
              if (
                activeTerminalId === id
              ) {
                activeTerminalId =
                  terminals.length > 0
                    ? terminals[
                        terminals.length -
                          1
                      ].id
                    : "logs";
              }
              return {
                terminals,
                activeTerminalId,
              };
            },
          );
        },

        setActiveTerminalId: (id) => {
          get().setProjectState(() => ({
            activeTerminalId: id,
          }));
        },

        updateTerminalOutput: (
          id,
          updater,
        ) => {
          get().setProjectState(
            (prev) => ({
              terminals:
                prev.terminals?.map(
                  (t) =>
                    t.id === id
                      ? {
                          ...t,
                          output:
                            typeof updater ===
                            "function"
                              ? updater(
                                  t.output,
                                )
                              : updater,
                        }
                      : t,
                ),
            }),
          );
        },

        registerTerminalSession: (session) => {
          get().setProjectState((prev) => {
            const existing = prev.terminalSessions.findIndex(
              (s) => s.contextKey === session.contextKey
            );
            if (existing >= 0) {
              const sessions = [...prev.terminalSessions];
              sessions[existing] = session;
              return { terminalSessions: sessions };
            }
            return { terminalSessions: [...prev.terminalSessions, session] };
          });
        },

        updateTerminalSession: (processId, updates) => {
          get().setProjectState((prev) => ({
            terminalSessions: prev.terminalSessions.map((s) =>
              s.processId === processId ? { ...s, ...updates } : s
            ),
          }));
        },

        removeTerminalSession: (processId) => {
          get().setProjectState((prev) => ({
            terminalSessions: prev.terminalSessions.filter(
              (s) => s.processId !== processId
            ),
          }));
        },

        getTerminalSessionForContext: (contextKey) => {
          const state = get().getProjectState();
          return state.terminalSessions.find(
            (s) => s.contextKey === contextKey
          );
        },

        fetchSettings: async () => {
          try {
            set({
              isSettingsLoading: true,
            });
            const response =
              await fetch(
                "/api/settings",
              );
            if (!response.ok)
              throw new Error(
                "Failed to fetch settings",
              );
            const data =
              await response.json();
            set({
              settings: data.settings,
              settingsError: null,
            });
            // After fetching settings, fetch and filter agent tools
            void get().fetchAgentTools();
          } catch (err) {
            set({
              settingsError:
                "Failed to load settings",
            });
          } finally {
            set({
              isSettingsLoading: false,
            });
          }
        },

        fetchAgentTools: async () => {
          try {
            const response = await fetch("/api/agents?action=tools");
            if (!response.ok) throw new Error("Failed to fetch agent tools");
            const data = await response.json();
            const tools = data.tools || [];
            
            const { settings } = get();
            const enabledAgents = settings.enabledAgents || ["*"];
            
            const filteredTools = tools.filter((tool: any) => 
              enabledAgents.includes("*") || enabledAgents.includes(tool.name)
            );
            
            set({ agentTools: filteredTools });
          } catch (error) {
            console.error("Error fetching agent tools:", error);
          }
        },

        updateSettings: async (
          newSettings,
        ) => {
          try {
            set({
              isSettingsLoading: true,
            });
            const response =
              await fetch(
                "/api/settings",
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    settings:
                      newSettings,
                  }),
                },
              );
            if (!response.ok)
              throw new Error(
                "Failed to update settings",
              );
            const data =
              await response.json();
            set({
              settings: data.settings,
              settingsError: null,
            });
            void get().fetchAgentTools();
          } catch (err) {
            set({
              settingsError:
                "Failed to save settings",
            });
            throw err;
          } finally {
            set({
              isSettingsLoading: false,
            });
          }
        },

        resetSettings: async () => {
          try {
            set({
              isSettingsLoading: true,
            });
            const response =
              await fetch(
                "/api/settings",
                { method: "DELETE" },
              );
            if (!response.ok)
              throw new Error(
                "Failed to reset settings",
              );
            const data =
              await response.json();
            set({
              settings: data.settings,
              settingsError: null,
            });
            void get().fetchAgentTools();
          } catch (err) {
            set({
              settingsError:
                "Failed to reset settings",
            });
            throw err;
          } finally {
            set({
              isSettingsLoading: false,
            });
          }
        },

        fetchRepositories: async () => {
          try {
            const res = await fetch(
              "/api/repositories",
            );
            const data =
              await res.json();
            const nextRepos =
              (data.repositories ||
                []) as {
                name: string;
                path: string;
              }[];

            set((state) => {
              const updates: Partial<HomeState> =
                {
                  repositories:
                    nextRepos,
                };
              if (data.basePath)
                updates.basePath =
                  data.basePath;

              // If we don't have a selected repo or it's not in the new list, pick the first one
              if (
                nextRepos.length > 0
              ) {
                const currentSelected =
                  state.selectedRepo;
                if (
                  !currentSelected ||
                  !nextRepos.some(
                    (r) =>
                      r.name ===
                      currentSelected,
                  )
                ) {
                  updates.selectedRepo =
                    nextRepos[0].name;

                  // Also ensure projectState exists for the new selection
                  const projectStates =
                    {
                      ...state.projectStates,
                    };
                  projectStates[
                    nextRepos[0].name
                  ] = {
                    ...createDefaultProjectState(),
                    ...(projectStates[
                      nextRepos[0].name
                    ] || {}),
                  };
                  updates.projectStates =
                    projectStates;
                }
              }

              return updates;
            });
          } catch (error) {
            console.error(
              "Failed to fetch repositories:",
              error,
            );
          }
        },

        handleStartApp: async () => {
          const {
            selectedRepo,
            repositories,
            settings,
            projectStates,
          } = get();
          if (!selectedRepo) return;
          const pState =
            projectStates[selectedRepo];

          const project =
            settings.projects?.find(
              (p) =>
                p.name === selectedRepo,
            );
          const devCommand =
            project?.commands?.dev ||
            pState.projectConfig
              ?.commands?.dev ||
            "pnpm dev";
          const repoPath =
            repositories.find(
              (r) =>
                r.name === selectedRepo,
            )?.path ||
            project?.path ||
            "unknown";

          const banner = [
            `\x1b[36m━━━ Starting: ${selectedRepo} ━━━\x1b[0m`,
            `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
            `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
            `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
            "",
          ].join("\n");

          get().setProjectState(() => ({
            appLogs: banner,
            isAppStarting: true,
            viewMode: "logs",
            logStreamPid: null,
          }));

          if (
            pState.appLogsAbortController
          ) {
            pState.appLogsAbortController.abort();
          }

          try {
            const res = await fetch(
              "/api/app-status",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  repo: selectedRepo,
                  action: "start",
                }),
              },
            );
            const data =
              await res.json();
            if (!data.success) {
              get().setProjectState(
                (prev) => ({
                  appLogs:
                    prev.appLogs +
                    `\x1b[31mError: ${data.error || "Failed to start app"}\x1b[0m\n`,
                  isAppStarting: false,
                }),
              );
              return;
            }

            if (data.pid) {
              get().setProjectState(
                () => ({
                  appPid: data.pid,
                  isAppRunning: true,
                  isAppManaged: true,
                  logStreamPid:
                    data.pid,
                }),
              );
            } else {
              get().setProjectState(
                (prev) => ({
                  appLogs:
                    prev.appLogs +
                    "\x1b[31mError: Missing process id from start response\x1b[0m\n",
                  isAppStarting: false,
                }),
              );
            }
          } catch (error) {
            get().setProjectState(
              (prev) => ({
                appLogs:
                  prev.appLogs +
                  `\x1b[31mError: ${error}\x1b[0m\n`,
                isAppStarting: false,
              }),
            );
          }
        },

        handleStopApp: async () => {
          const {
            selectedRepo,
            projectStates,
          } = get();
          if (!selectedRepo) return;
          const pState =
            projectStates[selectedRepo];

          if (
            pState.appLogsAbortController
          ) {
            pState.appLogsAbortController.abort();
          }
          get().setProjectState(() => ({
            logStreamPid: null,
            appLogsAbortController:
              null,
          }));

          try {
            const res = await fetch(
              "/api/app-status",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  repo: selectedRepo,
                  action: "stop",
                }),
              },
            );
            const data =
              await res.json();
            if (!data.success) {
              get().setProjectState(
                (prev) => ({
                  appLogs:
                    prev.appLogs +
                    `\x1b[31mError stopping: ${data.error}\x1b[0m\n`,
                }),
              );
            } else {
              get().setProjectState(
                (prev) => ({
                  appLogs:
                    prev.appLogs +
                    "\x1b[33m[Stopped]\x1b[0m\n",
                  isAppRunning: false,
                  isAppManaged: false,
                  appPid: null,
                }),
              );
            }
          } catch (error) {
            get().setProjectState(
              (prev) => ({
                appLogs:
                  prev.appLogs +
                  `\x1b[31mError stopping: ${error}\x1b[0m\n`,
              }),
            );
          }
        },

        handleRestartApp: async () => {
          const {
            selectedRepo,
            repositories,
            settings,
            projectStates,
          } = get();
          if (!selectedRepo) return;
          const pState =
            projectStates[selectedRepo];

          const project =
            settings.projects?.find(
              (p) =>
                p.name === selectedRepo,
            );
          const devCommand =
            project?.commands?.dev ||
            pState.projectConfig
              ?.commands?.dev ||
            "pnpm dev";
          const repoPath =
            repositories.find(
              (r) =>
                r.name === selectedRepo,
            )?.path ||
            project?.path ||
            "unknown";

          if (
            pState.appLogsAbortController
          ) {
            pState.appLogsAbortController.abort();
          }

          const banner = [
            `\x1b[36m━━━ Restarting: ${selectedRepo} ━━━\x1b[0m`,
            `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
            `\x1b[90m  Command:   ${devCommand}\x1b[0m`,
            `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
            "",
          ].join("\n");

          get().setProjectState(() => ({
            appLogs: banner,
            isAppStarting: true,
            viewMode: "logs",
            logStreamPid: null,
          }));

          try {
            const res = await fetch(
              "/api/app-status",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  repo: selectedRepo,
                  action: "restart",
                }),
              },
            );
            const data =
              await res.json();
            if (!data.success) {
              get().setProjectState(
                (prev) => ({
                  appLogs:
                    prev.appLogs +
                    `\x1b[31mError: ${data.error || "Failed to restart app"}\x1b[0m\n`,
                  isAppStarting: false,
                }),
              );
            } else if (data.pid) {
              get().setProjectState(
                () => ({
                  appPid: data.pid,
                  isAppRunning: true,
                  isAppManaged: true,
                  logStreamPid:
                    data.pid,
                }),
              );
            }
          } catch (error) {
            get().setProjectState(
              (prev) => ({
                appLogs:
                  prev.appLogs +
                  `\x1b[31mError: ${error}\x1b[0m\n`,
                isAppStarting: false,
              }),
            );
          }
        },

        handleBuildApp: async () => {
          const {
            selectedRepo,
            repositories,
            settings,
            projectStates,
          } = get();
          if (!selectedRepo) return;
          const pState = projectStates[selectedRepo];

          const project = settings.projects?.find((p) => p.name === selectedRepo);
          const buildCmd = project?.commands?.build || "pnpm build";
          const repoPath = repositories.find((r) => r.name === selectedRepo)?.path || project?.path || "unknown";

          // If app is running, stop it first
          if (pState.isAppRunning) {
            await get().handleStopApp();
          }

          if (pState.appLogsAbortController) {
            pState.appLogsAbortController.abort();
          }

          const banner = [
            `\x1b[36m━━━ Building: ${selectedRepo} ━━━\x1b[0m`,
            `\x1b[90m  Directory: ${repoPath}\x1b[0m`,
            `\x1b[90m  Command:   ${buildCmd}\x1b[0m`,
            `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
            "",
          ].join("\n");

          get().setProjectState(() => ({
            appLogs: banner,
            isAppStarting: true,
            viewMode: "logs",
            logStreamPid: null,
            isAppRunning: false, // Ensure it's false since we are building
          }));

          try {
            const res = await fetch("/api/system/command", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repo: selectedRepo, command: buildCmd }),
            });
            const data = await res.json();
            if (!data.success) {
              get().setProjectState((prev) => ({
                appLogs: prev.appLogs + `\x1b[31mError: ${data.error || "Failed to start build"}\x1b[0m\n`,
                isAppStarting: false,
              }));
              return;
            }

            if (data.pid) {
              get().setProjectState(() => ({
                appPid: data.pid,
                isAppManaged: true,
                logStreamPid: data.pid,
              }));
            }
          } catch (error) {
            get().setProjectState((prev) => ({
              appLogs: prev.appLogs + `\x1b[31mError: ${error}\x1b[0m\n`,
              isAppStarting: false,
            }));
          }
        },

        handleRunTest: async (
          path: string,
        ) => {
          get().setProjectState(() => ({
            testOutput: "",
            isTestRunning: true,
            testViewMode: "results",
          }));

          let fullOutput = "";
          try {
            const response =
              await fetch(
                "/api/tests/run",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    path,
                  }),
                },
              );

            const reader =
              response.body?.getReader();
            if (!reader) return;

            const decoder =
              new TextDecoder();
            while (true) {
              const { done, value } =
                await reader.read();
              if (done) break;
              const text =
                decoder.decode(value);
              fullOutput += text;
              get().setProjectState(
                (prev) => ({
                  testOutput:
                    prev.testOutput +
                    text,
                }),
              );
            }
          } catch (error) {
            fullOutput +=
              "\nError running test";
            get().setProjectState(
              (prev) => ({
                testOutput:
                  prev.testOutput +
                  "\nError running test",
              }),
            );
          } finally {
            get().setProjectState(
              () => ({
                isTestRunning: false,
              }),
            );
            const status =
              inferTestExecutionStatus(
                fullOutput,
                false,
              );
            if (status === "failure") {
              // logic for failure
            }
          }
        },

        handleFileSelect: async (
          node: any,
        ) => {
          if (node.type === "file") {
            const data = await fetch(
              `/api/file?path=${encodeURIComponent(node.path)}`,
            ).then((res) => res.json());
            get().setProjectState(
              () => ({
                selectedFile: {
                  path: node.path,
                  content:
                    data.content || "",
                },
                workEditorEditing: false,
                workDocIsDraft: false,
              }),
            );
          }
        },

        handleTaskSelect: async (
          task: any,
        ) => {
          const {
            selectedRepo,
            basePath,
          } = get();
          if (!selectedRepo || !task.id)
            return;

          const fallbackPath =
            basePath && selectedRepo
              ? `${basePath}/${selectedRepo}/.agelum/work/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
              : "";

          const filePath =
            task.path || fallbackPath;
          if (!filePath) return;

          get().setProjectState(() => ({
            workEditorEditing: false,
            workDocIsDraft: false,
          }));
          const data = await fetch(
            `/api/file?path=${encodeURIComponent(filePath)}`,
          ).then((res) => res.json());
          get().setProjectState(() => ({
            selectedFile: {
              path: filePath,
              content:
                data.content || "",
            },
          }));
        },

        handleEpicSelect: async (
          epic: any,
        ) => {
          const {
            selectedRepo,
            basePath,
          } = get();
          if (!selectedRepo || !epic.id)
            return;

          const fallbackPath =
            basePath && selectedRepo
              ? `${basePath}/${selectedRepo}/.agelum/work/epics/${epic.state}/${epic.id}.md`
              : "";

          const filePath =
            epic.path || fallbackPath;
          if (!filePath) return;

          get().setProjectState(() => ({
            workEditorEditing: false,
            workDocIsDraft: false,
          }));
          const data = await fetch(
            `/api/file?path=${encodeURIComponent(filePath)}`,
          ).then((res) => res.json());
          get().setProjectState(() => ({
            selectedFile: {
              path: filePath,
              content:
                data.content || "",
            },
          }));
        },

        handleIdeaSelect: async (
          idea: any,
        ) => {
          const {
            selectedRepo,
            basePath,
          } = get();
          if (!selectedRepo || !idea.id)
            return;

          const fallbackPath =
            basePath && selectedRepo
              ? `${basePath}/${selectedRepo}/.agelum/doc/ideas/${idea.state}/${idea.id}.md`
              : "";

          const filePath =
            idea.path || fallbackPath;
          if (!filePath) return;

          get().setProjectState(() => ({
            workEditorEditing: false,
            workDocIsDraft: false,
          }));
          const data = await fetch(
            `/api/file?path=${encodeURIComponent(filePath)}`,
          ).then((res) => res.json());
          get().setProjectState(() => ({
            selectedFile: {
              path: filePath,
              content:
                data.content || "",
            },
          }));
        },

        saveFile: async (opts) => {
          const res = await fetch(
            "/api/file",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                path: opts.path,
                content: opts.content,
              }),
            },
          );

          if (!res.ok)
            throw new Error(
              "Failed to save file",
            );

          get().setProjectState(
            (prev) => ({
              selectedFile:
                prev.selectedFile
                  ? {
                      ...prev.selectedFile,
                      content:
                        opts.content,
                    }
                  : null,
            }),
          );
        },

        saveProjectConfig: async (
          config,
        ) => {
          const {
            selectedRepo,
            repositories,
            settings,
          } = get();
          if (!selectedRepo) return;

          const repo =
            repositories.find(
              (r) =>
                r.name === selectedRepo,
            );
          const repoPath =
            repo?.path ||
            settings.projects?.find(
              (p) =>
                p.name === selectedRepo,
            )?.path;

          if (!repoPath) {
            console.error(
              "Could not determine repository path for saving config",
            );
            return;
          }

          try {
            const res = await fetch(
              "/api/project/config",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  path: repoPath,
                  config,
                }),
              },
            );

            if (!res.ok)
              throw new Error(
                "Failed to save project config",
              );
            const data =
              await res.json();

            get().setProjectState(
              (prev) => ({
                projectConfig:
                  data.config,
              }),
            );
          } catch (error) {
            console.error(
              "Error saving project config:",
              error,
            );
            throw error;
          }
        },

        openWorkDraft: (opts) => {
          const {
            selectedRepo,
            repositories,
            basePath,
          } = get();
          if (!selectedRepo) return;

          const repo =
            repositories.find(
              (r) =>
                r.name === selectedRepo,
            );
          const repoPath =
            repo?.path ||
            (basePath
              ? `${basePath}/${selectedRepo}`.replace(
                  /\/+/g,
                  "/",
                )
              : null);

          if (!repoPath) {
            console.error(
              "Could not determine repository path",
            );
            return;
          }

          const createdAt =
            new Date().toISOString();
          const id = `${opts.kind}-${Date.now()}`;

          const joinFsPath = (
            ...parts: string[]
          ) =>
            parts
              .filter(Boolean)
              .join("/")
              .replace(/\/+/g, "/");

          const baseDir =
            opts.kind === "epic"
              ? joinFsPath(
                  repoPath,
                  ".agelum",
                  "work",
                  "epics",
                  opts.state,
                )
              : opts.kind === "task"
                ? joinFsPath(
                    repoPath,
                    ".agelum",
                    "work",
                    "tasks",
                    opts.state,
                  )
                : joinFsPath(
                    repoPath,
                    ".agelum",
                    "doc",
                    "ideas",
                    opts.state,
                  );

          const draftPath = joinFsPath(
            baseDir,
            `${id}.md`,
          );
          const content = `---\ncreated: ${createdAt}\nstate: ${opts.state}\n---\n\n# ${id}\n\n`;

          get().setProjectState(() => ({
            selectedFile: {
              path: draftPath,
              content,
            },
            workEditorEditing: true,
            workDocIsDraft: true,
          }));
        },
      }),
      {
        name: "agelum-storage",
        storage: createJSONStorage(
          () => localStorage,
        ),
        partialize: (state) => ({
          repositories: state.repositories,
          selectedRepo: state.selectedRepo,
        }),
      },
    ),
  );
