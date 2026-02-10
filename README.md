# Agelum

**The AI-Native Workspace for Modern Software Development.**

Agelum is a comprehensive development tool designed to unify the entire software lifecycle—from ideation and planning to coding, testing, and review—into a single, AI-powered interface. It bridges the gap between your code, browser, documentation, and external AI agents using the Model Context Protocol (MCP).

---

## 🚀 The Full Workflow, Powered by AI

Agelum isn't just a document manager; it's a complete workspace that understands your project's context.

### 🧠 Ideation & Planning

- **Ideas & Epics**: Dedicated spaces to capture high-level concepts and break them down into actionable epics.
- **Task Management**: A robust **Kanban Board** integrated directly with your repository's `.agelum` directory, allowing for state-driven task tracking.
- **Documentation**: Rich markdown support for project wikis, design docs, and technical specifications.

### 💻 Code Review & Git Integration

- **Local Changes**: Real-time view of your current Git changes with intuitive diffing.
- **GitHub PR Management**: Browse, review, checkout, and merge Pull Requests directly within Agelum.
- **AI-Assisted Review**: Trigger specialized AI agents to audit security, quality, and performance of your changes.

### 🌐 AI-Integrated Browser

- **Multi-Tab Preview**: Embedded browser (powered by Electron's WebContentsView) to view your local or remote applications.
- **Natural Interaction**: Supports multi-page browsing with persistent state and session-aware tabs.
- **AI Coordinate Mapping**: High-quality screenshot capture with coordinate mapping, allowing AI agents to "see" and interact with your UI precisely.
- **CSS Inspector**: Visual CSS editor with element picking and live preview.

### 🧪 Visual Testing & Automation

- **Test Management**: A dashboard to organize, run, and track visual and functional tests.
- **Screenshot-Driven Execution**: Automatically capture and compare UI states during test runs.
- **Execution History**: Detailed logs and visual artifacts for every test execution.

### 🛠️ Terminal & Logs

- **Integrated Terminal**: A full-featured terminal within the workspace for running builds, scripts, and monitoring logs.
- **System Logs**: Real-time monitoring of application and MCP server activities.

---

## 🏗️ Architecture & Technology

Agelum is built for performance, extensibility, and deep AI integration.

- **Monorepo**: Managed with **TurboRepo** and **pnpm** for ultimate developer velocity.
- **Frontend**: **Next.js 14** (App Router) with **Tailwind CSS** and a custom design system built on **shadcn/ui**.
- **Desktop**: **Electron** wrapper providing native capabilities like multi-window management and raw browser access.
- **MCP Server**: An embedded **Model Context Protocol** server that exposes your project's state (tasks, docs, files) to external AI agents.
- **State Management**: Zero-database architecture; all project state is stored in a standardized `.agelum` folder within your repositories.

---

## 📂 Repository Structure

```text
agelum/
├── apps/
│   ├── web/          # Core Next.js application & MCP Server
│   └── electron/     # Desktop wrapper for native features
├── packages/
│   ├── kanban/       # Reusable Kanban components
│   └── shadcn/       # Shared UI component library
├── .agelum/          # Tool-specific data (docs, tasks, plans)
└── turbo.json        # Build pipeline configuration
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **Package Manager**: `pnpm` 9.x or higher

### Installation

```bash
pnpm install
```

### Development

Agelum typically runs on port **6500**.

```bash
# Start the web development server
pnpm web:dev

# Start the Electron desktop application
pnpm electron:dev
```

### Building for Production

```bash
pnpm build
```

---

## 🔌 Model Context Protocol (MCP)

Agelum exposes a suite of tools for AI agents to interact with your project:

- `create-task` / `move-task`: Programmatic task management.
- `create-document` / `read-document`: Documentation access.
- `list-repositories`: Discover projects in your workspace.
- `execute-command`: Run scripts and CLI tools.

---

## 📄 License

Agelum is licensed under the MIT License.
