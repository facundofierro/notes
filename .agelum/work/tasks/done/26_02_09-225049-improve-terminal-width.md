# Task: Improve Terminal Width and Auto-Detection

## Problem Description

The terminal currently shows empty space on the right side that is not being utilized. This suggests that the auto-detection of columns by `xterm-addon-fit` might not be perfectly exact, or there is a mismatch between the terminal container's width and the calculated number of columns/rows sent to the PTY.

## Observations

- In `TerminalViewer.tsx`, `FitAddon` is used to fit the terminal to its container.
- The `onResize` callback updates the `termSize` state in components like `AIRightSidebar.tsx`.
- The PTY on the backend is initialized or resized with these values.
- There is visible "dead space" on the right of the terminal content.

## Technical Details & Potential Fixes

### 1. Font Measurement Logic

The `fit()` addon calculates rows/cols by measuring a single character's width. If the font isn't loaded, it might use a system default width, leading to incorrect calculations once the monospace font finally loads.

```typescript
// Potential fix in TerminalViewer.tsx:
// Wait for document.fonts.ready before calling fit()
document.fonts.ready.then(() => {
  fitAddonRef.current?.fit();
});
```

### 2. Manual Dimension Calculation

Instead of relying solely on `fit()`, we can double-check the math:

```typescript
const container = containerRef.current;
const core = (term as any)._core;
const charWidth = core._renderService.dimensions.actualCellWidth;
const charHeight = core._renderService.dimensions.actualCellHeight;

const cols = Math.floor(container.clientWidth / charWidth);
const rows = Math.floor(container.clientHeight / charHeight);
```

### 3. CSS Buffer

Ensure that the `xterm-screen` and `xterm-viewport` are not being constrained by parent flex behaviors or unexpected margins.

## Related Files

- `apps/web/src/components/TerminalViewer.tsx` (Specifically the `useEffect` handling `FitAddon`)
- `apps/web/src/components/AIRightSidebar.tsx` (The `onResize` prop and `setTermSize` state)
- Backend PTY handler: Check where `cols` and `rows` are used in the PTY initialization.

## Implementation Steps (Plan)

- [x] Add internal padding to the terminal viewport (Done by adding `p-3` and matching background in `TerminalViewer.tsx`)
- [x] Implement `document.fonts.ready` check before fitting.
- [x] Add a small "buffer" to the width calculation to ensure it fills the space.
- [x] Debug the `onResize` synchronization between frontend and backend.
