import { NextResponse } from "next/server";

const SITE_URL = process.env.SITE_URL || "https://notes.agelum.com";

/**
 * GET /api/gateway/login
 *
 * Starts the OAuth flow by redirecting to the Site app's signin page.
 * The Chrome extension calls this via chrome.identity.launchWebAuthFlow.
 *
 * Query params:
 *   - redirect_uri: The chrome extension redirect URL (e.g., https://{extId}.chromiumapp.org/oauth)
 *   - provider: "github" | "google" | "yandex" (optional, defaults to github)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get("redirect_uri");
  const provider = searchParams.get("provider") || "github";
  const allowedProviders = new Set(["github", "google", "yandex"]);

  if (!redirectUri) {
    return NextResponse.json({ error: "redirect_uri is required" }, { status: 400 });
  }
  if (!allowedProviders.has(provider)) {
    return NextResponse.json({ error: "invalid provider" }, { status: 400 });
  }

  // Store the redirect_uri in a short-lived state param (for security)
  const state = Buffer.from(JSON.stringify({ redirectUri, provider })).toString("base64url");

  // Build the Site app's callback URL for this gateway
  const gatewayCallbackUrl = new URL("/api/gateway/callback", request.url).toString();
  const callbackUrl = `${gatewayCallbackUrl}?state=${encodeURIComponent(state)}`;

  // Redirect to Site app signin with our callback as the callbackUrl
  const signinUrl = new URL(`${SITE_URL}/api/auth/signin/${provider}`);
  signinUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(signinUrl.toString());
}
