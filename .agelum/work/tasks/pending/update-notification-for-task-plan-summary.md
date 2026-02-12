---
created: 2026-02-11T22:42:40.061Z
state: pending
plan: .agelum/work/plans/update-notification-for-task-plan-summary-1770852971997.md
---

# update-notification-for-task-plan-summary

We need to implement a notification mechanism (animation) in the task switcher of `WorkEditor` to indicate when files are created or modified by the AI while a tool is running.

## Current Investigation
- **Existing Poller**: A poller exists in `apps/web/src/components/features/ai/AISessionViewer.tsx` (lines 43-67), but it only runs when viewing a session in the AI tab. It polls every 2 seconds and compares full content, which is inefficient.
- **Missing Monitoring**: When running a CLI tool from the `AIRightSidebar` (inside `WorkEditor`), there is no active monitoring of the task file, plan file, or summary file to trigger animations in the top switcher.
- **Sidebar Modes**: `AIRightSidebar` has `modify`, `start`, and `plan` modes. 
  - `modify` mode works on the existing task file.
  - `plan` mode creates a new plan file (and links it in frontmatter).
  - `start` mode creates a new summary file (and links it in frontmatter).

## Objectives
1. **API Enhancement**: Update `/api/file` to support `statsOnly` requests and return `mtime` (modification time) for efficient polling.
2. **Polling Implementation**:
   - Implement a poller in `WorkEditor` or `AIRightSidebar` that monitors the relevant files based on the current mode and session.
   - Use `mtime` (datetime) to detect changes instead of content comparison.
3. **Notification Animation**:
   - Show a subtle animation (e.g., a pulse or highlight) for a few seconds in the task switcher items (**Task**, **Plan**, **Summary**) when their respective files are modified or created.
   - Ensure the notification only triggers if the file being modified matches the one associated with the currently open task.
   - If the user navigates away and comes back, the notification should still work if a change was detected recently.
4. **Mode-Specific Logic**:
   - **Modify Mode**: Detect modifications to the task file itself.
   - **Plan Mode**: Detect the *creation* and subsequent modifications of the plan file.
   - **Start Mode**: Detect the *creation* and subsequent modifications of the summary file.

## Requirements
- Use a Zustand state or an upper-level state (e.g., in `useHomeStore`) to track "just modified" states for files, so notifications can be coordinated even if views change.
- The animation should last for approximately 3-5 seconds.
- Account for the fact that a user might open a different task than the one the CLI is working on; only show the notification for the matching task.

## Implementation Details
- The switcher is located in `apps/web/src/components/features/work/WorkEditor.tsx`.
- The `AIRightSidebar` is where the tool is triggered and where `refreshCurrentFile` is currently handled manually upon completion/cancellation.
- Consider adding a `lastChangeDetected` map in `useHomeStore` (keyed by path) to track when each file was last updated by an AI session.
