import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { registerProcess } from "@/lib/agent-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cwd } = body;

    const encoder = new TextEncoder();
    const processId = crypto.randomUUID();

    const stream = new ReadableStream({
      start(controller) {
        // Use python pty to emulate TTY for interactive shell
        const usePty =
          process.platform === "darwin" ||
          process.platform === "linux";

        let spawnCommand = "zsh";
        let spawnArgs = ["-i", "-l"];

        if (usePty) {
          spawnCommand = "python3";
          spawnArgs = [
            "-u",
            "-c",
            "import pty, sys; pty.spawn(sys.argv[1:])",
            "zsh",
            "-i",
            "-l",
          ];
        }

        const child = spawn(spawnCommand, spawnArgs, {
          cwd: cwd || undefined,
          env: {
            ...process.env,
            PATH: process.env.PATH,
            COLUMNS: "200",
            LINES: "50",
            FORCE_COLOR: "1",
            TERM: "xterm-256color",
          },
          stdio: [
            "pipe", // stdin - allow input
            "pipe", // stdout
            "pipe", // stderr
          ],
        });

        registerProcess(processId, child);

        if (child.stdout) {
          child.stdout.on("data", (data) => {
            controller.enqueue(encoder.encode(data.toString()));
          });
        }

        if (child.stderr) {
          child.stderr.on("data", (data) => {
            controller.enqueue(encoder.encode(data.toString()));
          });
        }

        child.on("close", (code) => {
          if (code !== 0) {
            controller.enqueue(
              encoder.encode(`\nProcess exited with code ${code}`)
            );
          }
          controller.close();
        });

        child.on("error", (err) => {
          controller.enqueue(
            encoder.encode(`\nFailed to start terminal: ${err.message}`)
          );
          controller.close();
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
    console.error("Terminal startup error:", error);
    return NextResponse.json(
      {
        error: "Failed to start terminal",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, input } = await request.json();
    const { getProcess } = await import("@/lib/agent-store");
    const process = getProcess(id);

    if (!process || !process.stdin) {
      return NextResponse.json(
        { error: "Terminal not found or closed" },
        { status: 404 }
      );
    }

    process.stdin.write(input);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send input" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const { killProcess } = await import("@/lib/agent-store");
    const success = killProcess(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to kill process" },
      { status: 500 }
    );
  }
}


