---
created: 2026-02-11T17:22:00.303Z
state: pending
---

# Chrome Plugin for Issue Reporting

Create a Chrome extension to allow customers to take screenshots, draw annotations, add text instructions, and report issues directly from any website to Agelum.

## Current "Browser Tab" Functionality

The current implementation in the `BrowserTab` component (`apps/web/src/components/tabs/BrowserTab.tsx`) provides a robust reference:

1.  **Capture Mechanism**:
    *   In Electron: Uses `window.electronAPI.browserView.capture()` to get a high-quality capture of the WebContentsView.
    *   In Web: Uses `navigator.mediaDevices.getDisplayMedia` for screen sharing/capture or an iframe-injector for same-origin previews.
2.  **Screenshot Viewer**:
    *   Located in `apps/web/src/components/features/browser/capture/ScreenshotViewer.tsx`.
    *   Uses an SVG overlay for drawing and a standard `<img>` tag for the capture.
    *   **Tools**:
        *   `Modify` (Orange Box): Draw a rectangle to highlight changes.
        *   `Arrow` (Blue Arrow): Point to specific elements or indicate movement.
        *   `Remove` (Red Box): Mark elements to be deleted.
    *   **Numbering**: Each annotation is automatically assigned a unique number displayed in a badge.
3.  **Right Panel (TaskPanel)**:
    *   Located in `apps/web/src/components/features/browser/panels/TaskPanel.tsx`.
    *   Allows adding text prompts for each numbered annotation.
    *   Supports a "General Prompt" for the entire task.
    *   **Task Creation**: Combines the original screenshot, draws the annotations on a canvas (to "burn" them in), and sends the final image + markdown description to `/api/tasks`.

## Chrome Extension Implementation Strategy

### Technical Approach (Manifest V3)

1.  **SidePanel API**: Use the `chrome.sidePanel` API to replicate the Agelum right panel experience. This allows the tool to stay open while the user navigates or interacts with the page.
2.  **Screenshot Capture**: Use `chrome.tabs.captureVisibleTab` in the background script to capture the current viewport as a Data URL.
3.  **Content Script**: Injects a small UI trigger or listens for a keyboard shortcut to start the capture process.
4.  **Messaging**:
    *   User clicks "Capture" in the SidePanel.
    *   SidePanel sends a message to the Background Script.
    *   Background Script captures the tab and sends the image back to the SidePanel.
    *   SidePanel renders the `ScreenshotViewer` with the captured image.

### Technical Challenges

*   **Authentication**: The extension needs to securely store an API Key or share the session cookie with the Agelum web app to authorize `POST` requests to `/api/tasks`.
*   **Permissions**: Requires `activeTab`, `sidePanel`, and `storage` permissions.
*   **UI Components**: Since the extension runs in a separate context, we need to ensure Tailwind and Shadcn styles are correctly bundled (likely using a build tool like Vite or Webpack for the extension).
*   **Image Processing**: Replicating the "burn-in" canvas logic within the extension to generate the final annotated image before uploading.

### How to Create a Chrome Extension (Basic Steps)

1.  **Project Location**:
    *   Create a new directory at `apps/chrome-extension` in the monorepo.
    *   This ensures it follows the project's structure alongside `apps/web` and `apps/electron`.
2.  **Project Structure**:
    *   `manifest.json`: Defines metadata, permissions, and entry points.
    *   `src/sidepanel/`: React application for the right panel.
    *   `src/background/`: Service worker for handling captures and API calls.
    *   `src/content/`: Scripts that run in the context of the web page.
3.  **Drawing & Annotation UI**:
    *   **Full-Screen Drawing Mode**: To provide a better drawing experience, the plugin can expand the `sidePanel` or, more effectively, inject a full-screen overlay into the current webpage (`src/content/`) when the user enters "Drawing Mode".
    *   **Sidebar Expansion**: Alternatively, investigate if `chrome.sidePanel.setOptions` can be used to dynamically change the width or if we should use a custom-injected `<iframe>` instead of the official SidePanel API to have more control over the "expansion" to full screen.
    *   **Reuse Components**: Try to reuse `ScreenshotViewer.tsx` and `TaskPanel.tsx` from `apps/web` by moving them to a shared package or carefully importing them if the build system allows.
4.  **Development Flow**:
    *   Use a bundler (Vite is recommended) to compile TypeScript/React code.
    *   Load the `dist` folder into Chrome via `chrome://extensions/` (Developer Mode -> Load unpacked).
5.  **API Integration**: Use `fetch` to communicate with the Agelum backend. Ensure CORS is handled or the Agelum API allows requests from the extension's origin.

