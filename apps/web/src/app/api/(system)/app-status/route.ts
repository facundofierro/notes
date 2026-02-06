import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { readSettings, ProjectConfig } from "@/lib/settings";
import net from "node:net";
import { Agent } from "undici";
import { processStore, processOutputBuffers, processInputHandlers, cleanupProcess, cleanupProcessBuffer } from "@/lib/process-store";
import { spawn, ChildProcess } from "node:child_process";

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

async function checkUrlAlive(url: string, strict = false): Promise<boolean> {
  const parsed = new URL(url);

  if (await tryFetch(url)) return true;

  if (isLocalLikeHost(parsed.hostname)) {
    if (await tryFetch(url, { insecure: true })) return true;
  }

  if (strict) return false;

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

    let isUrlReady = false;

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

    // Check if URL is responding
    if (project.url) {
      isUrlReady = await checkUrlAlive(project.url, true); // Strict check for readiness
      const isAliveAtAll = isUrlReady || await checkUrlAlive(project.url, false);
      
      if (isAliveAtAll) {
        isRunning = true;
        // If not managed but URL is alive, try to find the PID
        if (!isManaged) {
          const urlObj = new URL(project.url);
          const port = parseInt(urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'), 10);
          if (port && port !== 80 && port !== 443) {
            pid = await findProcessByPort(port);
          }
        }
      }
    }

    return NextResponse.json({
      isRunning,
      isManaged,
      isUrlReady,
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
      case "shell":
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
        if (action === "start" && project.url && (await checkUrlAlive(project.url))) {
          return NextResponse.json({
            success: false,
            error: "Already running externally",
          });
        }

        const isShellAction = action === "shell";
        const devCommand = isShellAction ? "shell" : (project.commands?.dev || "pnpm dev");
        
        // Robust environment for macOS
        const cleanEnv: Record<string, string> = {
          HOME: process.env.HOME || "",
          USER: process.env.USER || "",
          TERM: "xterm-256color",
          LANG: "en_US.UTF-8",
          FORCE_COLOR: "1",
          BROWSER: "none",
          CI: "1"
        };
        
        // Merge with existing path but ensure homebrew is first
        const systemPath = process.env.PATH || "";
        cleanEnv.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${systemPath}`;

        let cmd: string;
        let args: string[];

        if (isShellAction || action === "start") {
          cmd = "/bin/zsh";
          args = isShellAction ? ["-l"] : ["-l", "-c", devCommand || "pnpm dev"];
        } else {
          cmd = "/bin/zsh";
          args = ["-l", "-c", devCommand];
        }

        let childProcess: ChildProcess;
        try {
          console.log(`[Spawn] Executing: ${cmd} ${args.join(" ")} in ${repoPath}`);
          childProcess = spawn(cmd, args, {
            cwd: repoPath,
            env: {
              ...process.env,
              ...cleanEnv,
              FORCE_COLOR: "1",
            },
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (error: any) {
          console.error(`[Spawn] Failed:`, error);
          return NextResponse.json({
            success: false,
            error: `Failed to spawn process: ${error.message || error} (cwd: ${repoPath}, cmd: ${cmd})`,
          });
        }

        if (!childProcess.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to start process (no PID)",
          });
        }

        const pid = childProcess.pid;

        // Initialize output buffer for this process
        const startBanner = [
          `\x1b[36m━━━ ${isShellAction ? 'Terminal' : 'Starting App'}: ${repo} ━━━\x1b[0m`,
          `\x1b[90m  Cwd:     ${repoPath}\x1b[0m`,
          `\x1b[90m  Command: ${cmd} ${args.join(" ")}\x1b[0m`,
          `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
          "",
        ].join("\n");
        processOutputBuffers.set(pid, startBanner);
        processInputHandlers.set(pid, (data: string) => {
          childProcess.stdin?.write(data);
        });

        // Capture output
        childProcess.stdout?.on("data", (data) => {
          const existing = processOutputBuffers.get(pid) || "";
          processOutputBuffers.set(pid, existing + data.toString());
        });

        childProcess.stderr?.on("data", (data) => {
          const existing = processOutputBuffers.get(pid) || "";
          processOutputBuffers.set(pid, existing + `\x1b[31m${data.toString()}\x1b[m`);
        });

        // Capture exit
        childProcess.on("exit", (code, signal) => {
          const existing = processOutputBuffers.get(pid) || "";
          const exitLine = `\n[Process exited] code=${code ?? "unknown"} signal=${signal ?? "unknown"}\n`;
          processOutputBuffers.set(pid, existing + exitLine);
          
          cleanupProcess(repo, pid);
          setTimeout(() => {
            cleanupProcessBuffer(pid);
          }, 10000);
        });

        processStore.set(repo, {
          pid: pid,
          startedAt: new Date().toISOString(),
          command: isShellAction ? "shell" : (devCommand || "pnpm dev"),
          childProcess,
        });

        return NextResponse.json({
          success: true,
          pid: pid,
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
            if (managedProcess.childProcess) {
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
        const cmd = "/bin/zsh";
        const args = ["-l", "-c", devCommand];

        // Robust environment for macOS
        const cleanEnv: Record<string, string> = {
          HOME: process.env.HOME || "",
          USER: process.env.USER || "",
          TERM: "xterm-256color",
          LANG: "en_US.UTF-8",
          FORCE_COLOR: "1",
          BROWSER: "none",
          CI: "1"
        };
        const systemPath = process.env.PATH || "";
        cleanEnv.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${systemPath}`;

        let childProcess: ChildProcess;
        try {
          console.log(`[Spawn] Restarting: ${cmd} ${args.join(" ")} in ${repoPath}`);
          childProcess = spawn(cmd, args, {
            cwd: repoPath,
            env: {
              ...process.env,
              ...cleanEnv,
            },
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch (error: any) {
          console.error(`[Spawn] Restart failed:`, error);
          return NextResponse.json({
            success: false,
            error: `Failed to restart process: ${error.message || error} (cwd: ${repoPath}, cmd: ${cmd}, args: ${args.join(" ")})`,
          });
        }

        if (!childProcess.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to restart process (no PID)",
          });
        }

        const pid = childProcess.pid;

        // Initialize output buffer for this process
        const startBanner = [
          `\x1b[36m━━━ Restarting App: ${repo} ━━━\x1b[0m`,
          `\x1b[90m  Cwd:     ${repoPath}\x1b[0m`,
          `\x1b[90m  Command: ${cmd} ${args.join(" ")}\x1b[0m`,
          `\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
          "",
        ].join("\n");
        processOutputBuffers.set(pid, startBanner);
        processInputHandlers.set(pid, (data: string) => {
          childProcess.stdin?.write(data);
        });

        // Capture output
        childProcess.stdout?.on("data", (data) => {
          const existing = processOutputBuffers.get(pid) || "";
          processOutputBuffers.set(pid, existing + data.toString());
        });

        childProcess.stderr?.on("data", (data) => {
          const existing = processOutputBuffers.get(pid) || "";
          processOutputBuffers.set(pid, existing + `\x1b[31m${data.toString()}\x1b[m`);
        });

        // Capture exit
        childProcess.on("exit", (code, signal) => {
          const existing = processOutputBuffers.get(pid) || "";
          const exitLine = `\n[Process exited] code=${code ?? "unknown"} signal=${signal ?? "unknown"}\n`;
          processOutputBuffers.set(pid, existing + exitLine);
          
          cleanupProcess(repo, pid);
          setTimeout(() => {
            cleanupProcessBuffer(pid);
          }, 10000);
        });

        processStore.set(repo, {
          pid: pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
          childProcess,
        });

        return NextResponse.json({
          success: true,
          pid: pid,
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
