---
created: 2026-02-10T12:17:29.479Z
state: pending
priority: high
type: task
assignee: user
related_files:
  - apps/web/src/components/tabs/tests/TestEditor.tsx
  - apps/web/src/components/tabs/tests/TestDetailView.tsx
  - cli/src/main.rs
---

# Add AI-Assisted Test Recording Functionality (Record Mode)

## Overview

Implement a "Record" mode in the Tests Tab that allows users to interactively create test steps with the assistance of AI (Gemini 1.5 Flash). This mode captures user intent, translates it into executable browser actions via the Agelum CLI, and records them as test steps.

## Functional Requirements

### 1. New "Record" View State in Tests Tab

- **Full Screen Mode**: When "Record" is clicked, maximize the test editor space, hiding standard sidebars if possible.
- **Layout**:
  - **Left Panel**: Large display of the current browser screenshot.
  - **Right Panel**:
    - DOM Snapshot information (accessibility tree/structure).
    - Interactive Chat/Prompt interface for the user.
    - Controls: "Stop Recording", "Deterministic Mode" toggle.

### 2. Recording Workflow

#### Initialization

- **Start**: User clicks "Record" on a test.
- **Session**: Initialize a background Gemini CLI session (using Flash model for speed/cost).
- **Navigation Check**:
  - If the test is empty: Automatically add a `Navigate` step to the project's **preview URL** (from project configuration).
  - If the test has steps: Replay existing steps to bring the browser to the current state.

#### Interaction Loop (Step-by-Step)

1.  **Capture State**:
    - Execute command (via Agelum CLI/Agent Browser) to get the **Screenshot** and **DOM Snapshot**.
    - _Note_: Screenshots are for user feedback during recording, not stored in the final test definition.
2.  **Display**: Update UI with the new screenshot and snapshot data.
3.  **User Prompt**: User provides an instruction (e.g., "Click the 'Accept' button").
4.  **Action Determination (Deterministic vs. Non-Deterministic)**:
    - **Toggle Switch**: User selects "Deterministic" or "Non-Deterministic".
    - **AI Processing**: Send Screenshot + Snapshot + User Prompt to Gemini.
    - **Execution & Recording**:
      - **Non-Deterministic Mode**:
        - AI instructs CLI to execute naturally (e.g., semantic click "Accept").
        - Add step to test: `action: "Click 'Accept'"` (Text-based/AI-driven).
      - **Deterministic Mode**:
        - AI instructs CLI to identify a stable selector (id, data-testid, unique class).
        - AI generates specific command (e.g., `click("#accept-btn")`).
        - Add step to test: `action: "Click #accept-btn"` (Selector-based).
        - _Goal_: Create resilient tests that don't flake on minor UI text changes.
5.  **Repeat**: After execution, capture new state and loop (go to step 1).

#### Completion

- **Stop**: specific button to finish recording.
- **Return**: Switch view back to the standard `TestEditor` or `TestDetailView`.

### 3. Backend Integration

- **Agelum CLI extensions**: Ensure the Rust CLI (`cli/`) exposes commands for:
  - Launching a browser session.
  - Navigating.
  - Capturing Screenshot/Snapshot.
  - Executing interactions (Click, Type, etc.).
- **AI Integration**:
  - Use the existing AI Client structure or a new lightweight client for the "Record" loop.
    - **Skill Creation & Distribution**: Create a specific skill definition file. Critically, this skill **must be automatically stored/copied** from the Agelum application's assets into the `.agelum/ai/skills` directory of **every external project opened by the user**. This ensures the "Record" capability is portable and available in any project context, and avoids confusion with the Agelum tool's own configuration folder.

## Technical Implementation Plan

1.  **Skill Definition & Deployment**:
    - Create the `SKILL.md` template for Agelum CLI test commands.
    - **Template Storage**: Store this template within the Agelum application assets (e.g., in `apps/web/public/templates` or a dedicated internal assets folder).
    - **Project-Specific Injection**: Implement logic (in the main app initialization or project opening workflow) to write this file to the `.agelum/ai/skills/test_record.md` path of the **currently opened external repository**.
    - **Avoid Local Confusion**: Explicitly distinguish between the Agelum tool's own `.agelum` directory and the `.agelum` directory that must be initialized in every project the user works on. This ensures the AI agent always has the necessary "Record" skills regardless of the project context.
2.  **CLI Enhancements (Rust)**:
    - Verify `agent-browser` integration in `cli`.
    - Ensure `snapshot` and `screenshot` commands return data in a format consumable by the web UI (base64 images, JSON snapshot).
3.  **Web UI (Next.js)**:
    - Modify `TestDetailView.tsx` to handle the "Record" state.
    - Create `TestRecordView.tsx` component for the split-screen UI.
    - Implement the "Step-by-Step" runner logic connecting UI -> MCP/API -> CLI.
4.  **State Management**: Handle the "Replay" logic efficiently so recording can resume on existing tests.

## References

- **Agent Browser**: Leverages functionality similar to [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser).
- **Existing CLI**: Located in `cli/` (Rust).
