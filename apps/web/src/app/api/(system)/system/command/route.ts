import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "node:child_process";
import { readSettings, ProjectConfig } from "@/lib/settings";
import {
  processStore,
  processOutputBuffers,
  processInputHandlers,
  cleanupProcess,
  cleanupProcessBuffer,
} from "@/lib/process-store";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, command } = body;

    if (!repo || !command) {
      return NextResponse.json(
        { error: "Missing repo or command" },
        { status: 400 },
      );
    }

    const settings = await readSettings();
    let project = settings.projects?.find(
      (p: ProjectConfig) => p.name === repo,
    );

    // If project not found directly, it might be from a folder container
    if (!project) {
      const folderConfigs =
        settings.projects?.filter((p: ProjectConfig) => p.type === "folder") ||
        [];

      for (const folderConfig of folderConfigs) {
        const potentialPath = `${folderConfig.path}/${repo}`;
        try {
          const stat = await fs.stat(potentialPath);
          if (stat.isDirectory()) {
            project = {
              id: `${folderConfig.id}/${repo}`,
              name: repo,
              path: potentialPath,
              type: "project" as const,
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
        { status: 400 },
      );
    }

    // Robust environment for macOS
    const cleanEnv: Record<string, string> = {
      HOME: process.env.HOME || "",
      USER: process.env.USER || "",
      TERM: "xterm-256color",
      LANG: "en_US.UTF-8",
      FORCE_COLOR: "1",
      BROWSER: "none",
      CI: "1",
    };

    // Merge with existing path but ensure homebrew is first
    const systemPath = process.env.PATH || "";
    cleanEnv.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${systemPath}`;

    const cmd = "/bin/zsh";
    const args = ["-l", "-c", command];

    let childProcess: ChildProcess;
    try {
      console.log(
        `[System Command] Executing: ${cmd} ${args.join(" ")} in ${repoPath}`,
      );
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
      console.error(`[System Command] Failed:`, error);
      return NextResponse.json({
        success: false,
        error: `Failed to spawn process: ${error.message || error} (cwd: ${repoPath}, command: ${command})`,
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
      `\x1b[36m━━━ Command: ${command} ━━━\x1b[0m`,
      `\x1b[90m  Cwd:     ${repoPath}\x1b[0m`,
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
      processOutputBuffers.set(
        pid,
        existing + `\x1b[31m${data.toString()}\x1b[m`,
      );
    });

    // Capture exit
    childProcess.on("exit", (code, signal) => {
      const existing = processOutputBuffers.get(pid) || "";
      const exitLine = `
[Process exited] code=${code ?? "unknown"} signal=${signal ?? "unknown"}
`;
      processOutputBuffers.set(pid, existing + exitLine);

      cleanupProcess(repo, pid);
      setTimeout(() => {
        cleanupProcessBuffer(pid);
      }, 10000);
    });

    // Store it so logs can be streamed
    processStore.set(repo, {
      pid: pid,
      startedAt: new Date().toISOString(),
      command: command,
      childProcess,
    });

    return NextResponse.json({
      success: true,
      pid: pid,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute system command" },
      { status: 500 },
    );
  }
}
