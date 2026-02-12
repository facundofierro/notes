# Implementation Plan: Fix Unwanted Rerenders on Polling

Unwanted rerenders are occurring every 10 seconds during the status polling cycle. This is primarily caused by `useGitStatusPoller` updating the Zustand store with a new `lastPolledAt` timestamp every time, even when the actual status data hasn't changed. Furthermore, broad store subscriptions in `Home.tsx` and `Header.tsx` cause the entire page to rerender on any store change.

## Objectives
- Prevent store updates in `useGitStatus.ts` if the incoming status data matches the current state.
- Optimize store selectors in main components to isolate rerenders.

## Phase 1: Optimize Polling Logic
Modify `apps/web/src/hooks/useGitStatus.ts` to implement deep comparison before updating the store.

-   **Step 1.1: Implement Change Detection**
    In `fetchStatus` (inside `useGitStatus.ts`), compare the data received from `/api/app-status` with the current state in the store (obtained via `useHomeStore.getState().getProjectState()`).
    Check for changes in:
    - `isRunning`
    - `isManaged`
    - `pid` (maps to `appPid` in store)
    - `gitStatus` fields: `ahead`, `behind`, `hasChanges`, `branch`.

-   **Step 1.2: Conditional Store Update**
    Only call `setProjectState` if at least one of these fields has changed.
    If nothing changed, do NOT update the store. This will skip the `lastPolledAt` update as well, preserving the store object reference and preventing downstream rerenders.

## Phase 2: Refactor Store Subscriptions
Broad subscriptions using `const store = useHomeStore()` are causing unnecessary rerenders when unrelated parts of the store change.

-   **Step 2.1: Update Header Component**
    In `apps/web/src/components/layout/Header.tsx`, replace `const store = useHomeStore()` with granular selectors.
    Example:
    ```typescript
    const selectedRepo = useHomeStore(s => s.selectedRepo);
    const setViewMode = useHomeStore(s => s.setViewMode);
    // ... etc
    ```

-   **Step 2.2: Update Main Page Component**
    In `apps/web/src/app/page.tsx`, replace `const store = useHomeStore()` and `const { ... } = store` with individual selector calls.

-   **Step 2.3: Update ProjectView Component**
    In `apps/web/src/app/page.tsx`, ensure `ProjectView` only rerenders when its specific `projectState` or `selectedRepo` changes.

## Phase 3: Metadata Handling (Optional)
If showing "Last polled X seconds ago" is still desired in `LocalChangesPanel.tsx` without triggering a full page rerender:
- Consider moving `lastPolledAt` to a separate, more isolated piece of state or handled via a local ref in the poller if it's only for internal comparison.
- For now, prioritizing the "no rerender" requirement by skipping the update entirely if status is unchanged.

## Files to Modify
- `apps/web/src/hooks/useGitStatus.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/store/useHomeStore.ts` (if needed for better setter logic)
