# Summary: Fix Unwanted Rerenders on Polling

Successfully implemented optimizations to prevent unnecessary rerenders during the status polling cycle and isolated store subscriptions in key components.

## Changes Made

### 1. Polling Logic Optimization
- **Modified `apps/web/src/hooks/useGitStatus.ts`**:
    - Implemented a deep comparison in `fetchStatus` to check for changes in `isRunning`, `isManaged`, `pid`, and `gitStatus` fields before updating the store.
    - The store is now only updated if actual data has changed, preventing the `lastPolledAt` timestamp from triggering a rerender every 10 seconds.

### 2. Store Subscription Refactoring
- **Modified `apps/web/src/app/page.tsx`**:
    - Refactored `Home` and `ProjectView` components to use granular Zustand selectors instead of subscribing to the entire store.
- **Modified `apps/web/src/components/layout/Header.tsx`**:
    - Replaced the broad store subscription with specific selectors and a custom equality function for project-specific state fields.
- **Modified `apps/web/src/components/features/git/LocalChangesPanel.tsx`**:
    - Updated to use granular selectors for `viewMode` and `gitStatus`.
- **Modified Tab Components**:
    - Refactored `TasksTab.tsx`, `EpicsTab.tsx`, `IdeasTab.tsx`, and `LogsTab.tsx` to use individual selectors, ensuring they don't rerender when unrelated parts of the store change.

## Outcome
- The application no longer rerenders the entire page every 10 seconds during polling.
- Store updates are now focused and only occur when necessary.
- Component rerenders are isolated to the specific pieces of state they depend on.
