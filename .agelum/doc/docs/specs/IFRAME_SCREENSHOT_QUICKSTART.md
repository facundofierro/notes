# Iframe Screenshot Capture - Quick Start

## What's New?

You can now capture screenshots of webpages embedded in the browser panel without needing permission dialogs. The captured screenshots can be annotated and turned into tasks.

## How to Use

### 1. Open the Browser Panel
- Go to the "Browser" view in the main navigation
- Enter a URL (any website or your local app)

### 2. Capture a Screenshot
- Click the camera icon in the right panel
- The screenshot will be captured directly from the iframe
- No permission dialog will appear

### 3. Annotate the Screenshot
- Use the toolbar buttons to add annotations:
  - **Modify** (orange box): Mark areas that need changes
  - **Move** (blue circle): Mark areas to move
  - **Remove** (red box): Mark areas to delete

### 4. Create a Task
- Click on an annotation to add instructions
- Click "Create Task" to save with annotations
- The task will include your annotated screenshot

## Technical Details

### What Happens Behind the Scenes

1. When you load a URL, a special script is automatically injected into the iframe
2. When you click "Capture Screen", a message is sent to the iframe asking for a screenshot
3. The iframe captures its content and sends it back
4. The screenshot appears in the annotation interface

### Supported Capture Methods

The system tries these methods in order:
1. **html2canvas** - Best quality if available
2. **Canvas viewport capture** - Default fallback
3. **Basic fallback** - Last resort

### For Better Screenshots

Add this to pages you want to embed for best quality:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

## Common Scenarios

### Scenario 1: Capturing Your Local App
```
1. Start your app (e.g., npm run dev)
2. Get the URL (usually http://localhost:3000 or similar)
3. Enter it in the browser panel
4. Click capture - no permissions needed!
```

### Scenario 2: Capturing External Websites
```
1. Enter any website URL
2. The iframe will show the website
3. Click capture to get a screenshot
4. Note: Full-page capture may be limited by browser security
```

### Scenario 3: Falls Back to Display Capture
If the iframe capture fails for any reason:
1. The "Capture Screen" button can still use full-screen capture
2. Use `navigator.mediaDevices.getDisplayMedia()` (may show permission dialog)
3. You can then annotate the full screen

## Troubleshooting

### Screenshot is blank or shows placeholder text
**Cause**: html2canvas not available and viewport capture used
**Solution**:
- Add html2canvas library to your embedded page
- Or make sure content is in the visible viewport

### Capture takes too long or times out
**Cause**: Large page or performance issues
**Solution**:
- Try scrolling the iframe to show the area you want
- Wait for the page to fully load
- Reduce page complexity if possible

### Cross-origin errors in console
**Cause**: Iframe and parent are from different origins
**Solution**:
- This is expected and safe
- Viewport capture will still work
- Full-page capture may be limited

### Script injection failed message
**Cause**: Browser or iframe security policy
**Solution**:
- Check browser console for details
- Ensure iframe allows scripts
- Try a different URL

## File Structure

New files added:
```
apps/web/src/
├── components/
│   └── IframeCaptureInjector.tsx    # Injects capture handler into iframes
└── lib/
    └── iframe-capture.ts             # Capture handler logic (reference)

public/
└── iframe-capture.js                 # Standalone capture script (reference)
```

Modified files:
```
apps/web/src/app/page.tsx               # Added injector component
```

## API Reference

### IframeCaptureInjector Props
```typescript
interface IframeCaptureInjectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
}
```

### Message Format
```javascript
// Request
{
  type: "agelum:capture-request",
  id: "uuid-or-timestamp"
}

// Response
{
  type: "agelum:capture-response",
  id: "same-as-request",
  dataUrl: "data:image/png;base64,..." // or null on failure
}
```

## Performance Tips

1. **Faster captures**: Keep pages simple and avoid animations
2. **Better quality**: Load html2canvas library in target pages
3. **Smooth experience**: Ensure your app loads quickly before capturing
4. **Memory efficient**: Only one screenshot stored in memory

## Browser Support

- ✅ Chrome/Chromium (all versions with iframe support)
- ✅ Firefox (all versions)
- ✅ Safari (all modern versions)
- ✅ Edge (Chromium-based)

## Next Steps

1. Try capturing different types of pages
2. Test the annotation tools
3. Create tasks from your annotations
4. Check out IFRAME_SCREENSHOT.md for advanced usage
