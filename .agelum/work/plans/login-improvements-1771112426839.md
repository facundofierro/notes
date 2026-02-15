# Implementation Plan: Login Improvements & Security Hardening

This plan outlines the steps to improve the security and functionality of the Agelum login flow across the Chrome extension, Web App gateway, and Site application.

## 1. Research & Preparations

- [ ] **Verify Dependencies**: Confirm if `jose` or `jsonwebtoken` is preferred for JWT signing in `apps/web`. `jose` is recommended for its compatibility with various runtimes (Edge/Node).
- [ ] **Environment Variables**: Define `GATEWAY_JWT_SECRET` for signing tokens.
- [ ] **Site App Audit**: Review `apps/site/src/auth.ts` to see how `callbackUrl` is handled by Auth.js (NextAuth v5).

## 2. Phase 1: JWT Token Signing (Security Hardening)

Currently, the Web App's gateway issues base64-encoded JSON tokens which are not cryptographically signed. This phase will implement proper JWT signing.

- [ ] **Install `jose`**: Add `jose` to `apps/web/package.json`.
- [ ] **Implement Signing Utility**: Create a utility in `apps/web/src/lib/auth.ts` (or similar) to sign and verify JWTs using `GATEWAY_JWT_SECRET`.
- [ ] **Update Gateway Callback**:
  - File: `apps/web/src/app/api/(auth)/gateway/callback/route.ts`
  - Replace base64 encoding with `new SignJWT(payload).sign(secret)`.
- [ ] **Update Token Verification**:
  - File: `apps/web/src/app/api/(auth)/gateway/route.ts`
  - Implement verification using `jwtVerify(token, secret)` instead of simple decoding.

## 3. Phase 2: Site App NextAuth Configuration (Redirect Support)

Auth.js often restricts redirects to the same origin for security. We need to allow redirects back to the Web App (e.g., `localhost:6500` or a production domain).

- [ ] **Configure Redirect Callback**:
  - File: `apps/site/src/auth.ts`
  - Add `callbacks: { redirect({ url, baseUrl }) { ... } }`.
  - Logic should allow URLs that match the Web App's configured base URL.
- [ ] **Preserve State**: Ensure the `state` parameter (which contains the original Chrome extension `redirect_uri`) is preserved through the OAuth provider redirect chain. This might require custom `authorization` params in provider configs if not handled automatically by Auth.js.

## 4. Phase 3: Yandex OAuth in Chrome Plugin

Add support for Yandex login in the Chrome extension to match the Site application's capabilities.

- [ ] **Update Popup UI**:
  - File: `apps/chrome-plugin/src/popup/App.tsx`
  - Add `handleYandexLogin` function (similar to `handleGitHubLogin`).
  - Add a "Continue with Yandex" button in the `account` tab.
  - Since `lucide-react` lacks a Yandex icon, use a custom SVG or a generic `Mail` icon with Yandex styling.
- [ ] **Update OAuth Types**: Ensure `OAuthUser` type in `apps/chrome-plugin/src/shared/storage.ts` supports "yandex" as a provider.

## 5. Phase 4: Electron Integration (Internal Browser Login)

For users running Agelum as a desktop app, we can leverage Electron's `WebContentsView` to provide a seamless login experience without leaving the app.

- [ ] **Internal Login Bridge**:
  - If the Web App detects it's running in Electron, provide an "Open Internal Login" button.
  - Use `window.electron.loadUrl(siteLoginUrl)` to open the login page in an internal view.
  - Monitor navigation events (already supported in `apps/electron/src/main.js`) to detect when the gateway callback is reached.
  - Capture the token from the URL and close the internal view.
- [ ] **Sync Settings**: Automatically update the Web App's `siteToken` upon successful internal login.

## 6. Cleanup & Environment Sync

- [ ] Update `.env.example` in all relevant packages with new secret keys.
- [ ] Ensure `SITE_URL` and `WEB_APP_URL` are consistently configured across the monorepo.
