import { NextResponse } from "next/server";
import { ensureServer } from "@/lib/sidecar";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      path?: string;
      prompt?: string;
      sessionId?: string;
    };

    const projectPath = body.path;
    const prompt = body.prompt;
    const sessionId = body.sessionId;

    if (!prompt || !sessionId) {
      return NextResponse.json(
        {
          error:
            "Missing prompt or sessionId",
        },
        { status: 400 },
      );
    }

    const port = Number(
      process.env.OPENCODE_PORT || 9988,
    );
    const baseUrl =
      process.env.OPENCODE_URL ||
      `http://localhost:${port}`;
    const startCmd =
      process.env.OPENCODE_START_CMD ||
      `opencode serve --port ${port} --hostname 127.0.0.1`;
    const healthPath =
      process.env.OPENCODE_HEALTH_PATH ||
      "/global/health";

    const cwd = projectPath || process.cwd();

    const url = await ensureServer({
      name: "opencode",
      port,
      url: baseUrl,
      healthPath,
      startCmd,
      cwd,
      env: {
        ...(process.env as Record<string, string>),
        BROWSER: "none",
        CI: "1",
      },
      startTimeoutMs: Number(
        process.env.OPENCODE_START_TIMEOUT ||
          30000,
      ),
    });

    const dir = projectPath || cwd;

    await fetch(
      `${url}/session/${sessionId}/message?directory=${encodeURIComponent(dir)}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          parts: [
            {
              type: "text",
              text: prompt,
            },
          ],
        }),
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error: unknown) {
    console.error(
      "OpenCode Message API Error:",
      error,
    );
    return NextResponse.json(
      {
        error:
          (error as Error)?.message ||
          "Failed to send OpenCode message",
      },
      { status: 500 },
    );
  }
}
