# Element Selection Implementation

## Overview

This document describes the implementation of element selection in the browser preview panel. The system supports two runtime paths:

1. **Electron (WebContentsView)** — Uses `webContents.executeJavaScript()` for full cross-origin element picking and style modification. This is the primary path.
2. **Browser fallback (iframe)** — Uses direct DOM access for same-origin iframes and postMessage for cross-origin. This is the fallback when not running in Electron.

## Architecture

### Electron Path (WebContentsView)

When running inside Electron, the browser preview is rendered as a `WebContentsView` managed by the main process (`apps/electron/src/main.js`). The renderer communicates with it via IPC channels exposed through `window.electronAPI.browserView`.

**Element Picker Flow:**

1. User clicks "Pick Element" in BrowserRightPanel
2. `electronBrowserView.executeJs()` injects a one-shot click listener into the WebContentsView
3. Cursor changes to crosshair in the previewed page
4. User clicks an element → the injected script serializes it (selector, tagName, textSnippet, computed styles, cssText)
5. The serialized result is returned as the resolved value of `executeJs()`
6. BrowserRightPanel populates the properties panel with the result
7. User presses ESC → the promise resolves with `null`, cancelling the picker

**Style Modification Flow:**

1. User edits a property (color, padding, etc.) in the Properties tab
2. `applyStyleChange()` calls `electronBrowserView.executeJs()` to apply the style change to the selected element via its CSS selector
3. The script returns the previous and updated values for change tracking
4. CSS tab edits similarly use `executeJs()` to set `element.style.cssText`

**Key Benefits:**

- Works on any origin (no CORS restrictions)
- Full computed style access for all elements
- Native screenshot via `webContents.capturePage()`
- No script injection or postMessage protocols needed

### Browser Fallback Path (iframe)

#### iframe-element-picker.ts

Library providing utilities for serializing elements and communicating between parent and iframe windows.

- `serializeElement()`: Converts DOM elements to serializable objects
- `setupIframeElementPicker()`: Sets up element picker listener in iframe
- Element selector generation with intelligent prioritization (data attributes > IDs > classes > tag selectors)

#### IframeCaptureInjector.tsx

React component that injects capture and element picker scripts into iframes (only used when `!isElectron`).

#### BrowserRightPanel.tsx — Iframe Mode

**Mode 1: Direct DOM Access (Same-origin iframes)**

- Accesses iframe's contentDocument directly
- Provides real-time hover overlay
- Updates element properties immediately

**Mode 2: PostMessage API (Cross-origin iframes)**

- Uses postMessage for communication
- Falls back when direct access fails
- Limited to element info (no live overlay)

## Element Selection Flow

### Electron Flow

```
User clicks "Pick Element"
→ executeJs() injects click listener in WebContentsView
→ Cursor changes to crosshair
→ User clicks element
→ Script serializes element + computed styles
→ Promise resolves with full element info
→ Properties populated immediately (all origins)
```

### Same-Origin iframe Flow (non-Electron)

```
User clicks "Pick Element"
→ toggleElementPicker() activated
→ tryGetIframeDocument() succeeds
→ Mouse move listeners track element
→ Hover overlay updates
→ User clicks element
→ Direct element reference obtained
→ Properties populated immediately
```

### Cross-Origin iframe Flow (non-Electron)

```
User clicks "Pick Element"
→ toggleElementPicker() activated
→ tryGetIframeDocument() fails (CORS)
→ requestIframeElementPick() sends message
→ Iframe enters picker mode (crosshair cursor)
→ User clicks element in iframe
→ Iframe sends agelum:pick-response
→ Parent receives serialized element info
→ Element selector displayed
→ Can add to prompt (selector only, no styling)
```

## Selector Generation

Elements are identified using this priority:

1. **Data Attributes** (most specific)
   - `data-testid="..."`
   - `data-test="..."`
   - `data-qa="..."`

2. **ID Selector**
   - `#elementId`

3. **Class Selector**
   - `.class1.class2` (up to 2 classes)

4. **Tag-based Selector** (most generic)
   - `tag:nth-of-type(n)`
   - `tag` (if only instance)

## Security Considerations

- **Electron path**: `executeJavaScript()` runs code in the WebContentsView's context. The view is sandboxed (`sandbox: true`) with no node integration.
- **postMessage wildcard**: Uses `"*"` origin in postMessage for iframe fallback (acceptable for internal use)
- **User-initiated selection**: Element picking is always user-triggered

## Usage

### In Electron

1. Click "Pick Element" button in Properties tab
2. Cursor changes to crosshair in the WebContentsView
3. Click any element (works for all origins)
4. Element info + computed styles populated in sidebar
5. Edit properties — changes applied via `executeJs()`

### In Browser (non-Electron)

1. Click "Pick Element" button in Properties tab
2. For same-origin preview: hover to see highlight, click to select
3. For cross-origin preview: cursor changes to crosshair, click element, selector displayed

## Limitations

### Electron Path

- No live hover overlay (single click-to-select)
- Element reference is selector-based (re-queried on each style change)

### iframe Fallback

- Cross-origin styling not possible (browser security)
- Live overlay only for same-origin
- Element references lost for cross-origin selections

## Files

- `apps/electron/src/main.js` — WebContentsView management + IPC handlers
- `apps/electron/src/preload.js` — Exposes `browserView` IPC channels
- `src/types/electron.d.ts` — TypeScript types for Electron API
- `src/components/BrowserRightPanel.tsx` — Dual-path element picker + style editor
- `src/app/page.tsx` — Electron/iframe dual-path browser view rendering
- `src/lib/iframe-element-picker.ts` — Library for iframe fallback
- `src/components/IframeCaptureInjector.tsx` — Iframe script injection (fallback only)
