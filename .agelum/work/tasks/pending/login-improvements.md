---
created: 2026-02-14T00:00:00.000Z
state: pending
type: task
plan: .agelum/work/plans/login-improvements-1771112426839.md
summary: .agelum/work/summaries/login-improvements-1771112620233.md
---

# Login Improvements & Security Hardening

## User Instructions

Production-ready improvements to the Chrome plugin OAuth flow and Web App gateway implemented in the chrome-plugin feature (refs: `.agelum/work/summaries/chrome-plugin-1771111082629.md`).

## Remaining Tasks

### 1. JWT Token Signing
- **Current:** Gateway callback uses base64-encoded JSON tokens (not cryptographically signed)
- **Needed:** Implement proper JWT signing with HS256 or RS256 using a secret key from environment
- **Files:** `apps/web/src/app/api/(auth)/gateway/callback/route.ts`
- **Impact:** Tokens become tamper-proof and verifiable by any service

### 2. Site App NextAuth Configuration
- **Current:** Gateway assumes Site app's NextAuth will redirect correctly via `callbackUrl` parameter
- **Needed:** Verify/configure Site app's `nextauth.js` to support custom `callbackUrl` parameter in the OAuth flow (may need an additional middleware to preserve the redirect_uri through the OAuth callback chain)
- **Files:** `apps/site/src/auth.ts` and related NextAuth config
- **Impact:** Ensures Chrome extension receives control after successful auth

### 3. Yandex OAuth in Chrome Plugin
- **Current:** Chrome plugin only supports GitHub and Google logins
- **Needed:** Add "Continue with Yandex" button to Account tab (requires Yandex API integration similar to GitHub/Google)
- **Files:** `apps/chrome-plugin/src/popup/App.tsx`
- **Impact:** Allows plugin users to authenticate via Yandex email accounts
