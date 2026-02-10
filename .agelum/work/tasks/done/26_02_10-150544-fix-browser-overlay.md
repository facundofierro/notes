---
created: 2026-02-10T14:52:01.953Z
state: todo
plan: .agelum/work/plans/fix-browser-overlay-1770742858217.md
---

# Fix Browser Overlay and Multiple Page Visibility

## Problem Description

When running in Electron, the native `WebContentsView` (Browser View) stays on top of HTML elements like the Project Selection menu because it is a native view managed by the OS.

Currently:

1. The mechanism to hide the browser only works for the first page (index 0) because `ProjectSelector.tsx` doesn't pass a `tabIndex` to the hide/show calls.
2. The browser view sometimes reappears even when the user is not in the Browser Tab (e.g., when switching to Tasks tab while the project menu is open).
3. We implemented a screenshot capture mechanism to show a static image while the browser is hidden, but it is not working as expected and should be removed.

## Objectives

- Ensure **all** browser tabs are hidden when a global overlay (like the Project Selection menu) is open.
- Ensure browser views **only** reappear if the "Browser" tab is active.
- Remove the screenshot-on-hide mechanism entirely.

## Relevant Files

- `apps/web/src/store/useHomeStore.ts`: Add global overlay state.
- `apps/web/src/components/shared/ProjectSelector.tsx`: Update hide/show logic and remove screenshot calls.
- `apps/web/src/components/layout/Header.tsx`: Remove screenshot handling logic.
- `apps/web/src/components/tabs/BrowserTab.tsx`: Sync visibility with global overlay state and active tab index.
- `apps/electron/src/main.js` & `apps/electron/src/preload.js`: Ensure IPC supports hiding/showing all views if needed.

## Proposed Steps

### 1. Centralize Overlay State in Store

- Add a new property `isProjectSelectorOpen` (or a more generic `isGlobalOverlayOpen`) to `useHomeStore.ts`.
- Update `ProjectSelector.tsx` to set this state instead of managing local `open` state or trying to call Electron APIs directly.

### 2. Remove Screenshot Mechanism

- Remove `onBrowserScreenshot` prop from `ProjectSelector.tsx`.
- Remove `handleBrowserScreenshot` and `tempBrowserScreenshot` state/logic from `Header.tsx` and `useHomeStore.ts`.
- Remove the `tempBrowserScreenshot` display block in `BrowserTab.tsx`.

### 3. Improve Visibility Logic in BrowserTab

- Update the `useEffect` in `BrowserTab.tsx` that manages native view visibility.
- It should now hide the view if `isGlobalOverlayOpen` is true or if `viewMode` is not `"browser"`.
- This centralizes the "when to show" logic in the component that owns the views.

### 4. Fix Multiple Page Hiding (Safety Measure)

- In `ProjectSelector.tsx`, as a fallback or additional safety, ensure that if we do call `hide()`, we target the current active index or simply rely on the centralized state in Step 3.
- If we need a "hide all" IPC, add it to `main.js`.
