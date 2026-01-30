import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  type: "project" | "folder";
}

export interface WorkflowConfig {
  id: string;
  name: string;
  items: string[];
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
    | "commands"
    | "cli-tools";
  sidebarCollapsed: boolean;
  editorFontSize: number;
  editorFontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  aiModel: string;
  aiProvider: string;
  projects: ProjectConfig[];
  enabledAgents: string[];
  stagehandApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
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

export const defaultSettings: UserSettings =
  {
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

export function readSettings(): UserSettings {
  try {
    ensureSettingsDir();
    const file = getSettingsFile();
    if (!fs.existsSync(file)) {
      let merged: UserSettings = {
        ...defaultSettings,
      };
      const backfill: Partial<UserSettings> = {};
      if (!merged.stagehandApiKey && process.env.BROWSERBASE_API_KEY) {
        backfill.stagehandApiKey = process.env.BROWSERBASE_API_KEY;
      }
      if (!merged.openaiApiKey && process.env.OPENAI_API_KEY) {
        backfill.openaiApiKey = process.env.OPENAI_API_KEY;
      }
      if (!merged.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
        backfill.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      }
      if (!merged.googleApiKey && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        backfill.googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
      merged = {
        ...merged,
        ...backfill,
      };
      fs.writeFileSync(file, JSON.stringify(merged, null, 2), { mode: 0o600 });
      return merged;
    }
    const content = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(content) as Partial<UserSettings>;
    let merged: UserSettings = {
      ...defaultSettings,
      ...parsed,
    };

    const backfill: Partial<UserSettings> = {};
    if (!merged.stagehandApiKey && process.env.BROWSERBASE_API_KEY) {
      backfill.stagehandApiKey = process.env.BROWSERBASE_API_KEY;
    }
    if (!merged.openaiApiKey && process.env.OPENAI_API_KEY) {
      backfill.openaiApiKey = process.env.OPENAI_API_KEY;
    }
    if (!merged.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
      backfill.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    }
    if (!merged.googleApiKey && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      backfill.googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }

    const needsMigration = Object.keys(defaultSettings).some(
      (key) => !(key in parsed),
    );
    if (Object.keys(backfill).length > 0 || needsMigration) {
      merged = {
        ...merged,
        ...backfill,
      };
      fs.writeFileSync(file, JSON.stringify(merged, null, 2), { mode: 0o600 });
    }

    return merged;
  } catch (error) {
    console.error(
      "Error reading settings:",
      error,
    );
    return defaultSettings;
  }
}

export function saveSettings(
  settings: UserSettings,
): void {
  try {
    ensureSettingsDir();
    fs.writeFileSync(getSettingsFile(), JSON.stringify(settings, null, 2), {
      mode: 0o600,
    });
  } catch (error) {
    console.error(
      "Error saving settings:",
      error,
    );
    throw error;
  }
}

export function resolveProjectPath(
  repoName: string,
): string | null {
  const settings = readSettings();

  // 1. Check configured projects
  if (
    settings.projects &&
    settings.projects.length > 0
  ) {
    // Check single projects
    const single =
      settings.projects.find(
        (p) =>
          p.type === "project" &&
          p.name === repoName,
      );
    if (single) return single.path;

    // Check containers
    const containers =
      settings.projects.filter(
        (p) => p.type === "folder",
      );
    for (const container of containers) {
      const potentialPath = path.join(
        container.path,
        repoName,
      );
      if (
        fs.existsSync(potentialPath) &&
        fs
          .statSync(potentialPath)
          .isDirectory()
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
    const configPath = path.join(
      os.homedir(),
      ".agelum",
      "config.json",
    );
    let rootGitDir = path.resolve(
      process.cwd(),
      "../../..",
    );

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(
        fs.readFileSync(
          configPath,
          "utf-8",
        ),
      );
      if (config.rootGitDirectory) {
        rootGitDir =
          config.rootGitDirectory;
      }
    }

    const potentialPath = path.join(
      rootGitDir,
      repoName,
    );
    if (
      fs.existsSync(potentialPath) &&
      fs
        .statSync(potentialPath)
        .isDirectory()
    ) {
      return potentialPath;
    }
  } catch (e) {
    // Ignore error and return null
  }

  return null;
}
