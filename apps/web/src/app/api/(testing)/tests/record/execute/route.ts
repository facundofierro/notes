import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { getExtendedPath, resolveCommandPath } from "@/lib/agent-tools";

export async function POST(request: Request) {
  try {
    const { command, args } = await request.json();
    console.log(`[RecordExecute] Received command: ${command}`, { args });

    if (!command) {
      console.error("[RecordExecute] Missing command in request");
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 },
      );
    }

    const resolvedPath = await resolveCommandPath("agent-browser");
    const fullArgs = [command, ...(args || [])];
    console.log(
      `[RecordExecute] Spawning ${resolvedPath} with args:`,
      fullArgs,
    );

    return new Promise<Response>((resolve) => {
      const outputChunks: string[] = [];
      const errorChunks: string[] = [];

      const child = spawn(resolvedPath, fullArgs, {
        env: { ...process.env, PATH: getExtendedPath() },
      });

      child.stdout.on("data", (data) => {
        const str = data.toString();
        // console.log(`[RecordExecute] stdout: ${str}`);
        outputChunks.push(str);
      });

      child.stderr.on("data", (data) => {
        const str = data.toString();
        console.warn(`[RecordExecute] stderr: ${str}`);
        errorChunks.push(str);
      });

      child.on("close", (code) => {
        console.log(`[RecordExecute] Process closed with code: ${code}`);
        resolve(
          NextResponse.json({
            success: code === 0,
            output: outputChunks.join(""),
            error: code !== 0 ? errorChunks.join("") : undefined,
            exitCode: code,
          }),
        );
      });

      child.on("error", (err) => {
        console.error("[RecordExecute] Child process error:", err);
        resolve(
          NextResponse.json(
            { success: false, output: "", error: err.message, exitCode: -1 },
            { status: 500 },
          ),
        );
      });

      // 30s timeout
      setTimeout(() => {
        if (child.exitCode === null) {
          console.error(
            "[RecordExecute] Command timed out after 30 seconds, killing process",
          );
          child.kill();
          resolve(
            NextResponse.json({
              success: false,
              output: outputChunks.join(""),
              error: "Command timed out after 30 seconds",
              exitCode: -1,
            }),
          );
        }
      }, 30000);
    });
  } catch (error: any) {
    console.error("[RecordExecute] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
