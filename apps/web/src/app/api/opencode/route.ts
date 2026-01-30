import { NextResponse } from "next/server";
import { ensureServer } from "@/lib/sidecar";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const projectPath =
    searchParams.get("path");
  const prompt =
    searchParams.get("prompt");

  const port = Number(
    process.env.OPENCODE_PORT || 9988,
  );
  const baseUrl =
    process.env.OPENCODE_URL ||
    `http://localhost:${port}`;
  const startCmd =
    process.env.OPENCODE_START_CMD ||
    `opencode web --port ${port} --hostname 127.0.0.1`;
  const healthPath =
    process.env.OPENCODE_HEALTH_PATH ||
    "/global/health";

  try {
    const cwd =
      projectPath || process.cwd();

    const url = await ensureServer({
      name: "opencode",
      port,
      url: baseUrl,
      healthPath,
      startCmd,
      cwd,
      env: {
        ...(process.env as Record<
          string,
          string
        >),
        BROWSER: "none",
        CI: "1",
      },
      startTimeoutMs: Number(
        process.env
          .OPENCODE_START_TIMEOUT ||
          30000,
      ),
    });

    const dir = projectPath || cwd;
    const b64Dir =
      Buffer.from(dir).toString(
        "base64",
      );

    let finalUrl = `${url}/${b64Dir}/session`;

    if (prompt) {
      try {
        const session = await fetch(
          `${url}/session?directory=${encodeURIComponent(dir)}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({}),
          },
        ).then((res) => res.json());

        const sessionId = session?.id;
        if (sessionId) {
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
          ).catch(() => undefined);

          finalUrl = `${url}/${b64Dir}/session/${sessionId}`;
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      url: finalUrl,
    });
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
