import { NextResponse } from "next/server";
import { spawn } from "child_process";
import {
  AGENT_TOOLS,
  buildAgentCommand,
  executeAgentCommand,
  getModelsForTool,
  isCommandAvailable,
  resolveCommandPath,
} from "@/lib/agent-tools";

import { registerProcess } from "@/lib/agent-store";
import type { AgentToolName } from "@/lib/agent-tools";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const action =
    searchParams.get("action");
  const toolParam =
    searchParams.get("tool");

  if (action === "tools") {
    const availableTools = [];

    for (const [
      key,
      tool,
    ] of Object.entries(AGENT_TOOLS)) {
      const isAvailable =
        await isCommandAvailable(
          tool.command,
        );
      availableTools.push({
        name: key,
        displayName: tool.name,
        available: isAvailable,
      });
    }

    return NextResponse.json({
      tools: availableTools,
    });
  }

  if (
    action === "models" &&
    toolParam
  ) {
    const toolName =
      toolParam as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        {
          error: `Unknown tool: ${toolParam}`,
        },
        { status: 400 },
      );
    }

    const models =
      await getModelsForTool(toolName);
    return NextResponse.json({
      models,
    });
  }

  return NextResponse.json(
    {
      error:
        "Invalid action. Use ?action=tools or ?action=models&tool=<tool>",
    },
    { status: 400 },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const { tool, prompt, model, cwd } =
      body;

    if (!tool || !prompt) {
      return NextResponse.json(
        {
          error:
            "Tool and prompt are required",
        },
        { status: 400 },
      );
    }

    const toolName =
      tool as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        {
          error: `Unknown tool: ${tool}`,
        },
        { status: 400 },
      );
    }

    const isAvailable =
      await isCommandAvailable(
        AGENT_TOOLS[toolName].command,
      );
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: `Tool "${toolName}" is not installed or not in PATH`,
        },
        { status: 400 },
      );
    }

    const { command, args } =
      buildAgentCommand(
        toolName,
        prompt,
        model,
      );

    const resolvedCommand =
      await resolveCommandPath(command);
    console.log(
      `[Agent] Executing: ${resolvedCommand} ${args.join(" ")}`,
    );

    const encoder = new TextEncoder();
    const processId =
      crypto.randomUUID();

    const stream = new ReadableStream({
      start(controller) {
        // Log debug info to the stream
        controller.enqueue(
          encoder.encode(
            `\n[Debug] Spawning command: ${resolvedCommand}\n[Debug] Args: ${JSON.stringify(args)}\n\n`,
          ),
        );

        // Use python pty to emulate TTY
        // This is more reliable than 'script' on macOS/Linux for non-interactive shells
        const usePty =
          process.platform ===
            "darwin" ||
          process.platform === "linux";

        let spawnCommand =
          resolvedCommand;
        let spawnArgs = args;

        if (usePty) {
          spawnCommand = "python3";
          // -u for unbuffered output
          spawnArgs = [
            "-u",
            "-c",
            "import pty, sys; pty.spawn(sys.argv[1:])",
            resolvedCommand,
            ...args,
          ];
        }

        const child = spawn(
          spawnCommand,
          spawnArgs,
          {
            cwd: cwd || undefined,
            env: {
              ...process.env,
              PATH: process.env.PATH,
              COLUMNS: "200", // Force wider output for terminal viewer
              LINES: "50",
              FORCE_COLOR: "1", // Ensure colors are preserved
              TERM: "xterm-256color",
            },
            stdio: [
              "pipe", // stdin - allow input
              "pipe", // stdout
              "pipe", // stderr
            ],
          },
        );

        registerProcess(
          processId,
          child,
        );

        if (child.stdout) {
          child.stdout.on(
            "data",
            (data) => {
              controller.enqueue(
                encoder.encode(
                  data.toString(),
                ),
              );
            },
          );
        }

        if (child.stderr) {
          child.stderr.on(
            "data",
            (data) => {
              controller.enqueue(
                encoder.encode(
                  data.toString(),
                ),
              );
            },
          );
        }

        child.on("close", (code) => {
          if (code !== 0) {
            controller.enqueue(
              encoder.encode(
                `\nProcess exited with code ${code}`,
              ),
            );
          }
          controller.close();
        });

        child.on("error", (err) => {
          controller.enqueue(
            encoder.encode(
              `\nFailed to start process: ${err.message}`,
            ),
          );
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Agent-Process-ID": processId,
      },
    });
  } catch (error) {
    console.error(
      "Agent execution error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Failed to execute agent",
      },
      { status: 500 },
    );
  }
}
