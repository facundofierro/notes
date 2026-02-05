import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { readSettings, ProjectConfig } from "@/lib/settings";
import net from "node:net";
import { Agent } from "undici";
import { processStore, processOutputBuffers, processInputHandlers, cleanupProcess, cleanupProcessBuffer } from "@/lib/process-store";
import { spawn as spawnPty, IPty } from "node-pty";

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
    const settings = await readSettings();
    let project = settings.projects?.find((p: ProjectConfig) => p.name === repo);

    // If project not found directly, it might be from a folder container
    // Try to find it by checking folder containers
    if (!project) {
      // Look for folder containers
      const folderConfigs = settings.projects?.filter((p: ProjectConfig) => p.type === 'folder') || [];
      
      for (const folderConfig of folderConfigs) {
        const potentialPath = `${folderConfig.path}/${repo}`;
        // Check if this path exists as a directory
        try {
          const fs = await import('fs/promises');
          const stat = await fs.stat(potentialPath);
          if (stat.isDirectory()) {
            // Create a virtual project config for this folder-based project
            project = {
              id: `${folderConfig.id}/${repo}`,
              name: repo,
              path: potentialPath,
              type: 'project' as const,
              folderConfigId: folderConfig.id,
            };
            break;
          }
        } catch {
          // Path doesn't exist or isn't accessible, continue to next folder
          continue;
        }
      }
    }

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
    const settings = await readSettings();
    let project = settings.projects?.find((p: ProjectConfig) => p.name === repo);

    // If project not found directly, it might be from a folder container
    if (!project) {
      const folderConfigs = settings.projects?.filter((p: ProjectConfig) => p.type === 'folder') || [];
      
      for (const folderConfig of folderConfigs) {
        const potentialPath = `${folderConfig.path}/${repo}`;
        try {
          const fs = await import('fs/promises');
          const stat = await fs.stat(potentialPath);
          if (stat.isDirectory()) {
            project = {
              id: `${folderConfig.id}/${repo}`,
              name: repo,
              path: potentialPath,
              type: 'project' as const,
              folderConfigId: folderConfig.id,
            };
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const repoPath = project.path;
    if (!repoPath) {
      return NextResponse.json(
        { success: false, error: "Project path is missing" },
        { status: 400 }
      );
    }
    try {
      const stat = await fs.stat(repoPath);
      if (!stat.isDirectory()) {
        return NextResponse.json(
          { success: false, error: `Project path is not a directory: ${repoPath}` },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Project path not found: ${repoPath} (${error?.message || error})`,
        },
        { status: 400 }
      );
    }

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
        const shell =
          process.env.SHELL || "/bin/zsh";
        const cmd = shell;
        const args = ["-lc", devCommand];

        let ptyProcess: IPty;
        try {
          ptyProcess = spawnPty(cmd, args, {
          cwd: repoPath,
          env: {
            ...process.env,
            PATH: process.env.PATH,
            COLUMNS: "200",
            LINES: "50",
            FORCE_COLOR: "1",
            TERM: "xterm-256color",
          },
          cols: 200,
          rows: 50,
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: `Failed to start PTY: ${error.message || error} (cwd: ${repoPath}, shell: ${cmd}, args: ${args.join(" ")})`,
          });
        }

        if (!ptyProcess.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to start process",
          });
        }

        // Initialize output buffer for this process
        const startBanner = [
          `[app-start] cwd: ${repoPath}`,
          `[app-start] shell: ${cmd} ${args.join(" ")}`,
          `[app-start] command: ${devCommand}`,
          "",
        ].join("\n");
        processOutputBuffers.set(ptyProcess.pid, startBanner);
        processInputHandlers.set(ptyProcess.pid, (data: string) => {
          ptyProcess.write(data);
        });

        // Capture output
        ptyProcess.onData((data) => {
          const existing = processOutputBuffers.get(ptyProcess.pid!) || "";
          processOutputBuffers.set(ptyProcess.pid!, existing + data);
        });

        // Capture exit
        ptyProcess.onExit((event) => {
          if (ptyProcess.pid) {
            const existing = processOutputBuffers.get(ptyProcess.pid) || "";
            const exitLine = `\n[Process exited] code=${event?.exitCode ?? "unknown"} signal=${event?.signal ?? "unknown"}\n`;
            processOutputBuffers.set(ptyProcess.pid, existing + exitLine);
            
            // Clean up process tracking immediately, but keep buffer for a while
            // so the frontend can fetch the last logs
            const pid = ptyProcess.pid;
            cleanupProcess(repo, pid);
            setTimeout(() => {
              cleanupProcessBuffer(pid);
            }, 10000);
          }
        });

        processStore.set(repo, {
          pid: ptyProcess.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
          ptyProcess,
        });

        return NextResponse.json({
          success: true,
          pid: ptyProcess.pid,
        });
      }

      case "stop": {
        const managedProcess = processStore.get(repo);
        
        if (managedProcess) {
          // Stop managed process
          try {
        if (managedProcess.ptyProcess) {
          managedProcess.ptyProcess.kill();
        } else if (managedProcess.childProcess) {
          managedProcess.childProcess.kill("SIGTERM");
        } else {
          process.kill(managedProcess.pid, "SIGTERM");
        }
            cleanupProcess(repo, managedProcess.pid);
            setTimeout(() => cleanupProcessBuffer(managedProcess.pid), 10000);
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
                  processInputHandlers.delete(pid);
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
            if (managedProcess.ptyProcess) {
              managedProcess.ptyProcess.kill();
            } else if (managedProcess.childProcess) {
              managedProcess.childProcess.kill("SIGTERM");
            } else {
              process.kill(managedProcess.pid, "SIGTERM");
            }
            cleanupProcess(repo, managedProcess.pid);
            setTimeout(() => cleanupProcessBuffer(managedProcess.pid), 10000);
            // Wait a bit for the process to die
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch {
            // Ignore errors
          }
        }

        // Then start
        const devCommand = project.commands?.dev || "pnpm dev";
        const shell =
          process.env.SHELL || "/bin/zsh";
        const cmd = shell;
        const args = ["-lc", devCommand];

        let ptyProcess: IPty;
        try {
          ptyProcess = spawnPty(cmd, args, {
          cwd: repoPath,
          env: {
            ...process.env,
            PATH: process.env.PATH,
            COLUMNS: "200",
            LINES: "50",
            FORCE_COLOR: "1",
            TERM: "xterm-256color",
          },
          cols: 200,
          rows: 50,
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: `Failed to start PTY: ${error.message || error} (cwd: ${repoPath}, shell: ${cmd}, args: ${args.join(" ")})`,
          });
        }

        if (!ptyProcess.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to restart process",
          });
        }

        // Initialize output buffer for this process
        const startBanner = [
          `[app-start] cwd: ${repoPath}`,
          `[app-start] shell: ${cmd} ${args.join(" ")}`,
          `[app-start] command: ${devCommand}`,
          "",
        ].join("\n");
        processOutputBuffers.set(ptyProcess.pid, startBanner);
        processInputHandlers.set(ptyProcess.pid, (data: string) => {
          ptyProcess.write(data);
        });

        // Capture output
        ptyProcess.onData((data) => {
          const existing = processOutputBuffers.get(ptyProcess.pid!) || "";
          processOutputBuffers.set(ptyProcess.pid!, existing + data);
        });

        // Capture exit
        ptyProcess.onExit((event) => {
          if (ptyProcess.pid) {
            const existing = processOutputBuffers.get(ptyProcess.pid) || "";
            const exitLine = `\n[Process exited] code=${event?.exitCode ?? "unknown"} signal=${event?.signal ?? "unknown"}\n`;
            processOutputBuffers.set(ptyProcess.pid, existing + exitLine);
            
            // Clean up process tracking immediately, but keep buffer for a while
            // so the frontend can fetch the last logs
            const pid = ptyProcess.pid;
            cleanupProcess(repo, pid);
            setTimeout(() => {
              cleanupProcessBuffer(pid);
            }, 10000);
          }
        });

        processStore.set(repo, {
          pid: ptyProcess.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
          ptyProcess,
        });

        return NextResponse.json({
          success: true,
          pid: ptyProcess.pid,
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
