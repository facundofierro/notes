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

const SETTINGS_DIR = path.join(
  os.homedir(),
  ".agelum",
);
const SETTINGS_FILE = path.join(
  SETTINGS_DIR,
  "user-settings.json",
);

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
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, {
      recursive: true,
    });
  }
}

export function readSettings(): UserSettings {
  try {
    ensureSettingsDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(
          defaultSettings,
          null,
          2,
        ),
      );
      return defaultSettings;
    }
    const content = fs.readFileSync(
      SETTINGS_FILE,
      "utf-8",
    );
    const parsed = JSON.parse(
      content,
    ) as Partial<UserSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
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
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
    );
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
