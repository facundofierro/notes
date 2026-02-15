import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { createTask } from "@/lib/task-creator";
import { db } from "@/lib/db";
import { inboxTasks } from "@/lib/db/schema";
import { cacheDel } from "@/lib/redis";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401,
      headers: corsHeaders,
    });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyEntry = validateApiKey(apiKey);

  if (!keyEntry) {
    return NextResponse.json({ error: "Invalid API Key" }, {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    // 1. Persist to postgres inbox_tasks (source of truth for electron sync)
    const [dbTask] = await db
      .insert(inboxTasks)
      .values({
        repo: body.repo ?? "",
        title: body.title ?? "Untitled",
        description: body.description ?? null,
        screenshotDataUrl: body.screenshotDataUrl ?? null,
        sourceUrl: body.sourceUrl ?? null,
        reporter: body.reporter ?? null,
        priority: body.priority ?? null,
        state: body.state ?? "inbox",
      })
      .returning();

    // Invalidate cached inbox for this repo
    await cacheDel(`inbox:${dbTask.repo}:false:all`);

    // 2. Also write to local filesystem (for the electron/web app on the same host)
    let fileResult: { success: boolean; path?: string; id?: string } = {
      success: false,
    };
    try {
      fileResult = await createTask(body);
    } catch (fileError) {
      // File write is best-effort; the DB record is the authoritative store
      console.warn("[/api/v1/reports] Could not write local file:", fileError);
    }

    return NextResponse.json(
      {
        id: dbTask.id,
        success: true,
        path: fileResult.path,
        fileId: fileResult.id,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/v1/reports]", error);
    return NextResponse.json({ error: message }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
