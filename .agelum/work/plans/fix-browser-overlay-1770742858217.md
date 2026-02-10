---
created: 2026-02-10T15:00:00.000Z
type: plan
task: fix-browser-overlay
---

# Plan: Fix Browser Overlay and Multiple Page Visibility

## Summary

When the Agelum Electron app displays its native `WebContentsView` browser panels, they render on top of HTML overlays (e.g., the Project Selector popover). This plan fixes three interrelated issues:

1. Only the first browser tab (index 0) is hidden when the overlay opens — the others stay visible.
2. Browser views can reappear even when the user isn't on the Browser tab.
3. A screenshot-capture-on-hide mechanism (`tempBrowserScreenshot`) was added as a workaround but doesn't work well and should be removed.

## Architecture Overview

**Current flow:**
- `ProjectSelector.tsx` manages a local `open` state for the popover.
- When `open` becomes true, it calls `window.electronAPI.browserView.hide()` (no tabIndex → defaults to 0, only hiding the first tab).
- It also tries to capture a screenshot before hiding (for tab 0 only) and passes it up via `onBrowserScreenshot` callback to `Header.tsx`, which stores it in project state as `tempBrowserScreenshot`.
- `BrowserTab.tsx` renders `tempBrowserScreenshot` as a fallback overlay image when the native view is hidden.
- When `open` becomes false, it calls `browserView.show()` (again, only tab 0).

**Desired flow:**
- A global `isGlobalOverlayOpen` boolean lives in the Zustand store.
- `ProjectSelector.tsx` sets this flag instead of calling Electron APIs directly.
- `BrowserTab.tsx` reacts to `isGlobalOverlayOpen` and hides **all** native views when it's true, showing them again only when it's false **and** the active view mode is `"browser"`.
- The screenshot mechanism is fully removed.

---

## Phase 1: Add Global Overlay State to the Store

### File: `apps/web/src/store/useHomeStore.ts`

1. **Add `isGlobalOverlayOpen` to `HomeState` interface** (line ~163, in the global state section):
   ```ts
   isGlobalOverlayOpen: boolean;
   ```

2. **Add `setGlobalOverlayOpen` action to `HomeState` interface** (line ~187, in the Actions section):
   ```ts
   setGlobalOverlayOpen: (open: boolean) => void;
   ```

3. **Initialize `isGlobalOverlayOpen: false`** in the store implementation (line ~323, alongside other initial values):
   ```ts
   isGlobalOverlayOpen: false,
   ```

4. **Implement `setGlobalOverlayOpen`** in the store implementation (line ~365, alongside other setters):
   ```ts
   setGlobalOverlayOpen: (isGlobalOverlayOpen) => set({ isGlobalOverlayOpen }),
   ```

5. **Remove `tempBrowserScreenshot` from `ProjectState` interface** (line ~86):
   - Delete the `tempBrowserScreenshot: string | null;` property.

6. **Remove `tempBrowserScreenshot: null` from `createDefaultProjectState()`** (line ~122):
   - Delete the `tempBrowserScreenshot: null,` line.

---

## Phase 2: Update ProjectSelector to Use Global State

### File: `apps/web/src/components/shared/ProjectSelector.tsx`

1. **Remove the `onBrowserScreenshot` and `currentViewMode` props** from the `ProjectSelectorProps` interface (lines 49–50):
   - Delete `currentViewMode?: string;`
   - Delete `onBrowserScreenshot?: (screenshot: string | null) => void;`

2. **Remove `currentViewMode` and `onBrowserScreenshot` from the destructured props** (lines 58–59):
   - Remove them from the function parameter destructuring.

3. **Remove the `viewModeWhenOpened` state** (line 79):
   - Delete `const [viewModeWhenOpened, setViewModeWhenOpened] = React.useState<string | null>(null);`

4. **Import and use `useHomeStore`**:
   - Add at the top: `import { useHomeStore } from "@/store/useHomeStore";`
   - Inside the component, subscribe to the setter:
     ```ts
     const setGlobalOverlayOpen = useHomeStore(s => s.setGlobalOverlayOpen);
     ```

5. **Replace the Electron browser view hide/show `useEffect`** (lines 265–297) with a simpler effect that just updates the global overlay state:
   ```ts
   React.useEffect(() => {
     setGlobalOverlayOpen(open);
   }, [open, setGlobalOverlayOpen]);
   ```
   This removes all direct Electron API calls (`hide()`, `show()`, `capture()`) from `ProjectSelector`.

---

## Phase 3: Update Header to Remove Screenshot Handling

### File: `apps/web/src/components/layout/Header.tsx`

1. **Remove `handleBrowserScreenshot` callback** (lines 46–52):
   - Delete the entire `const handleBrowserScreenshot = React.useCallback(...)` block.

2. **Remove the `currentViewMode` and `onBrowserScreenshot` props from the `<ProjectSelector>` usage** (lines 142–143):
   - Remove `currentViewMode={effectiveViewMode}` from the JSX.
   - Remove `onBrowserScreenshot={handleBrowserScreenshot}` from the JSX.

---

## Phase 4: Update BrowserTab Visibility Logic

### File: `apps/web/src/components/tabs/BrowserTab.tsx`

1. **Subscribe to `isGlobalOverlayOpen` from the store** (near line 11, alongside existing selectors):
   ```ts
   const isGlobalOverlayOpen = useHomeStore(s => s.isGlobalOverlayOpen);
   ```

2. **Remove `tempBrowserScreenshot` from the destructured `projectState`** (line 34):
   - Remove `tempBrowserScreenshot,` from the destructuring.

3. **Update `isBrowserVisible` computation** (line 285):
   - Change from:
     ```ts
     const isBrowserVisible = isSelected && viewMode === "browser";
     ```
   - To:
     ```ts
     const isBrowserVisible = isSelected && viewMode === "browser" && !isGlobalOverlayOpen;
     ```

4. **The existing `useEffect` on line 288 already handles visibility correctly** — it shows the active tab view when `isBrowserVisible` is true and hides it in the cleanup function. By adding `!isGlobalOverlayOpen` to `isBrowserVisible`, this effect will:
   - Run the cleanup (hide the active tab's view) when the overlay opens.
   - Re-run (show the active tab's view + sync bounds) when the overlay closes, but **only** if we're still on the browser tab.
   - Importantly, it already iterates all `browserPages` to hide non-active tabs (lines 313–317), and the cleanup hides the active tab (line 332). This means **all** tabs get hidden when `isBrowserVisible` becomes false.

5. **Remove the `tempBrowserScreenshot` overlay rendering** (lines 640–648):
   - Delete the entire block:
     ```tsx
     {tempBrowserScreenshot && (
       <div className="absolute inset-0 z-10 bg-zinc-900">
         <img
           src={tempBrowserScreenshot}
           alt="Browser preview"
           className="w-full h-full object-contain"
         />
       </div>
     )}
     ```

---

## Phase 5: Add "Hide All" IPC as Safety Net (Optional but Recommended)

### File: `apps/electron/src/main.js`

1. **Add a `browser-view:hide-all` IPC handler** in `setupIpcHandlers()` (after the existing `hide` handler around line 223):
   ```js
   ipcMain.on("browser-view:hide-all", (event) => {
     const win = BrowserWindow.fromWebContents(event.sender);
     if (!win) return;
     for (const [key, entry] of browserViews.entries()) {
       if (key.startsWith(`${win.id}:`) && entry.attached) {
         try {
           win.contentView.removeChildView(entry.view);
         } catch (_) {}
         entry.attached = false;
       }
     }
   });
   ```

2. **Add a `browser-view:show-all` IPC handler** (after the new `hide-all` handler):
   ```js
   ipcMain.on("browser-view:show-all", (event) => {
     const win = BrowserWindow.fromWebContents(event.sender);
     if (!win) return;
     for (const [key, entry] of browserViews.entries()) {
       if (key.startsWith(`${win.id}:`) && !entry.attached) {
         win.contentView.addChildView(entry.view);
         entry.attached = true;
       }
     }
   });
   ```

### File: `apps/electron/src/preload.js`

3. **Expose the new IPC methods** in the `browserView` object:
   ```js
   hideAll: () => ipcRenderer.send("browser-view:hide-all"),
   showAll: () => ipcRenderer.send("browser-view:show-all"),
   ```

> **Note:** These are optional safety-net APIs. The current plan relies on BrowserTab's existing useEffect to handle per-tab hide/show correctly via the `isBrowserVisible` flag. The `hideAll`/`showAll` methods could be used in the future if other overlays need to hide browser views without going through the full BrowserTab lifecycle.

---

## Summary of Changes by File

| File | Changes |
|------|---------|
| `useHomeStore.ts` | Add `isGlobalOverlayOpen` + `setGlobalOverlayOpen`; remove `tempBrowserScreenshot` from `ProjectState` |
| `ProjectSelector.tsx` | Remove direct Electron API calls, screenshot props; use `setGlobalOverlayOpen(open)` instead |
| `Header.tsx` | Remove `handleBrowserScreenshot` callback and related props passed to `ProjectSelector` |
| `BrowserTab.tsx` | Add `isGlobalOverlayOpen` to `isBrowserVisible` check; remove `tempBrowserScreenshot` overlay |
| `main.js` | (Optional) Add `hide-all` and `show-all` IPC handlers |
| `preload.js` | (Optional) Expose `hideAll()` and `showAll()` methods |

## Execution Order

Steps should be executed in the phase order above (1 → 2 → 3 → 4 → 5). Phase 5 is optional. Phases 2, 3, and 4 can be done in any order after Phase 1, but all must be done together to avoid breaking the build (removing `tempBrowserScreenshot` usage must be paired with removing the prop/state that provides it).

## Edge Cases to Consider

- **Multiple overlays**: If other global overlays are added later (e.g., Settings modal), they should also call `setGlobalOverlayOpen(true/false)`. The current design is generic enough — `isGlobalOverlayOpen` is a simple boolean.
- **Tab switching while overlay is open**: If the user somehow triggers a tab switch while the overlay is open, `isBrowserVisible` remains false because `isGlobalOverlayOpen` is still true. The browser view stays hidden. When the overlay closes, `isBrowserVisible` is recalculated: if `viewMode` is no longer `"browser"`, the views stay hidden as expected.
- **Electron not running**: All Electron API calls in `BrowserTab.tsx` are already guarded by `isElectron` checks. Adding `!isGlobalOverlayOpen` to the visibility flag doesn't change non-Electron behavior.
