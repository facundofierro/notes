import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");
const INDEX_FILE = path.join(TEST_DIR, "index.json");

function resolveTestPath(id: string): string | null {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
      const entry = index.find((t: any) => t.id === id);
      if (entry && entry.group && entry.folder) {
        const p = path.join(TEST_DIR, entry.group, entry.folder, "test.json");
        if (fs.existsSync(p)) return p;
      }
    } catch { }
  }
  const flat = path.join(TEST_DIR, `${id}.json`);
  if (fs.existsSync(flat)) return flat;
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "No test ID" }, { status: 400 });

    const testPath = resolveTestPath(id);
    if (!testPath || !fs.existsSync(testPath)) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    let testName = id;
    if (fs.existsSync(INDEX_FILE)) {
        try {
            const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
            const entry = index.find((t: any) => t.id === id);
            if (entry) testName = entry.name || testName;
        } catch {}
    }

    // Create execution directory
    const execId = `exec-${Date.now()}`;
    const execDir = path.join(process.cwd(), ".agelum/tests/runs", id, execId);
    fs.mkdirSync(execDir, { recursive: true });

    const startedAt = new Date().toISOString();

    const runnerPath = path.join(
      process.cwd(),
      "packages/test-engine/src/runner.ts",
    );

    const cwd = process.cwd();
    const encoder = new TextEncoder();
    const allLogs: string[] = [];
    const allScreenshots: string[] = [];

    const stream = new ReadableStream({
      start(controller) {
        // Emit execution metadata as first line
        const meta = JSON.stringify({ type: "exec_start", executionId: execId, testId: id, startedAt });
        controller.enqueue(encoder.encode(meta + "\n"));

        const child = spawn(
          "npx",
          ["tsx", runnerPath, testPath],
          {
            cwd,
            env: { ...process.env, PATH: process.env.PATH },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );

        const processChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          controller.enqueue(encoder.encode(text));

          // Collect logs and screenshots for persistence
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            allLogs.push(line);
            try {
              const jsonMatch = line.match(/^\{.*\}$/);
              if (jsonMatch) {
                const event = JSON.parse(jsonMatch[0]);
                if (event.type === "screenshot" && event.path) {
                  allScreenshots.push(event.path);
                }
              }
            } catch {
              // not JSON, that's fine
            }
          }
        };

        child.stdout.on("data", processChunk);
        child.stderr.on("data", processChunk);

        child.on("close", (code) => {
          const completedAt = new Date().toISOString();
          const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
          const status = code === 0 ? "passed" : "failed";

          controller.enqueue(encoder.encode(`\nProcess exited with code ${code}\n`));

          // Persist execution result
          const result = {
            id: execId,
            testId: id,
            testName,
            startedAt,
            completedAt,
            status,
            duration,
            exitCode: code,
            screenshotCount: allScreenshots.length,
            logs: allLogs,
            screenshots: allScreenshots.map((p) => {
              const parts = p.split(".agelum/tests/runs/");
              return parts.length > 1 ? `/api/tests/artifacts/${parts[1]}` : p;
            }),
          };

          try {
            fs.writeFileSync(
              path.join(execDir, "result.json"),
              JSON.stringify(result, null, 2)
            );
          } catch (e) {
            console.error("Failed to persist execution result:", e);
          }

          // Emit completion event
          const completionEvent = JSON.stringify({ type: "exec_complete", executionId: execId, status, duration });
          controller.enqueue(encoder.encode(completionEvent + "\n"));

          controller.close();
        });

        child.on("error", (err) => {
          const completedAt = new Date().toISOString();
          const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

          controller.enqueue(encoder.encode(`Error: ${err.message}\n`));

          // Persist error result
          const result = {
            id: execId,
            testId: id,
            testName,
            startedAt,
            completedAt,
            status: "error",
            duration,
            exitCode: -1,
            screenshotCount: allScreenshots.length,
            logs: [...allLogs, `Error: ${err.message}`],
            screenshots: allScreenshots.map((p) => {
              const parts = p.split(".agelum/tests/runs/");
              return parts.length > 1 ? `/api/tests/artifacts/${parts[1]}` : p;
            }),
          };

          try {
            fs.writeFileSync(
              path.join(execDir, "result.json"),
              JSON.stringify(result, null, 2)
            );
          } catch (e) {
            console.error("Failed to persist execution result:", e);
          }

          controller.close();
        });
      },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Execution-Id": execId,
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
