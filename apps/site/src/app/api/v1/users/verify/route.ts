import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/redis";
import type { User } from "@/lib/db/schema";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/users/verify?email=<email>
 *
 * Checks whether a given email exists in the user registry.
 * Returns { authorized: true, user: { id, email, name } } when found,
 * or { authorized: false } when not.
 *
 * The `repo` query param is accepted for future whitelist checks but
 * is not yet enforced (that belongs to Phase 3 web-app sync).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Missing required query param: email" },
      { status: 400, headers: corsHeaders }
    );
  }

  const cacheKey = `user:email:${email}`;
  const cached = await cacheGet<User>(cacheKey);

  if (cached) {
    return NextResponse.json(
      { authorized: true, user: { id: cached.id, email: cached.email, name: cached.name } },
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { authorized: false },
        { status: 200, headers: corsHeaders }
      );
    }

    const user = result[0];
    await cacheSet(cacheKey, user, CACHE_TTL.USER);

    return NextResponse.json(
      { authorized: true, user: { id: user.id, email: user.email, name: user.name } },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/v1/users/verify]", error);
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
