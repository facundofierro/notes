import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { getExtendedPath, resolveCommandPath } from "@/lib/agent-tools";

function runAgentBrowser(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise(async (resolve) => {
    const resolvedPath = await resolveCommandPath("agent-browser");
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const child = spawn(resolvedPath, args, {
      env: { ...process.env, PATH: getExtendedPath() },
    });

    child.stdout.on("data", (data) => stdoutChunks.push(data.toString()));
    child.stderr.on("data", (data) => stderrChunks.push(data.toString()));

    child.on("close", (code) => {
      resolve({ code, stdout: stdoutChunks.join(""), stderr: stderrChunks.join("") });
    });

    child.on("error", (err) => {
      resolve({ code: -1, stdout: "", stderr: err.message });
    });

    setTimeout(() => {
      child.kill();
      resolve({ code: -1, stdout: stdoutChunks.join(""), stderr: "Timed out after 30s" });
    }, 30000);
  });
}

export async function POST() {
  try {
    // Take screenshot to temp file
    const tmpPath = path.join(os.tmpdir(), `agelum-record-${Date.now()}.png`);
    const [screenshotResult, snapshotResult] = await Promise.all([
      runAgentBrowser(["screenshot", tmpPath]),
      runAgentBrowser(["snapshot"]),
    ]);

    let screenshot = "";
    if (screenshotResult.code === 0 && fs.existsSync(tmpPath)) {
      screenshot = fs.readFileSync(tmpPath).toString("base64");
      try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
    }

    const snapshot = snapshotResult.code === 0 ? snapshotResult.stdout : "";

    return NextResponse.json({
      screenshot,
      snapshot,
      screenshotError: screenshotResult.code !== 0 ? screenshotResult.stderr : undefined,
      snapshotError: snapshotResult.code !== 0 ? snapshotResult.stderr : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
