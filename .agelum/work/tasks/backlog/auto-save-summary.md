# Auto-save Summary and Active Terminal Tracking

**Plan:** [.agelum/work/plans/auto-save-summary.md](../../plans/auto-save-summary.md)

- [ ] Implement Parsing of Terminal Output
  - [ ] Create a mechanism to parse the terminal output when a tool finishes execution or when the tab is closed.
  - [ ] Extract the prompt, summary, and last message.
- [ ] Store Active Terminal PIDs
  - [ ] Identify where to store the PID of active terminals for each project/tool.
  - [ ] Ensure this state persists or can be retrieved when switching tabs.
- [ ] Display Summary in AI Tab
  - [ ] When an inactive tool is selected in the AI Tab, display the parsed summary/history.
- [ ] Display Active Terminal
  - [ ] When an active tool is selected, attach to the running terminal using its PID.
