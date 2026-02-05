---
title: Complete Browser Right Bar Implementation
state: pending
created: 2026-02-05T14:15:00.000Z
---

# Complete Browser Right Bar Implementation

The initial implementation of the Browser Right Bar is a skeleton. We need to complete the following features to make it fully functional.

## 1. Screen Mode: Robust Image Generation

We need to ensure that the annotations made in the UI are correctly captured and saved with the screenshot.

- [ ] **Coordinate Mapping**: Implement scaling logic in `handleCreateTask` to map UI coordinates (relative to the preview image) to absolute coordinates on the original screenshot resolution.
- [ ] **Composite Image**: Use a hidden canvas to draw the screenshot and then overlay the annotations (shapes, numbers, "REMOVE THIS" labels) before saving.
- [ ] **Image Storage**: Ensure the image is saved to `.agelum/work/tasks/images/` and the markdown task file correctly references it using a relative path.
- [ ] **Task Content**: The task `.md` file should include a table or list summarizing each annotation number and its associated prompt.

## 2. Properties Mode: Visual CSS Editor

Currently, this is a placeholder. It should allow developers to tweak styles and see changes in real-time.

- [ ] **Element Picker**: Implement a tool that, when active, allows clicking an element inside the iframe to select it.
- [ ] **Iframe Interaction**: Handle cross-origin restrictions if possible, or provide a fallback if the app is Same-Origin (Agelum usually runs alongside the app).
- [ ] **Props Tab**: Create a UI to edit common TailWind/CSS properties (Colors, Padding, Font Size, Visibility).
- [ ] **CSS Tab**: Integrated code editor (monaco/codemirror) to edit the selected element's `style` attribute or CSS rules.
- [ ] **Changes History**: Track every modification made during the session so they can be exported as part of the task.

## 3. Prompt Mode: Element Referencing

Enhance the prompt creation by allowing direct references to DOM elements.

- [ ] **Select Element Tool**: Similar to the one in Properties mode, but specifically to insert a reference (e.g., `#element-id` or `.class-name`) into the current cursor position of the prompt textarea.
- [ ] **Visual Feedback**: Highlight the selected element in the iframe when hovering/selecting.

## 4. General UX & Integration

- [ ] **Cancellation**: Ensure the "Cancel" button correctly cleans up the current state (screenshot, annotations).
- [ ] **Mutual Exclusion**: Disable the other 2 methods once one has started (screenshot taken or element selection active).
- [ ] **Prop Drilling**: Update `page.tsx` to pass the `projectPath` to `BrowserRightPanel` so it can resolve absolute paths for file saving.

## Related Files

- `apps/web/src/components/BrowserRightPanel.tsx` (Main UI & Logic)
- `apps/web/src/app/page.tsx` (Integration & Props)
- `apps/web/src/app/api/tasks/route.ts` (Task creation backend)
- `apps/web/src/app/api/file/route.ts` (File storage backend)
