import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const AGENT_TOOLS = {
  opencode: {
    name: "opencode",
    command: "opencode",
    modelFlag: "--model",
    listModelsCommand: "opencode models list",
    promptFlag: "run",
  },
  cursor: {
    name: "cursor",
    command: "cursor-agent",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "-p",
  },
  trae: {
    name: "trae",
    command: "trae-cli",
    modelFlag: "--model",
    listModelsCommand: null,
    promptFlag: "run",
  },
  claude: {
    name: "claude code",
    command: "claude",
    modelFlag: null,
    listModelsCommand: null,
    promptFlag: "-p",
  },
} as const;

export type AgentToolName = keyof typeof AGENT_TOOLS;

export async function isCommandAvailable(
  command: string,
): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

export async function getModelsForTool(
  toolName: AgentToolName,
): Promise<string[]> {
  const tool = AGENT_TOOLS[toolName];

  if (!tool.listModelsCommand) {
    return [];
  }

  try {
    const { stdout } = await execAsync(
      tool.listModelsCommand,
      {
        timeout: 5000,
      },
    );
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.startsWith("#") &&
          line.length > 0,
      );
  } catch (error) {
    console.error(
      `Failed to list models for ${toolName}:`,
      error,
    );
    return [];
  }
}

function buildAgentCommand(
  toolName: AgentToolName,
  prompt: string,
  model?: string,
): { command: string; args: string[] } {
  const tool = AGENT_TOOLS[toolName];
  const args: string[] = [];

  if (tool.promptFlag) {
    args.push(tool.promptFlag);
  }
  args.push(prompt);

  if (model && tool.modelFlag) {
    args.push(tool.modelFlag, model);
  }

  return {
    command: tool.command,
    args,
  };
}

export async function executeAgentCommand(
  toolName: AgentToolName,
  prompt: string,
  model?: string,
): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  const tool = AGENT_TOOLS[toolName];

  const isAvailable = await isCommandAvailable(
    tool.command,
  );
  if (!isAvailable) {
    return {
      success: false,
      output: "",
      error: `Tool "${toolName}" is not installed or not in PATH`,
    };
  }

  const { command, args } =
    buildAgentCommand(toolName, prompt, model);

  return new Promise((resolve) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn(command, args, {
      env: {
        ...process.env,
        PATH: process.env.PATH,
      },
      shell: true,
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
          code !== 0
            ? error ||
              `Process exited with code ${code}`
            : undefined,
      });
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        output: outputChunks.join(""),
        error: err.message,
      });
    });

    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        output: outputChunks.join(""),
        error: "Command execution timed out after 5 minutes",
      });
    }, 5 * 60 * 1000);
  });
}
