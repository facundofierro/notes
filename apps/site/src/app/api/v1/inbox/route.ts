import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboxTasks } from "@/lib/db/schema";
import { eq, isNull, and, gt } from "drizzle-orm";
import { validateApiKey } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from "@/lib/redis";
import type { InboxTask } from "@/lib/db/schema";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/inbox?repo=<repo>&since=<ISO-timestamp>
 *
 * Returns unsynced inbox tasks for the given repo.
 * The electron app polls this endpoint to pick up new tasks.
 *
 * Query params:
 *   repo     (required) - project repo name to filter by
 *   since    (optional) - ISO timestamp; only return tasks created after this
 *   synced   (optional) - "false" (default) | "true" | "all"
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyEntry = validateApiKey(apiKey);
  if (!keyEntry) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo");
  const since = searchParams.get("since");
  const syncedParam = searchParams.get("synced") ?? "false";

  if (!repo) {
    return NextResponse.json(
      { error: "Missing required query param: repo" },
      { status: 400, headers: corsHeaders }
    );
  }

  const cacheKey = `inbox:${repo}:${syncedParam}:${since ?? "all"}`;
  const cached = await cacheGet<InboxTask[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ tasks: cached }, { status: 200, headers: corsHeaders });
  }

  try {
    const conditions = [eq(inboxTasks.repo, repo)];

    if (syncedParam === "false") {
      conditions.push(isNull(inboxTasks.syncedAt));
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        conditions.push(gt(inboxTasks.createdAt, sinceDate));
      }
    }

    const tasks = await db
      .select()
      .from(inboxTasks)
      .where(and(...conditions))
      .orderBy(inboxTasks.createdAt);

    await cacheSet(cacheKey, tasks, CACHE_TTL.INBOX);

    return NextResponse.json({ tasks }, { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/v1/inbox GET]", error);
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

/**
 * PATCH /api/v1/inbox/:id/sync
 *
 * Marks an inbox task as synced by the electron app.
 * The :id is passed as a query param since Next.js static routes don't
 * support dynamic segments here; use /api/v1/inbox/sync?id=<uuid> instead.
 *
 * Body (optional): { syncedAt: ISO-string }
 */
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyEntry = validateApiKey(apiKey);
  if (!keyEntry) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required query param: id" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const [updated] = await db
      .update(inboxTasks)
      .set({ syncedAt: new Date() })
      .where(eq(inboxTasks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404, headers: corsHeaders });
    }

    // Invalidate inbox cache for this repo
    await cacheDel(`inbox:${updated.repo}:false:all`);

    return NextResponse.json({ task: updated }, { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/v1/inbox PATCH]", error);
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
