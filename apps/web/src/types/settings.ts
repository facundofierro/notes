import { AgentToolSettings } from "../lib/tool-settings";

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  type: "project" | "folder";
  folderConfigId?: string; // Reference to parent folder config (for projects from containers)
  workflowId?: string;
  commands?: {
    build?: string;
    dev?: string;
    run?: string;
    start?: string;
    stop?: string;
  };
  url?: string;
  autoRun?: boolean;
  browserPages?: string[];
  pluginName?: string;
  pluginDomain?: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  items: string[];
}

export interface ApiKeyConfig {
  id: string;
  provider: "openai" | "google" | "anthropic" | "xai" | "openrouter";
  name: string;
  key: string;
  baseURL?: string;
}

export interface PluginApiKey {
  id: string;
  key: string; // SHA-256 hash
  name: string;
  userId?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: boolean;
  autoSave: boolean;
  defaultView:
    | "ideas"
    | "docs"
    | "plan"
    | "epics"
    | "kanban"
    | "tests"
    | "review"
    | "browser"
    | "logs"
    | "commands"
    | "cli-tools"
    | "ai";
  sidebarCollapsed: boolean;
  editorFontSize: number;
  editorFontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  aiModel: string;
  aiProvider: string;
  apiKeys: ApiKeyConfig[];
  pluginApiKeys?: PluginApiKey[];
  projects: ProjectConfig[];
  enabledAgents: string[];
  stagehandApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  grokApiKey: string;
  workflows: WorkflowConfig[];
  activeWorkflow: string | undefined;
  createBranchPerTask: boolean;
  agentToolSettings: AgentToolSettings;
  siteToken?: string;
  siteUser?: { email: string; name: string; image?: string };
}
