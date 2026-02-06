# Agelum - Project Context for Gemini

## Project Overview
Agelum is an AI Document Management Tool designed for development projects. It is a Monorepo managed with **TurboRepo** and **PNPM**. The project aims to provide a unified interface for managing project documentation, tasks, and AI context, exposing an **MCP (Model Context Protocol)** server for programmatic access.

## Tech Stack & Architecture
- **Monorepo Manager:** TurboRepo
- **Package Manager:** pnpm
- **Frontend (Web):** Next.js 14 (App Router), React, Tailwind CSS
- **Desktop (Electron):** Electron (wraps the web application)
- **Shared Packages:**
  - `@agelum/kanban`: Kanban board functionality.
  - `@agelum/shadcn`: UI components based on shadcn/ui.
- **MCP Server:** Embedded within the Web application (`apps/web`), built separately via `tsconfig.mcp.json`.

## Key Directories
- **`apps/web`**: Main Next.js application. Contains the UI and the MCP server implementation.
  - `src/`: Application source code.
  - `scripts/mcp-runner.ts`: Entry point/runner for the MCP server.
- **`apps/electron`**: Lightweight Electron wrapper to run Agelum as a desktop app.
- **`packages/`**: Shared libraries used by the apps.
- **`.agelum`**: Stores project-specific data (docs, plans, tasks, agent configurations). This folder acts as the "database" for the tool.

## Development Workflow

### ⚠️ Critical Warning
**The Web application is often running in the background on port 6500.**
Before running any dev command that starts the web server, **verify if port 6500 is already in use**. Do not blindly run `pnpm dev`.

### Common Commands
- **Install Dependencies:** `pnpm install`
- **Build All:** `pnpm build` (Uses Turbo)
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`

### Web App (`@agelum/web`)
- **Dev Server:** `pnpm web:dev` (Starts Next.js on port 6500)
- **Build:** `pnpm web:build`
- **Build MCP:** `pnpm --filter @agelum/web build:mcp`

### Electron App (`@agelum/electron`)
- **Dev:** `pnpm electron:dev`
- **Start:** `pnpm electron:start`

## Conventions & Style
- **TypeScript:** Strict typing is encouraged.
- **Styling:** Tailwind CSS is the standard.
- **Components:** Reusable components should be placed in `packages/shadcn` or `packages/kanban` if applicable, or `apps/web/src/components` for app-specific ones.
- **Directory Structure:** The `.agelum` directory structure is strict and programmatically managed. Avoid manual changes unless necessary for debugging.

## MCP Server
The MCP server allows AI agents to interact with the project data programmatically.
- **Tools:** `create-task`, `move-task`, `create-document`, `list-repositories`, `read-document`.
- **Context:** The server provides context about the current project state stored in `.agelum`.
