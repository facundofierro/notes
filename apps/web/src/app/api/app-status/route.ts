import { NextRequest, NextResponse } from "next/server";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { readSettings, ProjectConfig } from "@/lib/settings";
import net from "node:net";
import { Agent } from "undici";
import { processStore, processOutputBuffers, processStdinStreams, cleanupProcess } from "@/lib/process-store";

const execAsync = promisify(exec);
const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

function isLocalLikeHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.startsWith("127.")
  );
}

function checkPortOpen(
  hostname: string,
  port: number,
  timeoutMs = 800,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const done = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
    socket.connect(port, hostname, () => done(true));
  });
}

async function tryFetch(
  url: string,
  opts?: { insecure?: boolean },
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    const init: RequestInit & { dispatcher?: Agent } = {
      signal: controller.signal,
      method: "HEAD",
      dispatcher: opts?.insecure ? insecureAgent : undefined,
    };
    const response = await fetch(url, init);
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkUrlAlive(url: string): Promise<boolean> {
  const parsed = new URL(url);

  if (await tryFetch(url)) return true;

  if (isLocalLikeHost(parsed.hostname)) {
    if (await tryFetch(url, { insecure: true })) return true;
  }

  const port = parseInt(
    parsed.port ||
      (parsed.protocol === "https:" ? "443" : "80"),
    10,
  );
  if (port && port !== 80 && port !== 443) {
    return checkPortOpen(parsed.hostname, port);
  }

  return false;
}

async function checkPidAlive(pid: number): Promise<boolean> {
  try {
    // On Unix systems, kill with signal 0 checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function findProcessByPort(port: number): Promise<number | null> {
  try {
    const { stdout } = await execAsync(`lsof -ti :${port}`);
    const pid = parseInt(stdout.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ error: "Missing repo" }, { status: 400 });
  }

  try {
    const settings = readSettings();
    const project = settings.projects?.find((p: ProjectConfig) => p.name === repo);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const managedProcess = processStore.get(repo);
    let isManaged = false;
    let isRunning = false;
    let pid: number | null = null;

    // Check if we have a managed process
    if (managedProcess) {
      const alive = await checkPidAlive(managedProcess.pid);
      if (alive) {
        isManaged = true;
        isRunning = true;
        pid = managedProcess.pid;
      } else {
        // Process died, clean up
        processStore.delete(repo);
      }
    }

    // If not managed, check if running externally
    if (!isRunning && project.url) {
      const urlAlive = await checkUrlAlive(project.url);
      if (urlAlive) {
        isRunning = true;
        // Try to find the PID by port
        const urlObj = new URL(project.url);
        const port = parseInt(urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'), 10);
        if (port && port !== 80 && port !== 443) {
          pid = await findProcessByPort(port);
        }
      }
    }

    return NextResponse.json({
      isRunning,
      isManaged,
      pid,
      startedAt: managedProcess?.startedAt,
      command: managedProcess?.command,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check app status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { repo, action } = body;

  if (!repo || !action) {
    return NextResponse.json(
      { error: "Missing repo or action" },
      { status: 400 }
    );
  }

  try {
    const settings = readSettings();
    const project = settings.projects?.find((p: ProjectConfig) => p.name === repo);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const repoPath = project.path;

    switch (action) {
      case "start": {
        // Check if already running
        const managedProcess = processStore.get(repo);
        if (managedProcess && (await checkPidAlive(managedProcess.pid))) {
          return NextResponse.json({
            success: false,
            error: "Already running (managed)",
          });
        }

        // Check if running externally
        if (project.url && (await checkUrlAlive(project.url))) {
          return NextResponse.json({
            success: false,
            error: "Already running externally",
          });
        }

        const devCommand = project.commands?.dev || "pnpm dev";
        const [cmd, ...args] = devCommand.split(" ");

        const child = spawn(cmd, args, {
          cwd: repoPath,
          detached: false,
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (!child.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to start process",
          });
        }

        // Initialize output buffer for this process
        processOutputBuffers.set(child.pid, "");

        // Store stdin for interactive input
        if (child.stdin) {
          processStdinStreams.set(child.pid, child.stdin);
        }

        // Capture stdout
        child.stdout?.on("data", (data: Buffer) => {
          const text = data.toString();
          const existing = processOutputBuffers.get(child.pid!) || "";
          processOutputBuffers.set(child.pid!, existing + text);
        });

        // Capture stderr
        child.stderr?.on("data", (data: Buffer) => {
          const text = data.toString();
          const existing = processOutputBuffers.get(child.pid!) || "";
          processOutputBuffers.set(child.pid!, existing + text);
        });

        // Clean up on process exit
        child.on("exit", () => {
          if (child.pid) {
            cleanupProcess(repo, child.pid);
          }
        });

        processStore.set(repo, {
          pid: child.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
          childProcess: child,
        });

        return NextResponse.json({
          success: true,
          pid: child.pid,
        });
      }

      case "stop": {
        const managedProcess = processStore.get(repo);
        
        if (managedProcess) {
          // Stop managed process
          try {
            if (managedProcess.childProcess) {
              managedProcess.childProcess.kill("SIGTERM");
            } else {
              process.kill(managedProcess.pid, "SIGTERM");
            }
            cleanupProcess(repo, managedProcess.pid);
            return NextResponse.json({ success: true, managed: true });
          } catch (error: any) {
            return NextResponse.json({
              success: false,
              error: error.message,
            });
          }
        } else {
          // Try to stop external process by port
          if (project.url) {
            const urlObj = new URL(project.url);
            const port = parseInt(
              urlObj.port || (urlObj.protocol === "https:" ? "443" : "80"),
              10
            );
            if (port && port !== 80 && port !== 443) {
              const pid = await findProcessByPort(port);
              if (pid) {
                try {
                  process.kill(pid, "SIGTERM");
                  // Clean up if it was somehow in our buffers
                  processOutputBuffers.delete(pid);
                  processStdinStreams.delete(pid);
                  return NextResponse.json({ success: true, managed: false });
                } catch (error: any) {
                  return NextResponse.json({
                    success: false,
                    error: error.message,
                  });
                }
              }
            }
          }
          
          return NextResponse.json({
            success: false,
            error: "No running process found",
          });
        }
      }

      case "restart": {
        // Stop first
        const managedProcess = processStore.get(repo);
        if (managedProcess) {
          try {
            if (managedProcess.childProcess) {
              managedProcess.childProcess.kill("SIGTERM");
            } else {
              process.kill(managedProcess.pid, "SIGTERM");
            }
            cleanupProcess(repo, managedProcess.pid);
            // Wait a bit for the process to die
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch {
            // Ignore errors
          }
        }

        // Then start
        const devCommand = project.commands?.dev || "pnpm dev";
        const [cmd, ...args] = devCommand.split(" ");

        const child = spawn(cmd, args, {
          cwd: repoPath,
          detached: false,
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (!child.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to restart process",
          });
        }

        // Initialize output buffer for this process
        processOutputBuffers.set(child.pid, "");

        // Store stdin for interactive input
        if (child.stdin) {
          processStdinStreams.set(child.pid, child.stdin);
        }

        // Capture stdout
        child.stdout?.on("data", (data: Buffer) => {
          const text = data.toString();
          const existing = processOutputBuffers.get(child.pid!) || "";
          processOutputBuffers.set(child.pid!, existing + text);
        });

        // Capture stderr
        child.stderr?.on("data", (data: Buffer) => {
          const text = data.toString();
          const existing = processOutputBuffers.get(child.pid!) || "";
          processOutputBuffers.set(child.pid!, existing + text);
        });

        // Clean up on process exit
        child.on("exit", () => {
          if (child.pid) {
            cleanupProcess(repo, child.pid);
          }
        });

        processStore.set(repo, {
          pid: child.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
          childProcess: child,
        });

        return NextResponse.json({
          success: true,
          pid: child.pid,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to perform action" },
      { status: 500 }
    );
  }
}
