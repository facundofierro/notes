import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { getExtendedPath, resolveCommandPath } from "@/lib/agent-tools";

export async function POST(request: Request) {
  try {
    const { command, args } = await request.json();

    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const resolvedPath = await resolveCommandPath("agent-browser");
    const fullArgs = [command, ...(args || [])];

    return new Promise<Response>((resolve) => {
      const outputChunks: string[] = [];
      const errorChunks: string[] = [];

      const child = spawn(resolvedPath, fullArgs, {
        env: { ...process.env, PATH: getExtendedPath() },
      });

      child.stdout.on("data", (data) => {
        outputChunks.push(data.toString());
      });

      child.stderr.on("data", (data) => {
        errorChunks.push(data.toString());
      });

      child.on("close", (code) => {
        resolve(
          NextResponse.json({
            success: code === 0,
            output: outputChunks.join(""),
            error: code !== 0 ? errorChunks.join("") : undefined,
            exitCode: code,
          })
        );
      });

      child.on("error", (err) => {
        resolve(
          NextResponse.json(
            { success: false, output: "", error: err.message, exitCode: -1 },
            { status: 500 }
          )
        );
      });

      // 30s timeout
      setTimeout(() => {
        child.kill();
        resolve(
          NextResponse.json({
            success: false,
            output: outputChunks.join(""),
            error: "Command timed out after 30 seconds",
            exitCode: -1,
          })
        );
      }, 30000);
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
