---
created: 2026-02-11T17:22:00.303Z
state: pending
plan: .agelum/work/plans/chrome-plugin-1770836650628.md
---

# Chrome Plugin for Issue Reporting

Create a Chrome extension to allow customers to take screenshots, draw annotations, add text instructions, and report issues directly from any website to Agelum.

## Current "Browser Tab" Functionality

The current implementation in the `BrowserTab` component (`apps/web/src/components/tabs/BrowserTab.tsx`) provides a robust reference:

1.  **Capture Mechanism**:
    - In Electron: Uses `window.electronAPI.browserView.capture()` to get a high-quality capture of the WebContentsView.
    - In Web: Uses `navigator.mediaDevices.getDisplayMedia` for screen sharing/capture or an iframe-injector for same-origin previews.
2.  **Screenshot Viewer**:
    - Located in `apps/web/src/components/features/browser/capture/ScreenshotViewer.tsx`.
    - Uses an SVG overlay for drawing and a standard `<img>` tag for the capture.
    - **Tools**:
      - `Modify` (Orange Box): Draw a rectangle to highlight changes.
      - `Arrow` (Blue Arrow): Point to specific elements or indicate movement.
      - `Remove` (Red Box): Mark elements to be deleted.
    - **Numbering**: Each annotation is automatically assigned a unique number displayed in a badge.
3.  **Right Panel (TaskPanel)**:
    - Located in `apps/web/src/components/features/browser/panels/TaskPanel.tsx`.
    - Allows adding text prompts for each numbered annotation.
    - Supports a "General Prompt" for the entire task.
    - **Task Creation**: Combines the original screenshot, draws the annotations on a canvas (to "burn" them in), and sends the final image + markdown description to `/api/tasks`.

## Chrome Extension Implementation Strategy

### Technical Approach (Manifest V3)

1.  **SidePanel API**: Use the `chrome.sidePanel` API to replicate the Agelum right panel experience. This allows the tool to stay open while the user navigates or interacts with the page.
2.  **Screenshot Capture**: Use `chrome.tabs.captureVisibleTab` in the background script to capture the current viewport as a Data URL.
3.  **Content Script**: Injects a small UI trigger or listens for a keyboard shortcut to start the capture process.
4.  **Messaging**:
    - User clicks "Capture" in the SidePanel.
    - SidePanel sends a message to the Background Script.
    - Background Script captures the tab and sends the image back to the SidePanel.
    - SidePanel renders the `ScreenshotViewer` with the captured image.

### Technical Challenges

- **Authentication**: The extension needs to securely store an API Key or share the session cookie with the Agelum web app to authorize `POST` requests to `/api/tasks`.
- **Permissions**: Requires `activeTab`, `sidePanel`, and `storage` permissions.
- **UI Components**: Since the extension runs in a separate context, we need to ensure Tailwind and Shadcn styles are correctly bundled (likely using a build tool like Vite or Webpack for the extension).
- **Image Processing**: Replicating the "burn-in" canvas logic within the extension to generate the final annotated image before uploading.

### Project Location and Setup

1.  **Chrome Plugin**:
    - Create the project at `apps/chrome-plugin`.
    - Initialize it as a new package within the monorepo.
    - Update `pnpm-workspace.yaml` to include `apps/chrome-plugin` if it's not already covered by `apps/*`.

2.  **Backend & Website (`apps/site`)**:
    - Create a new project at `apps/site`.
    - This project will serve as the **Agelum landing page**, the **public website**, and the **central API gateway**.
    - **Responsibilities**:
      - Host the landing page and marketing content.
      - Provide the API endpoints for the Chrome Plugin to submit reports (e.g., `POST /api/v1/reports`).
      - Act as a bridge between the Chrome Plugin, the public web, and the internal Agelum notes data.
      - Handle authentication for plugin users (API Keys or shared sessions).

3.  **Monorepo Integration**:
    - Use `pnpm init` in both new directories.
    - Configure `package.json` names (e.g., `@agelum/chrome-plugin` and `@agelum/site`).
    - Leverage shared packages like `@agelum/shadcn` for UI consistency across both the site and the plugin.

### How to Achieve Drawing Over the Screenshot

To replicate the drawing experience found in the `BrowserTab`, the plugin should follow this flow:

1.  **Overlay Injection**:
    - When the user triggers "Capture & Draw", the **Background Script** captures the visible tab.
    - The **Content Script** injects a full-screen `<div>` with a high `z-index` into the target website.
    - This overlay should contain a `<canvas>` element or an SVG layer for the drawing tools.

2.  **Capturing the Context**:
    - The captured image (Data URL) from `chrome.tabs.captureVisibleTab` is set as the background of the injected overlay. This prevents the user from accidentally interacting with the underlying page while drawing.

3.  **Drawing Logic**:
    - **SVG Overlay (Recommended)**: Reuse the logic from `ScreenshotViewer.tsx`. Use an SVG layer to manage shapes (rectangles, arrows, badges) as state objects. This makes them easy to move, delete, or re-index.
    - **Event Listeners**: Attach `mousedown`, `mousemove`, and `mouseup` to the overlay to track coordinates and update the SVG/Canvas state.

4.  **Coordinate Mapping**:
    - Ensure the coordinates captured on the overlay match the dimensions of the screenshot. If the viewport is zoomed, adjustments might be necessary.

5.  **"Burning" the Annotations**:
    - Once the user finishes drawing, use a hidden `<canvas>` to:
      1. Draw the original screenshot image.
      2. Draw the SVG shapes or drawing paths on top.
    - Use `canvas.toDataURL('image/png')` to generate the final annotated image for upload.

### How to Create a Chrome Extension (Basic Steps)

1.  **Project Structure**:
    - `manifest.json`: Defines metadata, permissions, and entry points.
    - `src/sidepanel/`: React application for the right panel.
    - `src/background/`: Service worker for handling captures and API calls.
    - `src/content/`: Scripts that run in the context of the web page.
2.  **Drawing & Annotation UI**:
    - **Full-Screen Drawing Mode**: As described above, use a content script to inject the drawing interface directly into the user's active tab.
    - **Sidebar Coordination**: The SidePanel should act as the "control center", allowing the user to switch between tools (Modify, Arrow, Remove) and providing the input fields for instructions.
3.  **Development Flow**:
    - Use a bundler (Vite is recommended) to compile TypeScript/React code.
    - Load the `dist` folder into Chrome via `chrome://extensions/` (Developer Mode -> Load unpacked).
4.  **API Integration**: Use `fetch` to communicate with the Agelum backend. Ensure CORS is handled or the Agelum API allows requests from the extension's origin.
