# Refactor AI Recording Logic

## Context

Refactor the system prompt and recording logic to support both deterministic and non-deterministic flows, using external skill and snapshot files. The skill file must be automatically available in any project managed by Agelum.

## Related Files

- `/Users/facundofierro/git/notes/apps/web/src/lib/record-ai.ts` (Main recommendation logic)
- `/Users/facundofierro/git/notes/apps/web/src/lib/mcp.ts` (Currently contains `ensureAgelumStructure`)
- `/Users/facundofierro/git/notes/apps/web/src/lib/project.ts` (New home for project structure logic - to be created)
- `/Users/facundofierro/git/notes/apps/web/src/lib/settings.ts` (Contains `saveProjectConfig`)
- `.agelum/skills/agent-browser.md` (Project-specific skill path)
- `.agelum/temp/snapshot.txt` (Temporary file for snapshot)

## User Requirements

- The system prompt template in `record-ai.ts` is currently insufficient and needs to be shorter.
- The prompt must pass links to 2 files:
  1.  **Skill File**: A markdown file containing commands/instructions. This should be copied from the Vercel browser agent skill (`agent-browser/skills/agent-browser/SKILL.md` from `vercel-labs/agent-browser` repo). We need to modify this skill to refer to our CLI tool (`agelum`, our Rust CLI tool) where appropriate.
  2.  **Snapshot File**: A temporary file in the `.agelum` directory (relative to current project path) containing the snapshot. This file should be replaced on each step execution; we don't need to keep history.
- **Automatic Skill Management**:
  - The skill file must be automatically copied into the `.agelum/skills/` directory of any repository/project that is opened or initialized.
  - Integrate this into the existing mechanism that creates the `.agelum` directory when it is not present.
- **Deterministic Flow (`deterministic = true`)**:
  - The prompt explicitly asks for deterministic commands.
  - LLM generates a command.
  - We execute the command.
  - If successful, we add the **command** to the test steps.
- **Non-Deterministic Flow (`deterministic = false`)**:
  - This uses a separate prompt logic.
  - We execute the `gemini` CLI.
  - The prompt tells `gemini` CLI to execute the `agelum` CLI (Rust tool) in the console, using the Skill File and the Snapshot File.
  - If successful, we add the **prompt** (the user's natural language instruction) to the test steps, NOT the specific command.
- **Test Execution**:
  - If the step is deterministic (command), execute it directly (or via API).
  - If the step is non-deterministic (prompt), execute `gemini` CLI with the prompt of the step, following the same logic (using skill/snapshot files).

## Steps to Complete

2.  **Refactor Project Initialization Logic**:
    - Create a new utility file `/Users/facundofierro/git/notes/apps/web/src/lib/project.ts`.
    - Move `AGELUM_STRUCTURE` and `ensureAgelumStructure` from `mcp.ts` to `project.ts`.
    - Update `mcp.ts` and any API routes to use the new utility.

3.  **Integrate Automatic Skill Copying**:
    - Update the new `ensureAgelumStructure` in `project.ts` to check for the existence of `.agelum/skills/agent-browser.md`.
    - Implement a helper to find/create the global template in `~/.agelum/templates/`.
    - If a project's skill file is missing, copy it from the global template.
    - Ensure `saveProjectConfig` in `settings.ts` and other entry points call this refined initialization.

4.  **Refactor `record-ai.ts`**:
    - Update `SYSTEM_PROMPT_TEMPLATE` to be shorter and focus on instructions.
    - Implement logic to save the current DOM snapshot to the temporary file (`.agelum/temp/snapshot.txt`) before generating recommendations.

5.  **Implement Deterministic Logic**:
    - Ensure `deterministic` flag triggers the command generation prompt.
    - Capture and return the specific command (JSON).

6.  **Implement Non-Deterministic Logic**:
    - When `deterministic` is false, construct a prompt for `gemini` CLI.
    - The prompt should instruct `gemini` to use the `agelum` CLI with the paths to the Skill File and Snapshot File.
    - Execute `gemini` CLI.
    - Return the _original prompt_ as the step content if successful.

7.  **Update Test Recording/Runner**:
    - Ensure the recording loop handles saving "Command" vs "Prompt" steps correctly based on the mode.
    - Ensure the playback runner respects these types: executing commands directly vs invoking the LLM for prompt steps.
