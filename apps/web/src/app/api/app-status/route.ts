import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { readSettings, ProjectConfig } from "@/lib/settings";

const execAsync = promisify(exec);

interface AppProcess {
  pid: number;
  startedAt: string;
  command: string;
}

const processStore = new Map<string, AppProcess>();

async function checkUrlAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      method: 'HEAD',
    });
    clearTimeout(timeoutId);
    
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
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
          stdio: ["ignore", "pipe", "pipe"],
        });

        if (!child.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to start process",
          });
        }

        processStore.set(repo, {
          pid: child.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
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
            process.kill(managedProcess.pid, "SIGTERM");
            processStore.delete(repo);
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
            process.kill(managedProcess.pid, "SIGTERM");
            processStore.delete(repo);
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
          stdio: ["ignore", "pipe", "pipe"],
        });

        if (!child.pid) {
          return NextResponse.json({
            success: false,
            error: "Failed to restart process",
          });
        }

        processStore.set(repo, {
          pid: child.pid,
          startedAt: new Date().toISOString(),
          command: devCommand,
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
