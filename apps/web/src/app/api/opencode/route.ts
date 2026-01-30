import { NextResponse } from "next/server";
import { ensureServer } from "@/lib/sidecar";

export async function GET() {
  const port = Number(
    process.env.OPENCODE_PORT || 9988,
  );
  const baseUrl =
    process.env.OPENCODE_URL ||
    `http://localhost:${port}`;
  const startCmd =
    process.env.OPENCODE_START_CMD ||
    `opencode web --port ${port}`;
  const healthPath =
    process.env.OPENCODE_HEALTH_PATH ||
    "/";

  try {
    const url = await ensureServer({
      name: "opencode",
      port,
      url: baseUrl,
      healthPath,
      startCmd,
      cwd: process.cwd(),
      env: process.env as Record<
        string,
        string
      >,
      startTimeoutMs: Number(
        process.env
          .OPENCODE_START_TIMEOUT ||
          30000,
      ),
    });
    return NextResponse.json({ url });
  } catch (error: unknown) {
    console.error(
      "OpenCode API Error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          (error as Error)?.message ||
          "Failed to ensure OpenCode server",
      },
      { status: 500 },
    );
  }
}
