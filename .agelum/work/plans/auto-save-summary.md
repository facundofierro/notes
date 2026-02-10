# Implementation Plan - Auto-save Summary and Active Terminal Tracking

This plan outlines the steps to implement auto-saving of terminal summaries and tracking of active terminal sessions in the Agelum Web Application.

## Objectives
1.  **Persist Terminal Sessions:** Ensure terminal session data (active or finished) survives page reloads.
2.  **Parse & Store Output:** Capture prompt, full output, and extract summary/last message from tool executions.
3.  **UI Integration:** Display summaries for finished tools and reconnect to active terminals when selecting tools in the AI Tab.

## Phases

### Phase 1: Store Enhancement & Persistence
**Goal:** Update `useHomeStore` to support richer session data and persist it.

1.  **Update `TerminalSessionInfo` Interface**
    *   File: `apps/web/src/store/useHomeStore.ts`
    *   Add fields:
        *   `prompt: string` (The initial prompt used)
        *   `summary: string` (Extracted summary)
        *   `lastMessage: string` (Last output line)
        *   `output: string` (Full terminal output history)
        *   `exitCode?: number` (Optional: exit code if available)

2.  **Implement Store Persistence for Sessions**
    *   File: `apps/web/src/store/useHomeStore.ts`
    *   Modify the `partialize` function in the `persist` middleware.
    *   Logic: Include `projectStates` in persistence, but strictly filter it to **only** save `terminalSessions` for each project to avoid exceeding storage limits with logs/files.
    *   Update `onRehydrateStorage` (or generic state merging) to properly merge persisted `terminalSessions` back into the runtime state.

### Phase 2: Terminal Output Parsing
**Goal:** Create logic to extract meaningful information from raw terminal output.

1.  **Create Parser Utility**
    *   File: `apps/web/src/lib/terminal-parser.ts` (New File)
    *   Function: `parseTerminalOutput(output: string): { summary: string, lastMessage: string }`
    *   Logic:
        *   **Last Message:** Extract the last non-empty line.
        *   **Summary:**
            *   Look for specific markers (e.g., `--- SUMMARY ---`) if they exist.
            *   Fallback: Capture the last N lines (e.g., 20 lines) as a "tail summary".
            *   Strip ANSI color codes for clean text storage (if desired for summary, keep raw for full output).

### Phase 3: Integration in AI Sidebar
**Goal:** Capture data during execution and display it when selecting tools.

1.  **Update `runTool` and `openInteractiveTerminal`**
    *   File: `apps/web/src/components/layout/AIRightSidebar.tsx`
    *   **Start:** When registering the session, include the `prompt` (from `promptText`).
    *   **During:** Accumulate `output` in `terminalOutput` state (already done).
    *   **End (Finally block):**
        *   Call `parseTerminalOutput` on the accumulated `terminalOutput`.
        *   Call `updateTerminalSession` to save `output`, `summary`, and `lastMessage`.
        *   Set `isRunning: false`.

2.  **Update Tool Selection Logic**
    *   File: `apps/web/src/components/layout/AIRightSidebar.tsx`
    *   Modify the tool list rendering (CLI & Web / Applications sections).
    *   **Logic:**
        *   When a tool is clicked:
            *   Check `getTerminalSessionForContext`.
            *   If session exists and `isRunning` is **true**: Call `reconnectToSession` (existing logic).
            *   If session exists and `isRunning` is **false**:
                *   Load `session.output` into `terminalOutput`.
                *   Set `rightSidebarView` to "terminal".
                *   Ensure `terminalProcessId` is null (prevents input).
                *   Show a "Session Finished" indicator in the UI.

3.  **UI Enhancements**
    *   Add visual indicators in the tool list for:
        *   Running (Active) - already exists.
        *   Finished (Has Summary/Output) - new icon or style (e.g., grayed out terminal icon or checkmark).

### Phase 4: Cleanup & Verification
1.  **Session Cleanup**
    *   Ensure that starting a *new* run for a tool overwrites the old session cleanly (or archives it if we wanted history, but for now overwriting is fine per task implication).
2.  **Verify Rehydration**
    *   Reload the page and verify that finished tool outputs/summaries are still accessible.
    *   Verify that active terminal PIDs are restored (though connection might need to be re-established, the knowledge of the PID persists).

## file_list
- apps/web/src/store/useHomeStore.ts
- apps/web/src/lib/terminal-parser.ts
- apps/web/src/components/layout/AIRightSidebar.tsx