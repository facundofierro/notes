import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import {
  processOutputBuffers,
  processInputHandlers,
} from "@/lib/process-store";

const execAsync = promisify(exec);

// Track which clients are reading which PIDs and their last read position
const clientReadPositions = new Map<
  string,
  { pid: number; position: number }
>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pidStr = searchParams.get("pid");

  if (!pidStr) {
    return NextResponse.json({ error: "Missing pid" }, { status: 400 });
  }

  const pid = parseInt(pidStr, 10);
  if (isNaN(pid)) {
    return NextResponse.json({ error: "Invalid pid" }, { status: 400 });
  }

  console.log(
    `[LogStream] Client connected for PID: ${pid}. Buffers: ${processOutputBuffers.size}, Handlers: ${processInputHandlers.size}`,
  );

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Create a readable stream for streaming logs
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let cancelled = false;
      let position = 0;

      // Initial check if process exists
      try {
        process.kill(pid, 0);
      } catch (error) {
        const buffer = processOutputBuffers.get(pid);
        if (buffer && buffer.length > 0) {
          const msg = JSON.stringify({ output: buffer }) + "\n";
          controller.enqueue(encoder.encode(msg));
          controller.close();
          return;
        }
        const msg =
          JSON.stringify({
            output: `Error: Process ${pid} not found (or exited without output)\n`,
          }) + "\n";
        controller.enqueue(encoder.encode(msg));
        controller.close();
        return;
      }

      // Poll for new output from the buffer
      const pollInterval = setInterval(async () => {
        if (cancelled) return;

        try {
          // Check if process is still alive
          process.kill(pid, 0);

          // Read from shared output buffer
          const buffer = processOutputBuffers.get(pid);
          if (buffer && buffer.length > position) {
            const newContent = buffer.slice(position);
            position = buffer.length;

            // Send the new content
            const msg = JSON.stringify({ output: newContent }) + "\n";
            controller.enqueue(encoder.encode(msg));
          }
        } catch (error) {
          // Process died
          clearInterval(pollInterval);
          const buffer = processOutputBuffers.get(pid);
          if (buffer && buffer.length > position) {
            const newContent = buffer.slice(position);
            position = buffer.length;
            const msg = JSON.stringify({ output: newContent }) + "\n";
            controller.enqueue(encoder.encode(msg));
          }
          const msg =
            JSON.stringify({
              output: "\n[Process exited]\n",
            }) + "\n";
          controller.enqueue(encoder.encode(msg));
          controller.close();
        }
      }, 100); // Poll every 100ms for responsive logs

      // Cleanup function
      request.signal.addEventListener("abort", () => {
        cancelled = true;
        clearInterval(pollInterval);
        clientReadPositions.delete(clientId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pid, input } = body;

  if (!pid || typeof input !== "string") {
    return NextResponse.json(
      { error: "Missing pid or input" },
      { status: 400 },
    );
  }

  // Send input to the process via its stdin stream
  const writeInput = processInputHandlers.get(pid);
  if (writeInput) {
    try {
      writeInput(input);
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to write to input: ${error.message}` },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(
    { error: "Process input not available" },
    { status: 404 },
  );
}
