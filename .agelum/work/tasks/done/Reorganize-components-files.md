---
created: 2026-02-08T15:38:05.441Z
state: done
---

# Reorganize-components-files

## Objective

Better organize the components in `apps/web/src/components` to improve maintainability and discoverability as the project grows.

## Plan

1.  **Analyze & Categorize**: Group current components into logical domains (Layout, Features, Shared, etc.).
2.  **Define Structure**: Create a hierarchical folder structure that reflects these domains.
3.  **Iterative Migration**: Move components into the new structure one domain at a time, ensuring all imports are updated and the application remains functional.
4.  **Consolidate**: Identify and merge any duplicate or closely related components.
5.  **Standardize**: Ensure each component folder follows a consistent pattern (e.g., `index.ts` for exports if needed, sub-components in sub-folders).

## Proposed Structure

```text
apps/web/src/components/
├── layout/                 # High-level layout components
│   ├── Header.tsx
│   ├── AIRightSidebar.tsx
│   └── AgentExecutionStatus.tsx
├── features/               # Domain-specific features
│   ├── browser/            # Browser integration and panels
│   │   ├── panels/         # (Console, Network, Performance, etc.)
│   │   ├── capture/        # IframeCapture, Screenshot components
│   │   └── BrowserRightPanel.tsx
│   ├── kanban/             # All Kanban board variations
│   │   ├── EpicsKanban.tsx
│   │   ├── IdeasKanban.tsx
│   │   ├── TaskKanban.tsx
│   │   └── TestKanban.tsx
│   ├── work/               # Editor and document management
│   │   ├── WorkEditor.tsx
│   │   ├── WorkEditorTab.tsx
│   │   └── AnnotationPromptList.tsx
│   ├── git/                # Git and PR management
│   ├── settings/           # Configuration and settings
│   ├── file-system/        # File exploration
│   │   ├── FileBrowser.tsx
│   │   └── FileViewer.tsx
│   ├── terminal/           # Terminal and logs
│   │   └── TerminalViewer.tsx
│   └── testing/            # Test execution and reporting
│       ├── TestResults.tsx
│       └── TestSteps.tsx
├── shared/                 # Common components used across features
│   ├── DirectoryPicker.tsx
│   ├── DiskUsageChart.tsx
│   └── ProjectSelector.tsx
└── tabs/                   # Main application tab views
```

## Mapping (Draft)

- **Layout**: `Header`, `AIRightSidebar`, `AgentExecutionStatus`.
- **Browser**: `browser-panel/*`, `IframeCaptureInjector`, `ScreenshotAnnotationModal`, `ScreenshotViewer`, `BrowserRightPanel`.
- **Kanban**: `EpicsKanban`, `IdeasKanban`, `TaskKanban`, `TestKanban`.
- **Work**: `WorkEditor`, `WorkEditorTab`, `AnnotationPromptList`.
- **FileSystem**: `FileBrowser`, `FileViewer`.
- **Shared**: `DirectoryPicker`, `DiskUsageChart`, `ProjectSelector`.
- **Terminal**: `TerminalViewer`.
- **Testing**: `TestResults`, `TestSteps`.
- **Tabs**: `tabs/*`.
- **Git**: `git/*`.
- **Settings**: `SettingsDialog`, `settings/*`.
