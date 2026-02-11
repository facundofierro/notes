# Implementation Plan - Auto-save Summary and Active Terminal Tracking

This plan outlines the steps to implement persistent terminal sessions, output parsing for summaries, and UI enhancements in the AI Right Sidebar to track and display finished tool executions.

## Phase 1: Store Enhancement & Persistence

### 1.1 Update `TerminalSessionInfo` Interface

In `apps/web/src/store/useHomeStore.ts`, update the `TerminalSessionInfo` interface to include new fields for persistence and summary tracking.

```typescript
export interface TerminalSessionInfo {
  processId: string;
  toolName: string;
  contextKey: string;
  isRunning: boolean;
  startedAt: number;
  prompt?: string;
  projectName?: string;
  // New fields
  summary?: string;
  lastMessage?: string;
  output?: string;
}
```

### 1.2 Implement Selective Persistence

Update the `persist` middleware configuration in `useHomeStore.ts` to include `projectStates`, but only persist the `terminalSessions` for each project to avoid bloat.

- Update `partialize` to include `projectStates`.
- Map over `projectStates` and only return `terminalSessions` (and potentially other small metadata if needed).

### 1.3 Update Rehydration Logic

Ensure `onRehydrateStorage` correctly merges the persisted `terminalSessions` back into the default `ProjectState` structure.

## Phase 2: Terminal Output Parsing

### 2.1 Create Terminal Parser Utility

Create a new file `apps/web/src/lib/terminal-parser.ts` to handle output processing.

- **`stripAnsiCodes(input: string): string`**: Use a regex to remove ANSI escape sequences (colors, formatting) from the terminal output.
- **`parseTerminalOutput(output: string): { summary: string; lastMessage: string }`**:
  - Extract a `summary`: Look for specific patterns (e.g., blocks starting with `### Summary`) or take the first paragraph of the result.
  - Extract `lastMessage`: Capture the last meaningful line of output.

## Phase 3: Integration in AI Right Sidebar

### 3.1 Capture Full Output in `runTool`

Modify `runTool` in `apps/web/src/components/layout/AIRightSidebar.tsx` to accumulate the full terminal output during execution.

```typescript
let fullOutput = "";
// inside the while loop reading the stream
if (chunk) {
  fullOutput += chunk;
  setTerminalOutput((prev) => prev + chunk);
}
```

### 3.2 Save Session Data in `finally` Block

In the `finally` block of `runTool` (and `reconnectToSession`):

- Parse the `fullOutput` using `parseTerminalOutput`.
- Call `updateTerminalSession` with the extracted `summary`, `lastMessage`, and the `fullOutput`.
- Ensure `isRunning` is set to `false`.

### 3.3 Update Tool List UI

Modify the tool list in `AIRightSidebar.tsx`:

- Detect sessions that have finished (exists in `terminalSessions` but `isRunning` is `false`).
- Display a "Finished" status or badge for these tools.
- Enable clicking on a "Finished" tool to view its last output.

### 3.4 Implement "View Finished Session" Logic

When a finished session is clicked:

- Set `terminalOutput` to the saved `session.output`.
- Set `terminalToolName` to `session.toolName`.
- Set `isTerminalRunning(false)`.
- Switch `rightSidebarView` to `"terminal"`.

## Phase 4: Refinement & Cleanup

### 4.1 Handle Overwrites

Ensure that when a tool is re-run for the same context, the previous session's output and summary are cleared or correctly overwritten by the new `registerTerminalSession` call.

### 4.2 Rehydration Verification

Verify that after a page reload, the "Finished" tools still show up in the sidebar and their output can be viewed.
