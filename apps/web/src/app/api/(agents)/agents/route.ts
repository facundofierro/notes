import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";
import { readSettings } from "@/lib/settings";
import {
  AGENT_TOOLS,
  buildAgentCommand,
  executeAgentCommand,
  getModelsForTool,
  isCommandAvailable,
  resolveCommandPath,
  getExtendedPath,
} from "@/lib/agent-tools";

import { registerProcess, appendOutput } from "@/lib/agent-store";
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
        type: tool.type,
        supportedModels: tool.supportedModels,
        available: isAvailable,
      });
    }

    return NextResponse.json({
      tools: availableTools,
    });
  }

  if (action === "models" && toolParam) {
    const toolName = toolParam as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        {
          error: `Unknown tool: ${toolParam}`,
        },
        { status: 400 },
      );
    }

    const models = await getModelsForTool(toolName);
    return NextResponse.json({
      models,
    });
  }

  return NextResponse.json(
    {
      error: "Invalid action. Use ?action=tools or ?action=models&tool=<tool>",
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tool,
      prompt,
      model,
      cwd,
      cols = 200,
      rows = 50,
      allowModify,
      workflow,
    } = body;

    if (!tool || !prompt) {
      return NextResponse.json(
        {
          error: "Tool and prompt are required",
        },
        { status: 400 },
      );
    }

    const toolName = tool as AgentToolName;
    if (!AGENT_TOOLS[toolName]) {
      return NextResponse.json(
        {
          error: `Unknown tool: ${tool}`,
        },
        { status: 400 },
      );
    }

    const settings = await readSettings();
    const toolSettings = settings.agentToolSettings?.[toolName];

    const isAvailable = await isCommandAvailable(AGENT_TOOLS[toolName].command);
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: `Tool "${toolName}" is not installed or not in PATH`,
        },
        { status: 400 },
      );
    }

    const { command, args } = buildAgentCommand(
      toolName,
      prompt,
      model,
      allowModify,
      toolSettings,
      workflow,
    );

    const resolvedCommand = await resolveCommandPath(command);
    console.log(`[Agent] Executing: ${resolvedCommand} ${args.join(" ")}`);

    const encoder = new TextEncoder();
    const processId = crypto.randomUUID();

    const stream = new ReadableStream({
      start(controller) {
        let controllerClosed = false;

        const safeEnqueue = (chunk: Uint8Array | Buffer) => {
          if (controllerClosed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            controllerClosed = true;
          }
        };

        const safeClose = () => {
          if (controllerClosed) return;
          controllerClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        };

        const debugMsg = `\n[Debug] Spawning command: ${resolvedCommand}\n[Debug] Args: ${JSON.stringify(args)}\n\n`;
        appendOutput(processId, debugMsg);
        safeEnqueue(encoder.encode(debugMsg));

        // Use python pty to emulate TTY
        // This is more reliable than 'script' on macOS/Linux for non-interactive shells
        const usePty =
          process.platform === "darwin" || process.platform === "linux";

        let spawnCommand = resolvedCommand;
        let spawnArgs = args;

        if (usePty) {
          spawnCommand = "python3";
          // -u for unbuffered output
          spawnArgs = [
            "-u",
            "-c",
            "import pty,os,sys,fcntl,termios,struct; pty.fork = (lambda f=pty.fork: lambda: (lambda p,d: (p, (p==0 or fcntl.ioctl(d, termios.TIOCSWINSZ, struct.pack('HHHH', int(os.environ.get('LINES', 24)), int(os.environ.get('COLUMNS', 80)), 0, 0)), d)[-1]))(*f()))(); pty.spawn(sys.argv[1:])",
            resolvedCommand,
            ...args,
          ];
        }

        const child = spawn(spawnCommand, spawnArgs, {
          cwd: cwd || undefined,
          env: {
            ...process.env,
            PATH: getExtendedPath(),
            COLUMNS: cols.toString(), // Force wider output for terminal viewer
            LINES: rows.toString(),
            FORCE_COLOR: "1", // Ensure colors are preserved
            TERM: "xterm-256color",
          },
          stdio: [
            "pipe", // stdin - allow input
            "pipe", // stdout
            "pipe", // stderr
          ],
        });

        registerProcess(processId, child, toolName);

        const decoder = new StringDecoder("utf8");

        const onStdout = (data: Buffer) => {
          safeEnqueue(data);
          const str = decoder.write(data);
          appendOutput(processId, str);
        };

        const onStderr = (data: Buffer) => {
          safeEnqueue(data);
          const str = decoder.write(data);
          appendOutput(processId, str);
        };

        if (child.stdout) {
          child.stdout.on("data", onStdout);
        }

        if (child.stderr) {
          child.stderr.on("data", onStderr);
        }

        child.on("close", (code) => {
          // Flush any remaining characters
          const remaining = decoder.end();
          if (remaining) {
            appendOutput(processId, remaining);
          }

          if (code !== 0) {
            const msg = `\nProcess exited with code ${code}`;
            appendOutput(processId, msg);
            safeEnqueue(encoder.encode(msg));
          }
          safeClose();
        });

        child.on("error", (err) => {
          const msg = `\nFailed to start process: ${err.message}`;
          appendOutput(processId, msg);
          safeEnqueue(encoder.encode(msg));
          safeClose();
        });

        request.signal.addEventListener("abort", () => {
          controllerClosed = true;
          if (child.stdout) child.stdout.removeListener("data", onStdout);
          if (child.stderr) child.stderr.removeListener("data", onStderr);
          safeClose();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Agent-Process-ID": processId,
      },
    });
  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute agent",
      },
      { status: 500 },
    );
  }
}
