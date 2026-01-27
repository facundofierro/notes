import { NextResponse } from "next/server";
import {
  AGENT_TOOLS,
  executeAgentCommand,
  getModelsForTool,
  isCommandAvailable,
} from "@/lib/agent-tools";

import type { AgentToolName } from "@/lib/agent-tools";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const toolParam = searchParams.get("tool");

  if (action === "tools") {
    const availableTools = [];

    for (const [key, tool] of Object.entries(AGENT_TOOLS)) {
      const isAvailable = await isCommandAvailable(tool.command);
      availableTools.push({
        name: key,
        displayName: tool.name,
        available: isAvailable,
      });
    }

    return NextResponse.json({ tools: availableTools });
  }

  if (action === "models" && toolParam) {
    const toolName = toolParam as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        { error: `Unknown tool: ${toolParam}` },
        { status: 400 },
      );
    }

    const models = await getModelsForTool(toolName);
    return NextResponse.json({ models });
  }

  return NextResponse.json(
    {
      error:
        "Invalid action. Use ?action=tools or ?action=models&tool=<tool>",
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tool, prompt, model } = body;

    if (!tool || !prompt) {
      return NextResponse.json(
        { error: "Tool and prompt are required" },
        { status: 400 },
      );
    }

    const toolName = tool as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}` },
        { status: 400 },
      );
    }

    const result = await executeAgentCommand(
      toolName,
      prompt,
      model,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent execution error:", error);
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
