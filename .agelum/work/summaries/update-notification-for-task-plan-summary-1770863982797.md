---
title: Task/Plan/Summary File Change Notification
created: 2026-02-11
type: summary
state: done
---

# Implementation Summary: Task/Plan/Summary File Change Notification

## Overview

Implemented a notification mechanism (pulse animation) in the WorkEditor task switcher that visually indicates when Task, Plan, or Summary files are created or modified by an AI tool running in the terminal.

## Changes Made

### 1. API Enhancement - `apps/web/src/app/api/(files)/file/route.ts`

- Added `statsOnly` query parameter support to the `GET /api/file` endpoint.
- When `statsOnly=true`, the endpoint returns only file metadata (`mtime`, `size`, `exists`) using `fs.statSync()` instead of reading full file content.
- This enables efficient polling without the overhead of reading and transferring full file contents.

### 2. State Management - `apps/web/src/store/useHomeStore.ts`

- Added `lastChangeDetected: Record<string, number>` to the `ProjectState` interface, mapping absolute file paths to detection timestamps.
- Added `setFileModified(path: string, mtime: number)` action to the `HomeState` interface and its implementation.
- Initialized `lastChangeDetected` as an empty object `{}` in the default project state.

### 3. Polling Implementation - `apps/web/src/components/layout/AIRightSidebar.tsx`

- Added a `useEffect` that activates while `isTerminalRunning` is true and a file is selected.
- Polls file stats every 2 seconds using the new `statsOnly` API endpoint.
- Monitors files based on the current `docAiMode`:
  - **modify**: Monitors `file.path` (the current task file).
  - **plan**: Monitors `file.path` AND the generated plan file path (`lastGeneratedPlanPath`).
  - **start**: Monitors `file.path` AND the generated summary file path (`lastGeneratedSummaryPath`).
- Uses a `useRef` map (`knownMtimesRef`) to track known mtimes and detect changes.
- When a change is detected, calls `setFileModified()` to update the Zustand store.
- Added `lastGeneratedSummaryPath` state variable (mirroring the existing `lastGeneratedPlanPath` pattern) and stores the summary path when generated in `runTool`.
- Cleans up interval and resets known mtimes when the effect unmounts.

### 4. Notification Animation UI - `apps/web/src/components/features/work/WorkEditor.tsx`

- Imported `useHomeStore` and subscribes to `lastChangeDetected` from the project state.
- Added `pulseTabs` local state (`Set<string>`) to track which tabs should animate.
- Added `resolveAbsPath` helper to convert relative paths to absolute for comparison with the change detection map.
- Added a `useEffect` that watches `lastChangeDetected` and matches changed paths against the current task file path, resolved plan path, and resolved summary path.
- When a match is found within the last 5 seconds, the corresponding tab ("task", "plan", or "summary") is added to `pulseTabs`.
- Pulse animation auto-clears after 4 seconds via `setTimeout`.
- When plan or summary changes are detected, invalidates the cached file content (`setPlanFile(null)` / `setSummaryFile(null)`) so navigating to the tab fetches fresh data.
- Added inline CSS keyframe animation (`tab-pulse-highlight`) for the glow effect.
- Applied conditional `ring-1 ring-blue-500/70 shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]` classes to Task, Plan, and Summary buttons when they are in the pulse state.
- Changed button transition classes from `transition-colors` to `transition-all duration-300` for smooth glow animation.

## Files Modified

1. `apps/web/src/app/api/(files)/file/route.ts` - statsOnly API parameter
2. `apps/web/src/store/useHomeStore.ts` - lastChangeDetected state + setFileModified action
3. `apps/web/src/components/layout/AIRightSidebar.tsx` - File stats polling logic
4. `apps/web/src/components/features/work/WorkEditor.tsx` - Pulse animation on tab buttons

## Testing Notes

- TypeScript compilation passes with no new errors (all errors are pre-existing and unrelated).
- The polling starts only when `isTerminalRunning` is true and stops immediately when the terminal stops.
- The animation is subtle (blue ring/shadow glow) and does not interfere with readability.
- Navigation between tabs does not clear pending notifications.
