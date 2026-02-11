# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agelum is an AI Document Management Tool for development projects. It's a **TurboRepo monorepo** using **pnpm** as the package manager. The system creates a `.agelum` directory structure in projects and provides both a web UI and MCP (Model Context Protocol) server for managing tasks, epics, docs, and other AI-related artifacts.

## Tech Stack

- **Monorepo**: TurboRepo with pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS, Zustand for state management
- **Desktop**: Electron app that wraps the Next.js web app
- **Shared Packages**:
  - `@agelum/kanban`: Drag-and-drop Kanban board components using @dnd-kit
  - `@agelum/shadcn`: Shared UI components based on shadcn/ui
- **Backend**: Next.js API routes for file operations, system commands, and agent execution
- **MCP Server**: Embedded in `apps/web`, built separately with `pnpm web:build --filter @agelum/web build:mcp`

## Common Commands

Run from the root directory:

```bash
# Install dependencies
pnpm install

# Build all projects (uses Turbo)
pnpm build

# Start all dev servers (uses Turbo)
pnpm dev

# Lint all projects
pnpm lint

# Format code with Prettier
pnpm format
```

### Web App (@agelum/web)

```bash
# Dev server (runs on port 6500, NOT 3000)
pnpm web:dev

# Build Next.js app
pnpm web:build

# Build MCP server separately
pnpm --filter @agelum/web build:mcp

# Start production server
pnpm web:start
```

### Electron App (@agelum/electron)

```bash
# Start Electron in dev mode
pnpm electron:dev

# Start built Electron app
pnpm electron:start

# Build Electron app
pnpm electron:build
```

### Individual Package Development

```bash
# Kanban package (runs on port 3002)
pnpm --filter @agelum/kanban dev

# Shadcn package (runs on port 3003)
pnpm --filter @agelum/shadcn dev
```

## Architecture

### State Management

The app uses **Zustand** with localStorage persistence. The main store is `apps/web/src/store/useHomeStore.ts`:

- **Per-Project State**: Each repository has isolated state (view mode, terminals, selected files, etc.)
- **Global State**: Settings, repository list, agent tools
- **State Structure**: `projectStates` is a record keyed by repository name, allowing multi-project context
- **Tab-Based State**: Tasks, Epics, and Ideas views maintain separate state using the `tabs` object

Key state features:

- `getProjectState()`: Returns state for currently selected repo
- `setProjectState()`: Updates state for current repo
- `setProjectStateForRepo()`: Updates state for specific repo
- Terminal sessions tracked separately with `terminalSessions` array

### API Routes Organization

Routes are organized in feature-based groups in `apps/web/src/app/api/`:

- `(agents)/`: Agent execution and tool management (`/api/agents`)
- `(ai)/`: MCP server and AI interactions (`/api/mcp`, `/api/opencode`)
- `(auth)/`: Settings and user management (`/api/settings`, `/api/users`)
- `(content)/`: Task and epic CRUD operations (`/api/tasks`, `/api/epics`, `/api/ideas`)
- `(files)/`: File operations (`/api/file`, `/api/files`, `/api/upload`)
- `(project)/`: Repository and config management (`/api/repositories`, `/api/project/config`)
- `(system)/`: Process management and system commands (`/api/terminal`, `/api/system/command`, `/api/app-status`)
- `(testing)/`: Test execution (`/api/tests/run`, `/api/tests/status`)

### Agent/Process Management

The system uses `apps/web/src/lib/agent-store.ts` to track long-running processes:

- **Global Process Store**: Maps process IDs to ChildProcess instances
- **Output Buffering**: Stores stdout/stderr for later retrieval
- **Process Metadata**: Tracks tool name, start time, exit status
- **Terminal Sessions**: Multiple interactive terminals can run simultaneously
- Processes are spawned with PTY emulation using Python for proper TTY support

### MCP Server

The MCP server is built separately from the main Next.js app:

- Source: `apps/web/src/mcp/`
- Built with: `tsconfig.mcp.json`
- Provides tools: `create`, `move`, `get` for managing `.agelum` documents

## .agelum Directory Structure

When initialized, Agelum creates this structure in each project:

```
.agelum/
├── work/
│   ├── tasks/       # Task files organized by state
│   │   ├── backlog/
│   │   ├── priority/ (mapped to "fixes")
│   │   ├── fixes/
│   │   ├── pending/
│   │   ├── doing/
│   │   └── done/
│   └── epics/       # Epic files organized by state
├── doc/
│   └── ideas/       # Idea files
├── commands/        # Command references
├── skills/          # Skill definitions
├── agents/          # Agent configurations
└── context/         # Context documents
```

### Filename Convention

Files follow this pattern: `YY_MM_DD-HHMMSS-Title (PR SP).md`

- **PR**: Priority (2-digit, e.g., 01)
- **SP**: Story Points (e.g., 3)
- All files include frontmatter with `title`, `created`, `type`, and `state`

### Task States

Valid task states: `backlog`, `priority`, `fixes`, `pending`, `doing`, `done`

Note: `priority` is internally mapped to `fixes` in some views.

## Code Organization

### Component Structure

- **Shared UI Components**: `packages/shadcn/src/components/ui/`
- **Kanban Components**: `packages/kanban/src/components/`
- **App-Specific Components**: `apps/web/src/components/`

Keep components under 500 lines. Split larger components into smaller, focused modules.

### TypeScript

- Use strict typing throughout
- Shared types in `apps/web/src/types/entities.ts`
- API response types defined per route

## Important Notes

1. **Port Usage**: The web app runs on **port 6500**, not 3000. Always check if the port is already in use before starting dev servers.

2. **Hot Reload Persistence**: `agent-store.ts` uses `globalThis` to persist process state across Next.js hot reloads in development.

3. **Terminal Implementation**: The `/api/terminal` and `/api/agents` routes use Python PTY wrapping for proper terminal emulation with colors and interactive features.

4. **Multi-Project Support**: The app can switch between multiple repositories. Always use `selectedRepo` and `getProjectState()` to access the correct project's state.

5. **Process Streaming**: Agent execution and terminal output use streaming responses (`ReadableStream`) for real-time feedback.

6. **File Operations**: All file operations go through API routes. Never read/write files directly in React components.
