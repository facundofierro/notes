# Plan: Auto-save Summary and Active Terminal Tracking

This plan outlines the implementation of automatic summary generation and terminal session persistence for AI tool runs.

## Phase 1: Store Enhancement & Persistence

- **Objective**: Extend the global store to track more metadata for terminal sessions and ensure they persist across page reloads.
- **File**: `apps/web/src/store/useHomeStore.ts`
- **Changes**:
    1. Update `TerminalSessionInfo` interface to include:
        - `summary?: string` (Cleaned-up, concise description of what the tool did).
        - `lastMessage?: string` (The final output message from the tool).
        - `output?: string` (The full raw output including ANSI codes).
    2. Modify the `partialize` function in the `persist` middleware:
        - Currently, it only persists `repositories` and `selectedRepo`.
        - Add `projectStates` but select only the `terminalSessions` field for each project to keep the storage lightweight.
    3. Verify `onRehydrateStorage` logic to ensure it handles restored project states gracefully.

## Phase 2: Terminal Output Parsing Utility

- **Objective**: Create a helper to clean terminal output and extract meaningful information.
- **File**: `apps/web/src/lib/terminal-parser.ts`
- **Logic**:
    1. `stripAnsiCodes(input: string)`: Use regex to remove ANSI escape sequences (colors, cursor movements).
    2. `extractSummaryAndLastMessage(output: string)`:
        - Clean the output using `stripAnsiCodes`.
        - Extract a "summary": Look for specific patterns like "SUMMARY:" or take the first few meaningful lines.
        - Extract "last message": Take the last 2-3 non-empty lines of the output.

## Phase 3: Integration in AI Sidebar

- **Objective**: Capture and process terminal output when a tool finishes running.
- **File**: `apps/web/src/components/layout/AIRightSidebar.tsx`
- **Changes**:
    1. In the `finally` block of `runTool`:
        - Use `extractSummaryAndLastMessage` on the final `terminalOutput`.
        - Update the terminal session using `updateTerminalSession` with `isRunning: false` and the parsed metadata (`summary`, `lastMessage`, `output`).
    2. In the `finally` block of `reconnectToSession`:
        - Perform similar updates to ensure reconnected sessions also save their final state.
    3. Update `cancelTerminal`:
        - Ensure it also updates the session state to `isRunning: false`.

## Phase 4: UI Enhancements

- **Objective**: Provide visual feedback for finished sessions and allow users to view their output.
- **File**: `apps/web/src/components/layout/AIRightSidebar.tsx`
- **Changes**:
    1. Update the tool list rendering:
        - Distinguish between "Running" (pulse indicator) and "Finished" (static indicator or different style).
        - Change button labels: "Run" (new), "Continue" (running), "View Output" (finished).
    2. Update `handleClick` for tool buttons:
        - If the session is finished, instead of `runTool`, it should:
            - Set `terminalToolName` to the tool's name.
            - Set `terminalOutput` to the saved `output` from the session.
            - Set `terminalProcessId` to `null`.
            - Set `isTerminalRunning` to `false`.
            - Switch view to `terminal`.
    3. Display the session's `summary` or `lastMessage` in the tool list tooltip or as a small sub-text if space permits.
