import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import { ToolSettings } from "./tool-settings";

const execAsync = promisify(exec);

export type AgentToolType = "cli" | "web" | "app";

export interface AgentTool {
  name: string;
  command: string;
  type: AgentToolType;
  modelFlag?: string | null;
  listModelsCommand?: string | null;
  promptFlag?: string | null;
  supportedModels?: readonly string[];
  extraArgs?: readonly string[];
}

export const AGENT_TOOLS: Record<string, AgentTool> = {
  opencode: {
    name: "OpenCode CLI",
    command: "opencode",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: "opencode models list",
    promptFlag: "--prompt",
    supportedModels: ["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro"],
  },
  "opencode-web": {
    name: "OpenCode Web",
    command: "opencode",
    type: "web",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: null,
  },
  auggie: {
    name: "Auggie CLI",
    command: "auggie",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "--print",
    supportedModels: [
      "claude-haiku-4.5",
      "claude-opus-4.5",
      "claude-sonnet-4.5",
      "gpt-5.1",
      "gpt-5.2",
    ],
  },
  cursor: {
    name: "Cursor",
    command: "cursor-agent",
    type: "app",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "-p",
    supportedModels: ["claude-3-5-sonnet", "gpt-4o"],
  },
  trae: {
    name: "Trae",
    command: "trae-cli",
    type: "app",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "run",
    supportedModels: ["claude-3-5-sonnet", "gpt-4o"],
  },
  claude: {
    name: "Claude Code",
    command: "claude",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: null,
    supportedModels: ["claude-opus-4.6", "claude-sonnet-4.5", "claude-haiku-4.5"],
  },
  gemini: {
    name: "Gemini cli",
    command: "gemini",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "-i",
    supportedModels: ["gemini-3", "gemini-2.5"],
  },
  kimi: {
    name: "Kimi",
    command: "kimi",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "-p",
    supportedModels: ["kimi-v1"],
  },
  grok: {
    name: "Grok cli",
    command: "grok",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "-p",
    supportedModels: ["grok-1"],
  },
  codex: {
    name: "Codex",
    command: "codex",
    type: "cli",
    modelFlag: "-m",
    listModelsCommand: null,
    promptFlag: null,
  },
  copilot: {
    name: "GitHub Copilot",
    command: "gh copilot",
    type: "cli",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "-p",
  },
  crush: {
    name: "Crush",
    command: "crush",
    type: "cli",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "run",
  },
  aider: {
    name: "Aider",
    command: "aider",
    type: "cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "--message",
  },
  antigravity: {
    name: "Antigravity",
    command: "antigravity",
    type: "app",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "run",
  },
  verdent: {
    name: "Verdent",
    command: "verdent",
    type: "app",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "run",
    supportedModels: ["claude-3-5-sonnet", "gpt-4o"],
  },
  vscode: {
    name: "VS Code",
    command: "code",
    type: "app",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "-",
  },
  windsurf: {
    name: "Windsurf",
    command: "windsurf",
    type: "app",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "-",
  },
  "warp-cli": {
    name: "Warp CLI",
    command: "warp-cli",
    type: "cli",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "run",
  },
  "warp-app": {
    name: "Warp App",
    command: "warp",
    type: "app",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: null,
  },
} as const;

export type AgentToolName = keyof typeof AGENT_TOOLS;

// Helper to get extended PATH with common user locations
export function getExtendedPath(): string {
  const home = process.env.HOME || "";
  const cwd = process.cwd();

  const commonPaths = [
    `${home}/.local/bin`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];

  // Monorepo specific paths
  const monorepoPaths = [
    path.join(cwd, "node_modules/.bin"),
    path.join(cwd, "..", "..", "node_modules/.bin"),
    path.join(
      cwd,
      "..",
      "..",
      "packages",
      "test-engine",
      "node_modules",
      ".bin",
    ),
  ];

  const currentPath = process.env.PATH || "";
  const currentPaths = currentPath.split(":");

  // Combine and deduplicate
  const allPaths = [...monorepoPaths, ...commonPaths, ...currentPaths].filter(
    (p) => p && p.trim() !== "",
  );
  const uniquePaths = [...new Set(allPaths)];

  return uniquePaths.join(":");
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  const baseCommand = command.split(" ")[0];
  try {
    await execAsync(`which ${baseCommand}`, {
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function resolveCommandPath(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`which ${command}`, {
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
    });
    return stdout.trim();
  } catch {
    return command;
  }
}

export async function getModelsForTool(
  toolName: AgentToolName,
): Promise<string[]> {
  const tool = AGENT_TOOLS[toolName];

  if (!tool.listModelsCommand) {
    return tool.supportedModels ? [...tool.supportedModels] : [];
  }

  try {
    const { stdout } = await execAsync(tool.listModelsCommand, {
      timeout: 5000,
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.length > 0);
  } catch (error) {
    console.error(`Failed to list models for ${toolName}:`, error);
    return [];
  }
}

export function buildAgentCommand(
  toolName: AgentToolName,
  prompt: string,
  model?: string,
  allowModify?: boolean,
  settings?: ToolSettings,
  workflow?: string,
): { command: string; args: string[] } {
  const tool = AGENT_TOOLS[toolName];
  const parts = tool.command.split(" ");
  const command = parts[0];
  const args: string[] = parts.slice(1);

  // Apply settings and workflow overrides
  let effectiveModel = model;
  let effectiveAllowModify = allowModify;
  let extraCliParams = "";

  if (settings) {
    const overrides = workflow ? settings.workflowOverrides?.[workflow] : null;

    effectiveModel = model || overrides?.defaultModel || settings.defaultModel;
    effectiveAllowModify =
      allowModify ||
      overrides?.defaultPermissions ||
      settings.defaultPermissions;
    extraCliParams = overrides?.cliParameters || settings.cliParameters || "";
  }

  if (extraCliParams) {
    args.push(...extraCliParams.split(" ").filter((p) => p.trim() !== ""));
  }

  if (tool.extraArgs) {
    args.push(...tool.extraArgs);
  }

  // Handle allowModify logic
  if (effectiveAllowModify) {
    if (toolName === "claude") {
      args.push("--dangerously-skip-permissions");
    }
    // Append permission text to prompt if not already there
    if (!prompt.includes("[SYSTEM] You have permission")) {
      prompt +=
        "\n\n[SYSTEM] You have permission to read/write files and execute commands.";
    }
  }

  if (effectiveModel && tool.modelFlag) {
    args.push(tool.modelFlag, effectiveModel);
  }

  if (tool.promptFlag) {
    args.push(tool.promptFlag);
  }
  args.push(prompt);

  return {
    command,
    args,
  };
}

export async function executeAgentCommand(
  toolName: AgentToolName,
  prompt: string,
  model?: string,
  allowModify?: boolean,
  settings?: ToolSettings,
  workflow?: string,
): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const tool = AGENT_TOOLS[toolName];

  const isAvailable = await isCommandAvailable(tool.command);
  if (!isAvailable) {
    return {
      success: false,
      output: "",
      error: `Tool "${toolName}" is not installed or not in PATH`,
    };
  }

  const { command, args } = buildAgentCommand(
    toolName,
    prompt,
    model,
    allowModify,
    settings,
    workflow,
  );

  const resolvedCommand = await resolveCommandPath(command);

  return new Promise((resolve) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn(resolvedCommand, args, {
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
    });

    child.stdout.on("data", (data) => {
      outputChunks.push(data.toString());
    });

    child.stderr.on("data", (data) => {
      errorChunks.push(data.toString());
    });

    child.on("close", (code) => {
      const output = outputChunks.join("");
      const error = errorChunks.join("");

      resolve({
        success: code === 0,
        output,
        error:
          code !== 0 ? error || `Process exited with code ${code}` : undefined,
      });
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: outputChunks.join(""),
        error: err.message,
      });
    });

    setTimeout(
      () => {
        child.kill();
        resolve({
          success: false,
          output: outputChunks.join(""),
          error: "Command execution timed out after 5 minutes",
        });
      },
      5 * 60 * 1000,
    );
  });
}
