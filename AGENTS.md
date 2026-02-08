# AGENTS.md

Guidelines for AI agents working in this repository.

## Project Overview
Agelum is an AI Document Management Tool for development projects, built as a monorepo using **TurboRepo** and **pnpm**.

## Tech Stack
- **Monorepo Manager**: TurboRepo
- **Package Manager**: pnpm
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS, Zustand
- **Desktop**: Electron (wraps the web app)
- **Shared Packages**: 
  - `@agelum/kanban`: Kanban board components
  - `@agelum/shadcn`: UI components based on shadcn/ui
- **MCP Server**: Embedded in `apps/web`, used for programmatic access to project data.

## Critical Warnings
- **Dev Server**: `apps/web` often runs on port **6500**. Verify before starting a new dev process.
- **Port Usage**: Web app (6500), Kanban package dev (3002), Shadcn package dev (3003).

## Directory Structure
- `apps/web`: Main Next.js application.
- `apps/electron`: Electron wrapper.
- `packages/shadcn`: Shared UI components.
- `packages/kanban`: Shared Kanban functionality.
- `.agelum`: Project database (tasks, epics, docs, etc.). **Strictly managed structure.**
- `agelum-test`: Browser-based tests using Stagehand.

## Common Commands
Run from the root directory:
```bash
pnpm install          # Install dependencies
pnpm build            # Build all projects (Turbo)
pnpm dev              # Start all dev servers (Turbo)
pnpm lint             # Lint all projects
pnpm format           # Format code with Prettier
```

### Web App (@agelum/web)
```bash
pnpm web:dev          # Dev server on port 6500
pnpm web:build        # Build Next.js app
pnpm --filter @agelum/web build:mcp  # Build the MCP server
```

### Electron (@agelum/electron)
```bash
pnpm electron:dev     # Start Electron in dev mode
pnpm electron:start   # Start built Electron app
```

## MCP Server Tools
The MCP server provides tools to manage the `.agelum` directory:
- `create`: Create tasks, epics, docs, etc. with proper frontmatter/filenames.
- `move`: Transition tasks between states (backlog, pending, doing, done, etc.).
- `get`: Resolve file paths for Agelum documents.

## Code Conventions
- **TypeScript**: Use strict typing.
- **Components**: 
  - Shared UI: `packages/shadcn/src/components/ui`
  - Kanban specific: `packages/kanban/src/components`
  - App specific: `apps/web/src/components`
- **File Size**: Keep components under 500 lines; decompose when larger.
- **State Management**: Use Zustand for client-side state in `apps/web/src/store`.

## Testing
- **Browser Tests**: Located in `agelum-test`, using `@browserbasehq/stagehand`.
- **Vitest**: Some packages (e.g., legacy `shadcn-data-views`) may use Vitest. Run with `npx vitest`.

## .agelum Data Structure
The `.agelum` folder uses a specific naming convention: `YY_MM_DD-HHMMSS-PR Title (SP).md`
- **PR**: Priority (2-digit, e.g., 01)
- **SP**: Story Points (e.g., 3)
- **Frontmatter**: Always include `title`, `created`, `type`, and `state` (for tasks).
- **Task States**: `backlog`, `priority` (mapped to `fixes`), `fixes`, `pending`, `doing`, `done`.
- **Types**: `task`, `epic`, `plan`, `doc`, `command`, `skill`, `agent`, `context`.
