# AGENTS.md

Guidelines for AI agents working in this repo.

## Dev Server (Important)
- This workspace often already has `apps/web` running on port 6500.
- Do not start `pnpm dev` (root or `apps/web`) without asking first, so the existing process can be stopped/restarted intentionally.

## Common Commands
```bash
pnpm install
pnpm build
pnpm lint
pnpm format
```

## apps/web
```bash
cd apps/web
pnpm build
pnpm lint
pnpm build:mcp
```

## Tests (Vitest)
```bash
cd packages/shadcn-data-views
npx vitest run
npx vitest watch
```
