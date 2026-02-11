import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ensureAgelumStructure } from "./project";

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
  };
  url?: string;
  autoRun?: boolean;
  browserPages?: string[];
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
  projects: ProjectConfig[];
  enabledAgents: string[];
  stagehandApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  grokApiKey: string;
  workflows: WorkflowConfig[];
  activeWorkflow: string;
  createBranchPerTask: boolean;
}

function getSettingsDir(): string {
  return path.join(os.homedir(), ".agelum");
}

function getSettingsFile(): string {
  return path.join(getSettingsDir(), "user-settings.json");
}

export const defaultSettings: UserSettings = {
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
  apiKeys: [],
  projects: [],
  enabledAgents: ["*"],
  stagehandApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  googleApiKey: "",
  grokApiKey: "",
  workflows: [],
  activeWorkflow: "default",
  createBranchPerTask: false,
};

function ensureSettingsDir(): void {
  const dir = getSettingsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

export async function readProjectConfig(
  projectPath: string,
): Promise<Partial<ProjectConfig>> {
  const config: Partial<ProjectConfig> = {};

  try {
    const configPath = path.join(projectPath, ".agelum", "config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      Object.assign(config, JSON.parse(content));
    }

    const pkgPath = path.join(projectPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const scripts = pkg.scripts || {};

      // Default commands
      if (!config.commands) config.commands = {};
      if (!config.commands.dev) config.commands.dev = "pnpm dev";
      if (!config.commands.build) config.commands.build = "pnpm build";
      if (!config.commands.run) config.commands.run = "pnpm test";
      if (!config.commands.start) config.commands.start = "pnpm start";

      // Auto-detect URL from package.json if not specified
      if (!config.url) {
        const devScript = scripts.dev || scripts.start || "";

        // Try to find -p or --port followed by a number
        const portMatch = devScript.match(/(?:-p|--port)\s+(\d+)/);
        if (portMatch) {
          config.url = `http://localhost:${portMatch[1]}/`;
        } else if (
          devScript.includes("next dev") ||
          devScript.includes("next start")
        ) {
          // Next.js default port is 3000
          config.url = "http://localhost:3000/";
        } else if (devScript.includes("vite")) {
          // Vite default port is 5173
          config.url = "http://localhost:5173/";
        }
      }
    }
  } catch (error) {
    console.error(`Error reading project config at ${projectPath}:`, error);
  }
  return config;
}

async function saveProjectConfig(
  projectPath: string,
  config: Partial<ProjectConfig>,
): Promise<void> {
  try {
    ensureAgelumStructure(projectPath);
    const agelumDir = path.join(projectPath, ".agelum");
    const configPath = path.join(agelumDir, "config.json");

    // Only save project-specific fields to the project config
    const projectSpecificConfig = {
      workflowId: config.workflowId,
      commands: config.commands,
      url: config.url,
      autoRun: config.autoRun,
    };

    fs.writeFileSync(
      configPath,
      JSON.stringify(projectSpecificConfig, null, 2),
    );
  } catch (error) {
    console.error(`Error saving project config at ${projectPath}:`, error);
  }
}

export async function readSettings(): Promise<UserSettings> {
  try {
    ensureSettingsDir();
    const file = getSettingsFile();
    let settings: UserSettings;

    if (!fs.existsSync(file)) {
      settings = { ...defaultSettings };
    } else {
      const content = fs.readFileSync(file, "utf-8");
      settings = { ...defaultSettings, ...JSON.parse(content) };
    }

    // Backfill API keys from env
    const backfill: Partial<UserSettings> = {};
    if (!settings.stagehandApiKey && process.env.BROWSERBASE_API_KEY)
      backfill.stagehandApiKey = process.env.BROWSERBASE_API_KEY;
    if (!settings.openaiApiKey && process.env.OPENAI_API_KEY)
      backfill.openaiApiKey = process.env.OPENAI_API_KEY;
    if (!settings.anthropicApiKey && process.env.ANTHROPIC_API_KEY)
      backfill.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!settings.googleApiKey && process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      backfill.googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!settings.grokApiKey && process.env.XAI_API_KEY)
      backfill.grokApiKey = process.env.XAI_API_KEY;

    if (Object.keys(backfill).length > 0) {
      settings = { ...settings, ...backfill };
    }

    // Load project-specific configurations
    if (settings.projects) {
      settings.projects = await Promise.all(
        settings.projects.map(async (project) => {
          if (project.type === "project" && project.path) {
            const projectConfig = await readProjectConfig(project.path);
            return { ...project, ...projectConfig };
          }
          return project;
        }),
      );
    }

    return settings;
  } catch (error) {
    console.error("Error reading settings:", error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    ensureSettingsDir();

    // Before saving global settings, extract project-specific settings and save them to projects
    if (settings.projects) {
      for (const project of settings.projects) {
        if (project.type === "project" && project.path) {
          await saveProjectConfig(project.path, project);
        }
      }
    }

    // When saving the global user-settings.json, we might want to strip the project-specific
    // fields to avoid duplication, but keeping them as a cache is also okay.
    // Given the request, it's better to NOT store them globally if they should be in the project.
    const globalSettingsToSave = {
      ...settings,
      projects: settings.projects?.map((project) => {
        if (project.type === "project") {
          // eslint-disable-next-line no-unused-vars
          const { workflowId, commands, url, autoRun, ...rest } = project;
          return rest;
        }
        return project;
      }),
    };

    fs.writeFileSync(
      getSettingsFile(),
      JSON.stringify(globalSettingsToSave, null, 2),
      { mode: 0o600 },
    );
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export async function resolveProjectPath(
  repoName: string,
): Promise<string | null> {
  const settings = await readSettings();

  // 1. Check configured projects
  if (settings.projects && settings.projects.length > 0) {
    // Check single projects
    const single = settings.projects.find(
      (p) => p.type === "project" && p.name === repoName,
    );
    if (single) return single.path;

    // Check containers
    const containers = settings.projects.filter((p) => p.type === "folder");
    for (const container of containers) {
      const potentialPath = path.join(container.path, repoName);
      if (
        fs.existsSync(potentialPath) &&
        fs.statSync(potentialPath).isDirectory()
      ) {
        return potentialPath;
      }
    }
  }

  // 2. Fallback to legacy behavior (root git directory)
  // We avoid importing from ./config to avoid circular dependencies if config imports settings
  // But config seems independent. Let's try to replicate the logic or just use a default fallback
  // The legacy logic was: path.join(ensureRootGitDirectory(), repoName)
  // ensureRootGitDirectory defaults to path.resolve(process.cwd(), '../../..')

  try {
    const configPath = path.join(os.homedir(), ".agelum", "config.json");
    let rootGitDir = path.resolve(process.cwd(), "../../..");

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.rootGitDirectory) {
        rootGitDir = config.rootGitDirectory;
      }
    }

    const potentialPath = path.join(rootGitDir, repoName);
    if (
      fs.existsSync(potentialPath) &&
      fs.statSync(potentialPath).isDirectory()
    ) {
      return potentialPath;
    }
  } catch (e) {
    // Ignore error and return null
  }

  return null;
}
