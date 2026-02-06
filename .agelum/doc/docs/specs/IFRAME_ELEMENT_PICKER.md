# iframe Element Selection Implementation

## Overview

This document describes the implementation of element selection in iframes with Electron support. The system allows users to select and modify elements within iframes, including cross-origin iframes, using a fallback postMessage-based approach.

## Architecture

The implementation consists of three main components:

### 1. iframe-element-picker.ts
Library providing utilities for serializing elements and communicating between parent and iframe windows.

**Key Features:**
- `serializeElement()`: Converts DOM elements to serializable objects
- `setupIframeElementPicker()`: Sets up element picker listener in iframe
- Element selector generation with intelligent prioritization (data attributes > IDs > classes > tag selectors)

**Message Protocol:**
- `agelum:pick-request`: Parent requests iframe to enter picker mode
- `agelum:pick-response`: Iframe sends selected element info back to parent
- `agelum:pick-cancel`: User cancels picking (ESC key)

### 2. IframeCaptureInjector.tsx
React component that injects both capture and element picker scripts into iframes.

**Features:**
- Injects capture handler for screenshots
- Injects element picker handler for cross-origin element selection
- Gracefully handles injection errors
- Supports both same-origin and cross-origin iframes

**Injected Capabilities:**
- `agelum:capture-request/response`: Screenshot capture protocol
- `agelum:pick-request/response/cancel`: Element picking protocol
- Automatic cleanup on picker mode exit

### 3. BrowserRightPanel.tsx
React component managing the UI for element selection and modification.

**Dual-Mode Element Selection:**

#### Mode 1: Direct DOM Access (Same-origin iframes)
- Accesses iframe's contentDocument directly
- Provides real-time hover overlay
- Updates element properties immediately
- Maintains element references for CSS/property editing

#### Mode 2: PostMessage API (Cross-origin iframes)
- Uses postMessage for communication
- Falls back when direct access fails
- Limited to element info (no live overlay)
- Cursor changes to "crosshair" in iframe
- User clicks element, info sent back to parent
- ESC key cancels picker

**Integration:**
- `tryGetIframeDocument()`: Attempts direct DOM access (memoized)
- `requestIframeElementPick()`: Initiates postMessage picker (memoized)
- `updateOverlayForElement()`: Updates visual highlights (memoized)
- `ensureOverlay()`: Creates overlay elements (memoized)
- `insertPromptReference()`: Adds element selector to prompt (memoized)

### 4. Electron Integration
Main Electron process supports iframe frames via webFrameMain.

**Features:**
- `did-frame-navigate` event handler
- Injects setup code into frames
- Prepared for future frame-specific operations
- Gracefully handles inaccessible frames

## Element Selection Flow

### Same-Origin Flow
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

### Cross-Origin Flow
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

- **postMessage wildcard**: Uses `"*"` origin in postMessage (acceptable for internal Electron app)
- **No cross-origin data exposure**: Only sends element selector and tag info
- **Same-origin policy respected**: Automatically falls back when blocked
- **User-initiated selection**: Element picking is user-triggered, not automatic

## Usage Example

### In the Browser Panel

1. Click "Pick Element" button in Properties tab
2. For same-origin preview:
   - Hover over elements to see highlight
   - Click to select
   - Edit properties in sidebar
3. For cross-origin preview:
   - Cursor changes to crosshair
   - Click element to select
   - Selector displayed
   - Can add to prompt (reference only)

### Programmatic API

```typescript
// Library exports
import { 
  serializeElement, 
  setupIframeElementPicker,
  SerializedElement,
  ElementPickerMessage 
} from '@/lib/iframe-element-picker';

// In iframe:
setupIframeElementPicker();

// In parent:
iframe.contentWindow.postMessage({
  type: 'agelum:pick-request',
  id: 'unique-id'
}, '*');

// Listen for response:
window.addEventListener('message', (event) => {
  if (event.data.type === 'agelum:pick-response') {
    const element = event.data.element as SerializedElement;
    // Use element.selector, element.tagName, element.textSnippet
  }
});
```

## Limitations and Known Issues

1. **Cross-origin styling**: Cannot modify styles for cross-origin elements (browser security)
2. **Live overlay**: Only works for same-origin iframes
3. **Element references**: Lost for cross-origin selections (cannot track DOM updates)
4. **Frame nesting**: Complex nested frames work via postMessage chain
5. **Performance**: Overlay updates use getBoundingClientRect (repaint-heavy)

## Future Enhancements

1. Add MutationObserver for dynamic element tracking
2. Support frame hierarchy visualization
3. Cache element selectors for performance
4. Add element search/filter in picker mode
5. Support pseudo-elements (::before, ::after) selection
6. Add element screenshot capture in picker mode
7. Support relative selectors (e.g., "parent > child")

## Testing

To test iframe element selection:

1. **Same-origin**: Use localhost preview (http://localhost:3000)
2. **Cross-origin**: Use external preview (https://example.com)
3. Verify picker mode activation
4. Test hover overlay (same-origin only)
5. Test element serialization
6. Test selector generation accuracy
7. Test cross-origin fallback

## Files Modified

- `src/lib/iframe-element-picker.ts` (new)
- `src/components/IframeCaptureInjector.tsx` (updated)
- `src/components/BrowserRightPanel.tsx` (updated)
- `apps/electron/src/main.js` (updated)
