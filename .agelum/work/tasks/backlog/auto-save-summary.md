# Auto-save Summary and Active Terminal Tracking

**Plan:** [.agelum/work/plans/auto-save-summary.md](../../plans/auto-save-summary.md)

## Tasks

### Phase 1: Store Enhancement & Persistence
- [ ] Update `TerminalSessionInfo` interface in `useHomeStore.ts` to include `prompt`, `summary`, `lastMessage`, and `output`.
- [ ] Implement selective store persistence in `useHomeStore.ts` to save `terminalSessions` for each project.
- [ ] Ensure rehydration logic correctly merges persisted terminal sessions.

### Phase 2: Terminal Output Parsing
- [ ] Create `apps/web/src/lib/terminal-parser.ts` with logic to extract summary and last message from terminal output.
- [ ] Implement ANSI color code stripping for stored summaries.

### Phase 3: Integration in AI Sidebar
- [ ] Update `runTool` in `AIRightSidebar.tsx` to capture the prompt when starting.
- [ ] Update the `finally` block in tool execution to parse and save the full output, summary, and last message.
- [ ] Modify tool selection logic to display finished session output when selecting an inactive tool.
- [ ] Add UI indicators in the tool list for "Finished" sessions.

### Phase 4: Cleanup & Verification
- [ ] Ensure new tool runs overwrite old sessions correctly.
- [ ] Verify persistence and rehydration after page reloads.
