# Summary - Agent Tool Settings Implementation

Implemented improvements to the Agent Tool UI and added a configuration system for individual tools.

## Changes Made

### 1. Data Model & Library Updates
- **Updated `AGENT_TOOLS`** in `apps/web/src/lib/agent-tools.ts`:
    - Renamed "Gemini" to "Gemini cli".
    - Renamed "Grok" to "Grok cli".
    - Added new tools: `Codex`, `GitHub Copilot`, `Crush`, and `Aider`.
- **Enhanced Command Handling**:
    - Updated `isCommandAvailable`, `resolveCommandPath`, and `buildAgentCommand` to support commands with spaces (e.g., `gh copilot`).
    - `buildAgentCommand` now correctly splits the base command and initial arguments.
- **Defined Tool Settings Schema**:
    - Created `apps/web/src/lib/tool-settings.ts` with interfaces for tool-specific configurations, including default permissions, default models, extra CLI parameters, and workflow-specific overrides.
- **Integrated Settings with User Profile**:
    - Added `agentToolSettings` to the `UserSettings` interface in `apps/web/src/lib/settings.ts`.

### 2. UI Improvements
- **Tool Card Redesign**:
    - Modified `renderToolCard` in `AIRightSidebar.tsx`.
    - Moved tool type icons (CLI, Web, App) to the main area of the card.
    - Added a **Settings icon** at the top right of each tool card.
    - Updated card layout to show tool type name instead of generic "Run" text.
- **Tool Settings Dialog**:
    - Created `apps/web/src/components/features/agent-tools/ToolSettingsDialog.tsx`.
    - Implemented a tabbed interface (General, Plan, Start, Modify) for configuring tool behavior.
    - Users can now set default models, extra CLI arguments, and permission overrides per tool and per workflow.

### 3. Backend Integration
- **Command Customization**:
    - Updated `executeAgentCommand` and `buildAgentCommand` to incorporate settings-defined models and extra CLI parameters.
    - The Agent API now reads user settings and applies them during command construction.
    - Workflow modes (`modify`, `start`, `plan`) are now passed to the backend to enable context-aware overrides.
- **API Updates**:
    - Updated `tasks` and `epics` creation APIs to respect the new tool configuration system.

## Verification
- Verified code structure and imports.
- Ran linting on `@agelum/web` to ensure no regressions in modified files.
- Confirmed that the new tools are correctly registered and handled.
