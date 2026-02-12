# Summary: Fix Local Changes Status and Refresh UI

I have completed the task of fixing the Git status indicators and refresh spinning issues as outlined in the implementation plan.

## Changes Made

### 1. Unified Git Status Source of Truth
- **Single Writer:** Removed the redundant global store updates from `LocalChangesPanel.tsx`. The global `gitStatus` in `useHomeStore` is now exclusively updated by the `useGitStatusPoller` hook via the `/api/app-status` endpoint.
- **Freshness Tracking:** Added a `lastPolledAt` timestamp to the `gitStatus` object in the store. This allows consumers to know exactly when the Git status was last verified by the global poller.
- **Hook Update:** Updated `useGitStatusPoller` to include the `lastPolledAt` timestamp when updating the store.

### 2. Improved Refresh Logic in LocalChangesPanel
- **Prevention of Stuck Spinner:** Implemented a 15-second timeout using `AbortController` in the `fetchStatus` function. This ensures that the refresh icon will not spin indefinitely if an API request hangs or fails silently.
- **Fetch Throttling:** Added a minimum fetch interval (1 second) and a `force` parameter to `fetchStatus`. This prevents rapid-fire API calls during rapid component re-renders or quick successive user actions, while still allowing immediate feedback for manual refreshes and initial mounts.
- **Proper Cleanup:** Ensured that in-flight requests are aborted when the component unmounts or when a new fetch is triggered.

### 3. Notification Dot Logic Verification
- **Semantic Clarity:** Added clarifying comments to the `/api/app-status` route to ensure `hasChanges` is strictly defined as having uncommitted working-tree changes (staged, modified, untracked, or unmerged), and is not conflated with ahead/behind sync status.
- **UI Consistency:** Verified that `Header.tsx`, `ReviewTab.tsx`, and `ProjectSelector.tsx` all correctly use the `hasChanges` flag for showing notification dots, ensuring consistent behavior across the application.

### 4. Code Cleanup
- Removed unused `setProjectState` dependencies and imports where they were no longer needed after the unification of the state update logic.

## Verification Results
- The "Review" tab and Git sidebar icon now only show a notification dot when there are actual local file changes.
- The refresh spinner in the `LocalChangesPanel` resets correctly after a timeout or completion.
- Stale state and race conditions caused by competing pollers have been eliminated by establishing a single source of truth for the global Git status.
