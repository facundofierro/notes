import { NextResponse } from "next/server";
import { signGatewayToken } from "@/lib/auth";
import { readSettings, saveSettings } from "@/lib/settings";

const SITE_URL = process.env.SITE_URL || "https://notes.agelum.com";

/**
 * GET /api/gateway/callback
 *
 * OAuth callback from the Site app after the user has authenticated.
 * Decodes the state param to get the original redirect_uri (chrome extension URL),
 * fetches the user's session from the Site app, and redirects back to the extension
 * with the token and user info.
 *
 * Query params:
 *   - state: Base64-encoded JSON with { redirectUri, provider }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");

  if (!state) {
    return new NextResponse("Missing state parameter", { status: 400 });
  }

  let redirectUri: string;
  let provider: string | undefined;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    redirectUri = decoded.redirectUri;
    provider = decoded.provider;
  } catch {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  // Fetch the current session from the Site app using the session cookie that
  // was set during the OAuth flow. The request includes session cookies automatically.
  try {
    const sessionRes = await fetch(`${SITE_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });

    if (!sessionRes.ok) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set("error", "session_fetch_failed");
      return NextResponse.redirect(errorUrl.toString());
    }

    const session = await sessionRes.json();

    if (!session?.user?.email) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set("error", "no_session");
      return NextResponse.redirect(errorUrl.toString());
    }

    const token = await signGatewayToken({
      email: session.user.email,
      name: session.user.name || session.user.email,
      image: session.user.image,
    });

    // Store developer token in settings (for the Web App itself)
    const settings = await readSettings();
    await saveSettings({
      ...settings,
      siteToken: token,
      siteUser: {
        email: session.user.email,
        name: session.user.name || session.user.email,
        image: session.user.image,
      },
    });

    // Redirect back to the Chrome extension with the token and user info
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set("token", token);
    callbackUrl.searchParams.set("email", session.user.email);
    callbackUrl.searchParams.set("name", session.user.name || session.user.email);
    if (provider) {
      callbackUrl.searchParams.set("provider", provider);
    }
    if (session.user.image) {
      callbackUrl.searchParams.set("picture", session.user.image);
    }

    return NextResponse.redirect(callbackUrl.toString());
  } catch (error) {
    console.error("Gateway callback error:", error);
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "internal_error");
    return NextResponse.redirect(errorUrl.toString());
  }
}
