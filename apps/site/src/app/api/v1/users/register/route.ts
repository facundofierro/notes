import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cacheSet, cacheDel, CACHE_TTL } from "@/lib/redis";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().url().optional(),
  provider: z.string(),
  providerId: z.string(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, name, image } = parsed.data;

    // Upsert: find existing user or create new one
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user;

    if (existing.length > 0) {
      // Update profile fields if they changed
      const [updated] = await db
        .update(users)
        .set({
          name: name ?? existing[0].name,
          image: image ?? existing[0].image,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email))
        .returning();
      user = updated;
    } else {
      const [created] = await db
        .insert(users)
        .values({ email, name, image })
        .returning();
      user = created;
    }

    // Invalidate cached user data
    await cacheDel(`user:email:${email}`);
    // Cache the fresh record
    await cacheSet(`user:email:${email}`, user, CACHE_TTL.USER);

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, image: user.image },
      { status: existing.length > 0 ? 200 : 201, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/v1/users/register]", error);
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
