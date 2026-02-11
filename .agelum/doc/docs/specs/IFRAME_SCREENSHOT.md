# Screenshot Capture Feature

## Overview

The Agelum application supports capturing screenshots of the browser preview for annotation and task creation. Two runtime paths are supported:

1. **Electron (WebContentsView)** — Uses `webContents.capturePage()` for pixel-perfect native screenshots.
2. **Browser fallback (iframe)** — Uses canvas-based capture via injected scripts and postMessage.

## Architecture

### Electron Path (Primary)

When running in Electron, the browser preview is a `WebContentsView` managed by the main process.

**Capture Flow:**

1. User clicks "Capture Screen" in BrowserRightPanel
2. `requestEmbeddedCapture()` detects Electron and calls `electronAPI.browserView.capture()`
3. Main process calls `webContents.capturePage()` on the WebContentsView
4. Returns a `NativeImage` converted to data URL
5. Screenshot appears in the annotation interface

**Benefits:**

- Pixel-perfect capture of the actual rendered page
- Works for any origin (no CORS issues)
- No dependency on html2canvas or canvas hacks
- Fast (~50-100ms)

### Browser Fallback Path (iframe)

When not running in Electron, the iframe-based capture is used.

#### IframeCaptureInjector (`src/components/IframeCaptureInjector.tsx`)

React component that injects a capture handler script into iframes. Only rendered when `!isElectron`.

#### requestEmbeddedCapture (`src/app/page.tsx`)

Sends `agelum:capture-request` via postMessage, waits for `agelum:capture-response` with 1.5s timeout.

#### Capture Methods (iframe, in order of preference)

1. **html2canvas** — Full page capture if the library is available
2. **Viewport Canvas** — Captures visible area only
3. **Basic Canvas** — Blank canvas with metadata as last resort

## Annotation System

After capturing a screenshot, users can annotate it with three types of markups:

### Annotation Types

1. **Modify (Orange)** — Box annotation to mark content that needs to be changed
2. **Arrow (Blue)** — Directional arrow to point to specific elements (drawn from click point A to point B)
3. **Remove (Red)** — Box annotation to mark content for deletion

### Annotation Workflow

1. User captures screenshot → Full-screen modal opens with centered screenshot
2. User selects annotation tool (Modify/Arrow/Remove)
3. User draws on screenshot:
   - **Boxes**: Click and drag to create rectangle (minimum 5x5 pixels)
   - **Arrows**: Click start point, drag to end point (minimum 10px distance), renders with arrowhead
4. Live preview shows dashed outline while drawing
5. Annotation badges appear with sequential numbering
6. User can select any annotation to edit its prompt/instructions
7. Click "Create Task" to save screenshot with all annotations

### Full-Size Modal Interface

When a screenshot is captured, a full-screen modal appears with:

- **Dark overlay background** (black/90 opacity) for focus
- **Centered screenshot** displayed at maximum size (maintains aspect ratio)
- **SVG overlay** for real-time annotation rendering
- **Toolbar at bottom** with Modify/Arrow/Remove buttons
- **Action buttons** for Cancel and Create Task
- **Badge numbers** on each annotation (1, 2, 3, etc.) for reference

### Prompt Sidebar

While the modal is open, the right panel shows an **AnnotationPromptList**:

- **Expandable list** of all annotations
- **Type indicator** with color coding (orange/blue/red badges)
- **Selection sync** — clicking annotation in list highlights it on screenshot
- **Editable prompt field** for instructions on each annotation
- **Delete button** to remove annotations

### Annotation Data Structure

Each annotation stores:

- `id`: Unique sequential number
- `type`: "modify" | "arrow" | "remove"
- `x`, `y`: Start coordinates (in screenshot pixel space)
- `width`, `height`: Dimensions for boxes (undefined for arrows)
- `endX`, `endY`: End coordinates for arrows only
- `prompt`: User's instructions for the annotation

## Usage Workflow

### Electron

1. User opens a URL in the browser panel
2. URL is loaded in a WebContentsView via IPC
3. User clicks "Capture Screen"
4. Native `capturePage()` returns pixel-perfect screenshot
5. Full-screen annotation modal opens
6. User adds annotations using Modify/Arrow/Remove tools
7. User edits prompts in the right sidebar list
8. User clicks "Create Task" to finalize

### Browser (non-Electron)

1. User opens a URL in the browser panel (loads in iframe)
2. `IframeCaptureInjector` injects capture handler
3. User clicks "Capture Screen"
4. postMessage protocol captures iframe content
5. Full-screen annotation modal opens
6. User adds annotations using Modify/Arrow/Remove tools
7. User edits prompts in the right sidebar list
8. User clicks "Create Task" to finalize

## Cross-Origin Considerations

- **Electron**: No CORS issues. `capturePage()` captures the rendered pixels regardless of origin.
- **iframe (same-origin)**: Full capture with html2canvas support
- **iframe (cross-origin)**: Limited to basic viewport capture

## Task Creation & Export

When user clicks "Create Task" from the annotation modal:

1. **Screenshot compositing**: Original screenshot is rendered to canvas with annotations overlaid:
   - **Modify boxes**: Orange outline (2px) with transparent fill
   - **Remove boxes**: Red outline (2px) with "REMOVE THIS" label, transparent red fill
   - **Arrows**: Blue line with arrowhead pointing to target, numbered badge at end
   - **Badge numbers**: Numbered circles (1, 2, 3, etc.) positioned at annotation corners

2. **Screenshot storage**: Composite image saved as PNG to `.agelum/work/tasks/images/`

3. **Task markdown**: Task description includes:
   - Screenshot image reference with markdown
   - Annotations table with columns: # | Action | Prompt
   - Action labels: MODIFY, ARROW, REMOVE
   - User's prompt text for each annotation

4. **Task state**: Tasks created with "priority" state

## Performance

- **Electron capture**: ~50-100ms (native Chromium capture)
- **iframe injection**: One-time on load (~1-2ms)
- **iframe capture**: 100-500ms depending on page size
- **Modal annotation drawing**: Real-time SVG rendering, negligible latency
- **Canvas export**: ~200-500ms depending on annotation count and screenshot size
- **Memory**: One screenshot + annotations stored in state at a time

## Implementation Files

### Capture & Screenshot Management

- `apps/electron/src/main.js` — `browser-view:capture` IPC handler using `capturePage()`
- `apps/electron/src/preload.js` — `browserView.capture()` IPC channel
- `src/app/page.tsx` — `requestEmbeddedCapture()` with Electron/iframe dual path
- `src/components/IframeCaptureInjector.tsx` — iframe capture injection (fallback only)

### Annotation Interface & Components

- `src/components/BrowserRightPanel.tsx` — Main panel with screenshot capture, modal trigger, and state management
- `src/components/ScreenshotAnnotationModal.tsx` — Full-screen modal with annotation canvas, SVG overlay, and drawing tools
- `src/components/AnnotationPromptList.tsx` — Expandable list of annotations in right sidebar for prompt editing

### Annotation Features

- **SVG rendering**: Real-time annotation preview (boxes and arrows with arrowheads)
- **Live preview**: Dashed outlines while drawing before confirmation
- **Canvas export**: Annotations rendered onto final screenshot for task creation
- **Selection sync**: Clicking annotations in list highlights them on screenshot and vice versa
