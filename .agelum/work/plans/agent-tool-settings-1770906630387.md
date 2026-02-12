# Implementation Plan - Agent Tool Settings

Improve the Agent Tool UI and add a configuration system for individual tools.

## Phase 1: Data Model & Library Updates

1.  **Update `AGENT_TOOLS` definitions in `apps/web/src/lib/agent-tools.ts`**:
    - Rename `Gemini` to `Gemini cli`.
    - Rename `Grok` to `Grok cli`.
    - Add new tools:
        - `codex`: `{ name: "Codex", command: "codex", type: "cli", modelFlag: "-m", promptFlag: null }`
        - `copilot`: `{ name: "GitHub Copilot", command: "gh copilot", type: "cli", promptFlag: "-p" }` (Note: requires handling of `gh copilot` as command)
        - `crush`: `{ name: "Crush", command: "crush", type: "cli", promptFlag: "run" }`
        - `aider`: `{ name: "Aider", command: "aider", type: "cli", modelFlag: "--model", promptFlag: "--message" }`
    - Update `buildAgentCommand` to handle `gh copilot` correctly (it might need to be split or handled as a single command string depending on `spawn` usage).

2.  **Define Settings Schema**:
    - Create `apps/web/src/lib/tool-settings.ts` to manage tool configurations.
    - Define types for `ToolSettings`:
        - `defaultPermissions`: boolean
        - `defaultModel`: string
        - `cliParameters`: string (extra args)
        - `workflowOverrides`: Record<string, Partial<ToolSettings>> (for Plan, Start, Modify)

## Phase 2: UI Components

1.  **Tool List Item (AIRightSidebar)**:
    - Modify `renderToolCard` in `AIRightSidebar.tsx`.
    - Replace "Run" text with an icon representing the tool type (CLI, Web, App) and the type name.
    - Move the tool type icon from the top right to the main content area of the card.
    - Add a `Settings` icon (from `lucide-react`) at the top right.

2.  **Tool Settings Dialog**:
    - Create `apps/web/src/components/features/agent-tools/ToolSettingsDialog.tsx`.
    - Use `shadcn/ui` Dialog and Tabs components.
    - **Tabs**:
        - **General**: Default permissions, default model, extra CLI params.
        - **Workflow**: Specific overrides for "Plan", "Start", "Modify".
    - Implement state management for saving these settings (e.g., in `useHomeStore` or a new `useToolSettings` hook).

## Phase 3: Integration

1.  **Persistence**:
    - Ensure tool settings are saved to `.agelum/config.json` or a dedicated settings file via the existing settings API.
    - Update `useSettings` hook to include tool-specific configurations.

2.  **Command Execution**:
    - Update `executeAgentCommand` and `buildAgentCommand` to incorporate the configured default models and extra parameters from the settings.

## Phase 4: Verification

1.  **UI Check**:
    - Verify the tool cards look as requested.
    - Verify clicking the settings icon opens the correct dialog with the tool's current settings.
2.  **Functionality Check**:
    - Test running a tool with custom CLI parameters.
    - Test workflow overrides (e.g., setting a different model for "Plan" mode).
