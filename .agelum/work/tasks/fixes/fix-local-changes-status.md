---
summary: .agelum/work/summaries/fix-local-changes-status-1770901473999.md
plan: .agelum/work/plans/fix-local-changes-status-1770901158138.md
---
# Fix Git Status Indicators and Refresh Spinning

## Issue Summary

The "Review" tab and the "Git" icon in the sidebar show a notification dot even when there are no local changes. Additionally, the refresh icon in the `LocalChangesPanel` sometimes appears to spin indefinitely or unnecessarily.

## Root Causes Identified

### 1. Notification Dot Logic

The notification dot (blue circle) is displayed if any of these conditions are met:

- `gitStatus.hasChanges` is true (local modified/staged files).
- `gitStatus.ahead > 0` (local commits not pushed).
- `gitStatus.behind > 0` (remote commits not pulled).

**Problem:** If a project has local commits that haven't been pushed (`ahead > 0`), the UI shows a notification dot on the "Review" tab. The user may perceive this as "changes" even if the working directory is clean.

### 2. Spinning Refresh Icon

In `LocalChangesPanel.tsx`, the `refreshing` state is set to `true` at the start of `fetchStatus` and `false` at the end.

- If the `/api/git` request takes a long time or fails in a way that isn't caught properly, the icon keeps spinning.
- The `fetchStatus` is called on every mount. Since `ReviewTab` might re-render or switch views, this could cause frequent triggers.

### 3. Redundant Polling & State Updates

- `useGitStatusPoller` (global) updates `gitStatus` every 10s via `/api/app-status`.
- `LocalChangesPanel` (local) updates `gitStatus` via `/api/git`.
- Both update the same `useHomeStore` state, potentially causing race conditions or flickering if one returns slightly different data than the other (e.g., parsing logic differences).

## Proposed Fixes

1.  **Refine Notification Logic**: Distinguish between "Local Changes" (modified files) and "Sync Status" (ahead/behind).
    - Use a different color or indicator for sync status vs local changes.
    - Or, only show the "notification dot" in the Header for _local changes_ specifically, and keep the ahead/behind numbers for sync information.
2.  **Unify Status Parsing**: Ensure `/api/app-status` and `/api/git` use the same internal logic for parsing `git status --porcelain`.
3.  **Optimize Polling**: Avoid multiple components fetching the same git status simultaneously.
4.  **Fix Spinning States**: Ensure `refreshing` and `loading` states in `LocalChangesPanel` are robustly handled with proper error boundaries and timeouts.
