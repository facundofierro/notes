# Login Improvements Summary

## Scope Implemented
Implemented the login/security plan across Web gateway auth, Site redirect rules, Chrome plugin OAuth options, and Electron internal login flow.

## Changes Made

### 1. Web Gateway JWT hardening
- Added JWT utility at `apps/web/src/lib/auth.ts` using HS256 signing + verification with `GATEWAY_JWT_SECRET`.
- Replaced insecure base64 token issuance with signed token generation in:
  - `apps/web/src/app/api/(auth)/gateway/callback/route.ts`
- Added strict token verification before persistence/use in:
  - `apps/web/src/app/api/(auth)/gateway/route.ts`
- Updated gateway status validation logic to verify JWT first, then validate user registration against Site by verified email (`/api/v1/users/verify?email=...`).
- Added provider passthrough and provider allowlist in login/callback flow.

### 2. Site NextAuth cross-origin redirect support
- Updated `apps/site/src/auth.ts` with `callbacks.redirect` to allow redirects to:
  - `baseUrl` (existing behavior)
  - configured `WEB_APP_URL` origin
- Preserves full redirect URL (including query/state) when allowed.

### 3. Chrome plugin Yandex OAuth support
- Extended provider union type in:
  - `apps/chrome-plugin/src/shared/storage.ts`
- Refactored popup OAuth login flow to generic handler and added Yandex button in:
  - `apps/chrome-plugin/src/popup/App.tsx`
- Gateway now accepts `provider=yandex`.

### 4. Electron internal login bridge
- Added dedicated internal auth WebContentsView in Electron main process:
  - `apps/electron/src/main.js`
  - New IPC channels: `auth-view:open`, `auth-view:close`
  - Emits `auth-view:navigated` and `auth-view:token`
  - Captures token from navigation URL and auto-closes internal auth view
- Exposed preload APIs:
  - `apps/electron/src/preload.js`
  - `loadUrl`, `closeInternalView`, `onAuthNavigated`, `onAuthToken`
- Updated Electron types:
  - `apps/web/src/types/electron.d.ts`
- Added Web settings UI support for internal login:
  - `apps/web/src/components/features/settings/SettingsPlugin.tsx`
  - New "Open Internal Login" button shown when Electron is detected
  - Syncs token back to `/api/gateway` on internal auth success

### 5. Environment example sync
- Updated root env example in:
  - `.env.example`
- Added/clarified:
  - `WEB_APP_URL`
  - `SITE_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `GATEWAY_JWT_SECRET`

## Validation Notes
- Code changes were applied and reviewed in all target files.
- Full TypeScript validation is currently blocked in this environment because dependencies are not fully available (offline `ENOTFOUND` when attempting package install), causing broad pre-existing module resolution failures.
- No destructive git operations were performed.

## Outcome
- Gateway token security improved from unsigned base64 payloads to signed JWTs.
- Redirect handling now supports Web app callback origin safely.
- Chrome extension login now supports Yandex.
- Electron users now have in-app internal login flow with token capture/sync.
