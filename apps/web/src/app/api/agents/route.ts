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
    const stream = new ReadableStream({
      start(controller) {
        // Log debug info to the stream
        controller.enqueue(
          encoder.encode(
            `\n[Debug] Spawning command: ${resolvedCommand}\n[Debug] Args: ${JSON.stringify(args)}\n\n`,
          ),
        );

        const child = spawn(
          resolvedCommand,
          args,
          {
            cwd: cwd || undefined,
            env: {
              ...process.env,
              PATH: process.env.PATH,
              COLUMNS: "300", // Force wider output for terminal viewer
              LINES: "200",
              FORCE_COLOR: "1", // Ensure colors are preserved
            },
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ], // Ignore stdin to prevent hanging if it waits for input
          },
        );

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
          "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error(
      "Agent execution error:",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute agent";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
