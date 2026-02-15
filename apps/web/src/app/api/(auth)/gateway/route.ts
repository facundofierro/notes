import { NextResponse } from "next/server";
import { verifyGatewayToken } from "@/lib/auth";
import { readSettings, saveSettings } from "@/lib/settings";

const SITE_URL = process.env.SITE_URL || "https://notes.agelum.com";

export async function GET() {
  const settings = await readSettings();

  if (!settings.siteToken) {
    return NextResponse.json({ authenticated: false });
  }

  let payload;
  try {
    payload = await verifyGatewayToken(settings.siteToken);
    if (!payload.email) {
      throw new Error("Token is missing email");
    }
  } catch {
    await saveSettings({ ...settings, siteToken: undefined, siteUser: undefined });
    return NextResponse.json({ authenticated: false });
  }

  // Verify user registry record with Site app using verified email claim.
  try {
    const verifyUrl = new URL("/api/v1/users/verify", SITE_URL);
    verifyUrl.searchParams.set("email", payload.email);
    const res = await fetch(verifyUrl.toString());

    if (!res.ok) {
      await saveSettings({ ...settings, siteToken: undefined, siteUser: undefined });
      return NextResponse.json({ authenticated: false });
    }

    const data = await res.json();
    if (!data?.authorized) {
      await saveSettings({ ...settings, siteToken: undefined, siteUser: undefined });
      return NextResponse.json({ authenticated: false });
    }

    const resolvedUser = data.user || settings.siteUser || {
      email: payload.email,
      name: payload.name || payload.email,
      image: payload.image,
    };

    return NextResponse.json({
      authenticated: true,
      user: resolvedUser,
    });
  } catch {
    // Site app unreachable: keep authenticated session when JWT is valid.
    const fallbackUser = settings.siteUser || {
      email: payload.email,
      name: payload.name || payload.email,
      image: payload.image,
    };
    if (fallbackUser) {
      return NextResponse.json({
        authenticated: true,
        user: fallbackUser,
        offline: true,
      });
    }
    return NextResponse.json({ authenticated: false, error: "Site app unreachable" });
  }
}

export async function POST(request: Request) {
  try {
    const { token, user } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const payload = await verifyGatewayToken(token);
    if (!payload.email) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const settings = await readSettings();
    const normalizedUser = user || {
      email: payload.email,
      name: payload.name || payload.email,
      image: payload.image,
    };
    await saveSettings({ ...settings, siteToken: token, siteUser: normalizedUser });

    return NextResponse.json({ success: true, user: normalizedUser });
  } catch {
    return NextResponse.json({ error: "Failed to save token" }, { status: 400 });
  }
}

export async function DELETE() {
  const settings = await readSettings();
  const updated = { ...settings, siteToken: undefined, siteUser: undefined };
  await saveSettings(updated);
  return NextResponse.json({ success: true });
}
