# Plan: Fix Git Status Indicators and Refresh Spinning

**Task:** `.agelum/work/tasks/fixes/fix-local-changes-status.md`
**Status:** Draft

---

## Problem Summary

Three interrelated issues affect the git status UI:

1. **False notification dots**: The "Review" tab header and sidebar "Git" icon show a blue notification dot even when the working directory is clean, because the `hasChanges` flag is conflated with `ahead > 0` / `behind > 0` sync status in some UI locations.
2. **Spinning refresh icon**: The refresh button in `LocalChangesPanel` can spin indefinitely if the fetch fails in an unexpected way, or spins too frequently due to re-mounts.
3. **Redundant/competing polling**: Two independent systems (`useGitStatusPoller` via `/api/app-status` and `LocalChangesPanel` via `/api/git`) both update the same `gitStatus` store slice, causing potential race conditions and flickering.

---

## Phase 1: Unify Git Status Source of Truth

### Goal
Eliminate the dual-update problem by making `useGitStatusPoller` the single source of truth for `gitStatus` in the store, and having `LocalChangesPanel` consume the store rather than independently fetching and updating the global state.

### Files to Modify

#### 1.1 `apps/web/src/hooks/useGitStatus.ts`

**Current behavior:** Polls `/api/app-status` every 10s, which returns a lightweight `gitStatus` object (`{ ahead, behind, hasChanges, branch }`). Does a `git fetch` every 10 minutes.

**Changes:**
- Add a `lastPolledAt` timestamp to the store's `gitStatus` so consumers can know how fresh the data is.
- Expose a `refresh()` that can be called imperatively (already exists, just ensure it's accessible).
- No other changes needed here; this hook remains the global poller.

**Detailed steps:**
1. In `useHomeStore.ts`, extend the `gitStatus` type to add an optional `lastPolledAt: number` field:
   ```typescript
   gitStatus: {
     ahead: number;
     behind: number;
     hasChanges: boolean;
     branch: string;
     lastPolledAt?: number;
   } | null;
   ```
2. In `useGitStatus.ts`, when setting project state after a successful poll, include `lastPolledAt: Date.now()` in the `gitStatus` object:
   ```typescript
   setProjectState(() => ({
     isAppRunning: data.isRunning,
     isAppManaged: data.isManaged,
     appPid: data.pid || null,
     gitStatus: data.gitStatus
       ? { ...data.gitStatus, lastPolledAt: Date.now() }
       : null,
   }));
   ```

#### 1.2 `apps/web/src/components/features/git/LocalChangesPanel.tsx`

**Current behavior:** On mount (and on manual refresh), calls `/api/git?path=...` to get detailed git status (files, local commits, ahead/behind). Also writes to the global store's `gitStatus` via `setProjectState`.

**Changes:**
- **Stop updating the global store's `gitStatus`** from this component. Remove the `setProjectState` call inside `fetchStatus` (lines 91-98). The global `gitStatus` should only be updated by `useGitStatusPoller`.
- Keep the local `status` state (`useState<GitStatus>`) for detailed file-level data (staged files, unstaged files, local commits). This component needs the full file list, which the global poller doesn't provide.
- The `refreshing` state and abort/timeout logic (lines 72-107) is already well-handled with the 15-second timeout. Keep this as is.

**Detailed steps:**
1. Remove the `const setProjectState = useHomeStore((s) => s.setProjectState);` import (line 64).
2. Remove the `setProjectState(...)` block inside `fetchStatus` (lines 91-98).
3. Update the `fetchStatus` dependency array to remove `setProjectState`.
4. The component continues to fetch `/api/git` for its own local state (file lists, commits), but no longer writes to the global store.

---

## Phase 2: Refine Notification Dot Logic

### Goal
Only show the notification dot on the "Review" tab when there are actual **local file changes** (staged, modified, untracked, unmerged). Do NOT show it for ahead/behind sync status, which is informational, not actionable in the same way.

### Files to Modify

#### 2.1 `apps/web/src/components/layout/Header.tsx`

**Current behavior (lines 159-161):**
```typescript
const { gitStatus } = store.getProjectState();
const hasGitChanges = mode === "review" && gitStatus?.hasChanges === true;
```
This correctly checks `hasChanges` (which is already only about local file changes in the `/api/app-status` parsing). So this is **already correct**.

**Verification needed:** Confirm that the `hasChanges` field from `/api/app-status` only reflects working directory changes (staged/modified/untracked/unmerged), NOT ahead/behind. Looking at the parsing in `app-status/route.ts` lines 224-251:

```typescript
} else if (!line.startsWith("#")) {
  const char = line[0];
  if (char === "1" || char === "2" || char === "u" || char === "?") {
    gitStatus.hasChanges = true;
  }
}
```

This is correct -- it only sets `hasChanges = true` for actual file changes (changed entries `1`, renamed `2`, unmerged `u`, untracked `?`). It does NOT set `hasChanges` based on `ahead`/`behind`.

**Conclusion for Header.tsx:** The notification dot logic in `Header.tsx` is correct. **No changes needed** unless the user also wants a separate sync indicator.

#### 2.2 `apps/web/src/components/tabs/ReviewTab.tsx`

**Current behavior (lines 908-913):**
```typescript
{store.getProjectState().gitStatus?.hasChanges === true && (
  <span className={`absolute top-2 right-1/2 translate-x-4 w-2.5 h-2.5 ${themeColor.dot} rounded-full border-2 border-background shadow-[0_0_10px_rgba(59,130,246,0.6)]`} />
)}
```

This is also only checking `hasChanges`, which is correct. **No changes needed** to the notification dot itself.

#### 2.3 `apps/web/src/components/shared/ProjectSelector.tsx`

**Current behavior (lines 443-448):**
```typescript
{status?.gitStatus?.hasChanges === true && (
  <div
    className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] mb-1 shrink-0"
    title="Uncommitted local changes"
  />
)}
```

This uses the status from `/api/app-status` per project. It correctly checks `hasChanges`. **No changes needed.**

### Root Cause Analysis Update

After reading all the code, the notification dot logic is **already correct** -- it only responds to `hasChanges`, which only reflects actual file changes. The bug described in the task ("notification dot shows even when there are no local changes") must be caused by:

1. **Stale state**: The `LocalChangesPanel` writes `gitStatus` with `hasChanges: (data.files || []).length > 0` (line 95 of `LocalChangesPanel.tsx`). This counts files differently from the `/api/app-status` route. If `/api/git` returns files and `/api/app-status` returns none (or vice versa), the competing writes cause stale/incorrect state.
2. **Race condition**: The two pollers (global every 10s, local on every mount/refresh) overwrite each other. If `LocalChangesPanel` sets `hasChanges: true` and the global poller sets `hasChanges: false` a moment later (or vice versa), the dot flickers.

**The fix from Phase 1 (removing the store write from `LocalChangesPanel`) directly addresses this root cause.** With only one writer, the state is consistent.

---

## Phase 3: Improve Spinning/Loading States

### Goal
Ensure the refresh spinner in `LocalChangesPanel` never gets stuck and doesn't trigger unnecessarily.

### Files to Modify

#### 3.1 `apps/web/src/components/features/git/LocalChangesPanel.tsx`

**Current behavior:** Already has a 15-second abort timeout and proper try/catch/finally. The `refreshing` state is correctly reset in `finally`.

**Potential improvement:** The `fetchStatus` is called on every mount via `useEffect` (lines 110-115). If the `ReviewTab` re-renders or toggles sidebar views, `LocalChangesPanel` unmounts and remounts, triggering a new fetch each time. Since `LocalChangesPanel` is rendered with `display: none`/`hidden` toggling (not actual unmount/mount -- see ReviewTab lines 948-967 using `className="hidden"`), this is actually **not an issue** for re-mount triggers with the current implementation. The component stays mounted.

However, `fetchStatus` is re-created when `repoPath` changes (it's in its dependency array), which would cause the `useEffect` to re-run. This is correct behavior.

**Changes:**
1. Add a guard to skip fetching if the component is not visible (optional optimization). Since the component uses `display: hidden`, it stays mounted but is invisible. We could skip fetching if the parent view isn't "changes", but this is a minor optimization and may not be worth the complexity. **Skip this unless performance is a concern.**

2. Add a minimum interval between automatic refreshes to prevent rapid-fire fetches when actions like stage/unstage/commit trigger `fetchStatus()` multiple times in quick succession. Use a simple debounce:

```typescript
const lastFetchRef = React.useRef<number>(0);
const MIN_FETCH_INTERVAL = 1000; // 1 second

const fetchStatus = React.useCallback(async (force = false) => {
  const now = Date.now();
  if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return;
  lastFetchRef.current = now;

  // ... existing fetch logic
}, [repoPath]);
```

The `force` parameter allows the initial mount fetch and manual refresh to bypass the throttle.

**Detailed steps:**
1. Add `lastFetchRef` ref at the top of the component.
2. Add the time guard at the start of `fetchStatus`.
3. Update the `useEffect` call to use `fetchStatus(true)` for the initial mount.
4. Update the manual refresh button's `onClick` to call `() => fetchStatus(true)`.
5. Keep the action handlers (handleStage, handleUnstage, etc.) calling `fetchStatus()` without `force`, so they respect the throttle.

---

## Phase 4: Minor Cleanup

### 4.1 Remove duplicate `setProjectState` dependency

In `LocalChangesPanel.tsx`, after removing the store write (Phase 1), also clean up the import:
- Remove `useHomeStore` usage for `setProjectState` if it's no longer needed (keep `viewMode` usage).

### 4.2 Ensure consistent `hasChanges` semantics

Document (via code comment) that `hasChanges` strictly means "working tree has uncommitted changes" and does NOT include ahead/behind. This is already the case in the code, but a comment prevents future confusion.

In `apps/web/src/app/api/(system)/app-status/route.ts`, add a comment above the git status parsing:

```typescript
// hasChanges = true only for working-tree changes (staged/modified/untracked/unmerged).
// ahead/behind is tracked separately and does NOT affect hasChanges.
```

---

## Summary of All File Changes

| File | Change | Phase |
|------|--------|-------|
| `apps/web/src/store/useHomeStore.ts` | Add `lastPolledAt?: number` to `gitStatus` type | 1 |
| `apps/web/src/hooks/useGitStatus.ts` | Include `lastPolledAt` in store update | 1 |
| `apps/web/src/components/features/git/LocalChangesPanel.tsx` | Remove global store write from `fetchStatus`; add fetch throttle | 1, 3 |
| `apps/web/src/app/api/(system)/app-status/route.ts` | Add clarifying comment on `hasChanges` semantics | 4 |

**Files that do NOT need changes** (verified correct):
- `apps/web/src/components/layout/Header.tsx` -- notification dot logic already correct
- `apps/web/src/components/tabs/ReviewTab.tsx` -- notification dot logic already correct
- `apps/web/src/components/shared/ProjectSelector.tsx` -- notification dot logic already correct
- `apps/web/src/app/api/(project)/git/route.ts` -- status parsing already correct

---

## Implementation Order

1. **Phase 1** first (single source of truth) -- this is the primary fix
2. **Phase 3** next (spinning/loading improvements) -- can be done in the same PR
3. **Phase 4** last (cleanup) -- minor, do alongside
4. **Phase 2** requires no changes (already correct)

---

## Risk Assessment

- **Low risk**: All changes are localized to the git status update flow. No API route changes needed (except a comment). The store type change is additive (optional field).
- **Regression concern**: After removing the store write from `LocalChangesPanel`, the notification dot relies entirely on the global poller's 10-second interval. If the user commits/stages changes via the panel, the dot may take up to 10 seconds to update. This is acceptable since the poller runs frequently. If faster feedback is desired, `LocalChangesPanel` could trigger a manual poller refresh after actions (calling the poller's `refresh()` function), but this adds coupling.
