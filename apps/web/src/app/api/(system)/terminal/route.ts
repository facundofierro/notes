import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { StringDecoder } from "string_decoder";
import {
  registerProcess,
  appendOutput,
  getOutputBuffer,
  isProcessAlive,
  getProcessStatus,
  cleanupSession,
} from "@/lib/agent-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (action === "status") {
    const status = getProcessStatus(id);
    if (!status) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  if (action === "cleanup") {
    cleanupSession(id);
    return NextResponse.json({ success: true });
  }

  const buffer = getOutputBuffer(id);
  const alive = isProcessAlive(id);

  if (buffer === undefined && !alive) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let position = 0;

  const stream = new ReadableStream({
    start(controller) {
      let controllerClosed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          controllerClosed = true;
          clearInterval(pollInterval);
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

      if (buffer) {
        safeEnqueue(encoder.encode(buffer));
        position = buffer.length;
      }

      if (!alive) {
        safeClose();
        return;
      }

      const pollInterval = setInterval(() => {
        if (controllerClosed) {
          clearInterval(pollInterval);
          return;
        }

        const currentBuffer = getOutputBuffer(id);
        if (currentBuffer && currentBuffer.length > position) {
          const newContent = currentBuffer.slice(position);
          position = currentBuffer.length;
          safeEnqueue(encoder.encode(newContent));
        }

        if (!isProcessAlive(id)) {
          const finalBuffer = getOutputBuffer(id);
          if (finalBuffer && finalBuffer.length > position) {
            safeEnqueue(encoder.encode(finalBuffer.slice(position)));
          }
          clearInterval(pollInterval);
          safeClose();
        }
      }, 100);

      request.signal.addEventListener("abort", () => {
        controllerClosed = true;
        clearInterval(pollInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Agent-Process-ID": id,
      "X-Agent-Process-Running": alive ? "true" : "false",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cwd, cols = 200, rows = 50 } = body;

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

        const decoder = new StringDecoder("utf8");

        const usePty =
          process.platform === "darwin" || process.platform === "linux";

        let spawnCommand = "zsh";
        let spawnArgs = ["-i", "-l"];

        if (usePty) {
          spawnCommand = "python3";
          spawnArgs = [
            "-u",
            "-c",
            "import pty,os,sys,fcntl,termios,struct; pty.fork = (lambda f=pty.fork: lambda: (lambda p,d: (p, (p==0 or fcntl.ioctl(d, termios.TIOCSWINSZ, struct.pack('HHHH', int(os.environ.get('LINES', 24)), int(os.environ.get('COLUMNS', 80)), 0, 0)), d)[-1]))(*f()))(); pty.spawn(sys.argv[1:])",
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
            COLUMNS: cols.toString(),
            LINES: rows.toString(),
            FORCE_COLOR: "1",
            TERM: "xterm-256color",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });

        registerProcess(processId, child, "Interactive Terminal");

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
          const remaining = decoder.end();
          if (remaining) appendOutput(processId, remaining);

          if (code !== 0) {
            const msg = `\nProcess exited with code ${code}`;
            appendOutput(processId, msg);
            safeEnqueue(encoder.encode(msg));
          }
          safeClose();
        });

        child.on("error", (err) => {
          const msg = `\nFailed to start terminal: ${err.message}`;
          appendOutput(processId, msg);
          safeEnqueue(encoder.encode(msg));
          safeClose();
        });

        // On client disconnect, stop streaming but keep stdout/stderr listeners
        // alive so appendOutput continues buffering for reconnection.
        // safeEnqueue already no-ops when controllerClosed is true.
        request.signal.addEventListener("abort", () => {
          controllerClosed = true;
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
    console.error("Terminal startup error:", error);
    return NextResponse.json(
      {
        error: "Failed to start terminal",
      },
      { status: 500 },
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
        { status: 404 },
      );
    }

    process.stdin.write(input);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send input" },
      { status: 500 },
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
      { status: 500 },
    );
  }
}
