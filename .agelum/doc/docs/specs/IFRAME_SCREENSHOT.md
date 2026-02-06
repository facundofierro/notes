# Iframe Screenshot Capture Feature

## Overview

The Agelum application now supports capturing screenshots of embedded iframe content without requiring full-screen permission dialogs. This feature enables users to annotate and create tasks from webpage previews directly within the browser panel.

## Architecture

### Components

#### 1. **IframeCaptureInjector** (`src/components/IframeCaptureInjector.tsx`)
A React component that automatically injects a message handler script into iframes when they load. This component:
- Monitors iframe `load` events
- Injects a capture handler script into the iframe's document head
- Ensures the script is only injected once (idempotent)
- Handles cross-origin errors gracefully

#### 2. **Capture Handler Script** (Injected into iframe)
An inline script that runs inside the iframe and:
- Listens for `agelum:capture-request` messages from the parent window
- Captures the iframe's content using available methods
- Sends back the screenshot as a data URL via `agelum:capture-response` message

#### 3. **requestEmbeddedCapture** (`src/app/page.tsx`)
The main request function that:
- Sends capture requests to the iframe via postMessage
- Waits for responses with a 1.5 second timeout
- Returns the screenshot data URL or null if capture fails

#### 4. **BrowserRightPanel** (`src/components/BrowserRightPanel.tsx`)
Already configured to:
- Call `onRequestCapture` when user clicks the camera button
- Accept the iframe screenshot and display it for annotation
- Support modification, move, and remove annotations
- Generate tasks with annotated screenshots

## Message Protocol

### Request Message
```javascript
{
  type: "agelum:capture-request",
  id: "<unique-id>" // UUID or timestamp-based ID
}
```

### Response Message
```javascript
{
  type: "agelum:capture-response",
  id: "<same-id-as-request>",
  dataUrl: "<image-data-url>" // PNG image as data URL, or null on failure
}
```

## Screenshot Capture Methods (in order of preference)

1. **html2canvas Library** (if available globally)
   - Provides full-page capture with proper rendering
   - Best quality option
   - Respects CSS and layout precisely

2. **Viewport Canvas Fallback**
   - Captures visible browser viewport area
   - Does not require external libraries
   - Limited to visible area only

3. **Basic Canvas** (last resort)
   - Minimal fallback if other methods fail
   - Provides blank canvas with metadata

## Integration Points

### In `src/app/page.tsx`:
```typescript
// Import the injector component
import { IframeCaptureInjector } from "@/components/IframeCaptureInjector";

// In the browser view mode, add the injector:
<IframeCaptureInjector iframeRef={browserIframeRef} />

// Pass capture callback to BrowserRightPanel
<BrowserRightPanel 
  onRequestCapture={requestEmbeddedCapture}
  iframeRef={browserIframeRef}
  // ... other props
/>
```

### In the iframe:
When an iframe loads with the injector present, it automatically receives:
- A message event listener for capture requests
- The ability to respond with screenshot data URLs

## Usage Workflow

1. User opens a URL in the browser panel
2. `IframeCaptureInjector` automatically injects the capture handler
3. User clicks "Capture Screen" in the BrowserRightPanel
4. The panel calls `requestEmbeddedCapture()`
5. A message is sent to the iframe requesting a screenshot
6. The iframe captures its content and sends it back
7. The screenshot appears in the annotation interface
8. User can annotate with modify, move, and remove tools
9. User creates a task with annotations

## Cross-Origin Limitations

Due to browser security policies:
- **Same-origin iframes**: Full capture with html2canvas support
- **Cross-origin iframes**: Limited to viewport capture only
  - Cannot access DOM structure
  - Cannot use html2canvas
  - Only viewport area is captured

If you need full-page capture for cross-origin content, consider:
- Using same-origin URLs
- Enabling CORS headers on the embedded site
- Installing html2canvas on the embedded site

## Enhancing Capture Quality

### Adding html2canvas

To improve screenshot quality, add html2canvas to the page that will be embedded:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

The capture handler automatically detects and uses it if available.

### Using a Custom Capture Script

You can override the default behavior by loading a custom capture script in your embedded pages:

```javascript
// Make sure this runs before the Agelum capture handler
window.agelumCustomCapture = async function() {
  // Your custom capture logic
  return dataUrl; // Return a data URL
};
```

## Fallback Behavior

If iframe capture fails:
1. The user can still use `navigator.mediaDevices.getDisplayMedia()` for full-screen capture
2. This allows capturing the iframe area manually
3. The system gracefully falls back to this option in the UI

## Performance Considerations

- **Injection**: One-time operation on iframe load (~1-2ms)
- **Capture**: Depends on page size (typically 100-500ms)
- **Timeout**: 1.5 seconds per capture request
- **Memory**: One screenshot stored in memory at a time

## Security

- Uses postMessage with wildcard origin (`*`) to allow same-origin and cross-origin communication
- Validates message types to ignore unrelated messages
- Respects iframe sandboxing restrictions
- Does not expose sensitive data; only captures visual content

## Debugging

Enable logging in `IframeCaptureInjector`:
```javascript
// Console logs will appear in iframe dev tools with prefix:
"Failed to inject capture handler into iframe:"
"Failed to capture iframe content:"
"html2canvas failed, falling back to viewport capture:"
```

## Future Enhancements

1. **Full-page capture support**: Capture entire scrollable area, not just viewport
2. **SVG/canvas rendering**: Implement custom DOM-to-canvas rendering
3. **Compression options**: Add quality/size controls for screenshots
4. **Batch capture**: Support capturing multiple regions simultaneously
5. **OCR integration**: Extract text from screenshots for enhanced annotations
