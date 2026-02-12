# Implementation Plan: Task Plan Summary Notification

This plan outlines the implementation of a notification mechanism (pulse animation) in the `WorkEditor` task switcher to indicate when files (Task, Plan, Summary) are created or modified by an AI tool.

## Phase 1: API Enhancement

Update the file API to support efficient polling using file metadata instead of full content comparison.

### 1.1 Update `GET /api/file`
- **Location**: `apps/web/src/app/api/(files)/file/route.ts`
- **Change**: 
    - Support a `statsOnly` query parameter.
    - If `statsOnly` is true, use `fs.statSync(filePath)` to get file metadata.
    - Return `mtime` (as a number/timestamp) and `size`.
    - Avoid reading the full file content when `statsOnly` is requested.

## Phase 2: State Management

Use Zustand to track the last modification time of files across the application.

### 2.1 Update `useHomeStore.ts`
- **Location**: `apps/web/src/store/useHomeStore.ts`
- **Change**:
    - Add `lastChangeDetected: Record<string, number>` (mapping absolute file path to timestamp) to `ProjectState`.
    - Add an action `setFileModified: (path: string, mtime: number) => void` to update this map.
    - Ensure this state is properly handled within `setProjectState` and `setProjectStateForRepo`.

## Phase 3: Polling Implementation

Implement efficient polling in the `AIRightSidebar` to monitor files while an AI tool is running.

### 3.1 Implement Poller in `AIRightSidebar`
- **Location**: `apps/web/src/components/layout/AIRightSidebar.tsx`
- **Logic**:
    - Add a `useEffect` that runs while `isTerminalRunning` is true.
    - Identify files to monitor based on `docAiMode`:
        - `modify`: Monitor the current `file.path`.
        - `plan`: Monitor `file.path` AND the plan file path.
        - `start`: Monitor `file.path` AND the summary file path.
    - The poller should run every 2 seconds.
    - Use `/api/file?path=...&statsOnly=true` to get the current `mtime`.
    - Maintain a local `useRef` map of known `mtimes` to detect changes.
    - When a change is detected:
        - Update `lastChangeDetected` in `useHomeStore`.
        - Call `refreshCurrentFile()` if the modified file is the one currently open in the sidebar context (optional but recommended for consistency).

## Phase 4: Notification Animation UI

Add the visual feedback in the `WorkEditor` switcher.

### 4.1 Update `WorkEditor.tsx`
- **Location**: `apps/web/src/components/features/work/WorkEditor.tsx`
- **Logic**:
    - Select `lastChangeDetected` from `useHomeStore`.
    - Add a `useEffect` that watches `lastChangeDetected`.
    - If a path in `lastChangeDetected` matches the current Task, Plan, or Summary absolute path AND the timestamp is within the last 5 seconds:
        - Trigger a "pulse" state for the corresponding tab.
    - Use a local state (e.g., `notifiedTabs: Set<string>`) to track which buttons should animate.
    - Use `setTimeout` to clear the pulse state after 3-5 seconds.
- **Styling**:
    - Add a CSS keyframe animation for a "pulse" or "highlight" effect.
    - Apply a Tailwind class (e.g., `animate-pulse-highlight`) to the buttons in `headerCenter` when active.

### 4.2 Switcher Animation
- Update the buttons in `headerCenter` to conditionally apply the animation class.
- Ensure the animation is subtle and doesn't interfere with readability.

## Phase 5: Cleanup and Refinement

### 5.1 Match Task Logic
- Ensure the notification only triggers if the file being modified belongs to the task currently open in `WorkEditor`.

### 5.2 Efficiency
- Ensure the poller stops immediately when the terminal stops.
- Avoid duplicate polling if multiple components are open (though `AIRightSidebar` is typically unique).

## Final Polish
- Verify the animation duration (3-5s).
- Ensure navigation between Task, Plan, and Summary tabs doesn't clear a "pending" notification if it was triggered recently.
