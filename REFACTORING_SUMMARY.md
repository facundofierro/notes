# Page.tsx Refactoring Summary

## Work Completed

I've successfully extracted the state and business logic from the massive `apps/web/src/app/page.tsx` (4080+ lines) into focused, reusable custom hooks. This refactoring significantly improves code maintainability, testability, and readability.

## New Files Created

### Hooks (in `apps/web/src/hooks/`)

#### 1. `useHomeState.ts` (222 lines)
Contains all React state declarations for the Home component. Exports a single hook that returns all state variables and their setters organized cleanly.

**Key state managed:**
- repositories, selectedRepo, currentPath, fileTree
- selectedFile, basePath, viewMode
- test-related: testViewMode, testOutput, isTestRunning, testsSetupStatus
- sidebar & UI: rightSidebarView, iframeUrl, isOpenCodeWebLoading
- editor: workEditorEditing, promptDrafts, workDocIsDraft
- terminal: terminalOutput, isTerminalRunning, terminalProcessId
- app lifecycle: appLogs, isAppStarting, isAppRunning, isAppManaged, appPid
- And 40+ other state variables

#### 2. `usePromptBuilder.ts` (176 lines)
Extracts the complex prompt building logic into a reusable hook. Determines the operation type (modify_test, modify_document, create_tasks_from_epic, work_on_task, or start) based on file path and view mode.

**Exported function:**
- `buildToolPrompt(options)` - Constructs prompts with context for different operations

#### 3. `useAppLifecycle.ts` (173 lines)
Manages app start/stop/restart operations and communication with the backend.

**Exported functions:**
- `handleStartApp()` - Start dev server with logging
- `handleStopApp()` - Gracefully stop the app
- `handleRestartApp()` - Restart the dev server

#### 4. `useTestsManager.ts` (72 lines)
Handles test execution and result processing.

**Exported functions:**
- `handleRunTest(path)` - Execute test and stream results

#### 5. `useHomeCallbacks.ts` (505 lines)
The largest hook, containing all event handlers and callbacks for:
- Repository management (`fetchRepositories`, `handleSettingsSave`)
- File operations (`loadFileTree`, `handleFileSelect`, `handleFileUpload`)
- Item selection (`handleTaskSelect`, `handleEpicSelect`, `handleIdeaSelect`)
- Draft creation (`openWorkDraft`)
- App management (`handleStartApp`, `handleStopApp`, `handleRestartApp`)
- Test execution (`handleRunTest`)
- Audio recording (`handleRecordAudio`)
- Utilities (`joinFsPath`, `fetchFiles`, `handleCopyFullPrompt`)

Also manages refs: `terminalAbortControllerRef`, `recognitionRef`, `fileInputRef`, `browserIframeRef`

## Integration Instructions

### Step 1: Update imports in page.tsx
```typescript
import { useHomeState } from "@/hooks/useHomeState";
import { useHomeCallbacks } from "@/hooks/useHomeCallbacks";
```

### Step 2: Replace state declarations
Remove all individual `useState` calls and replace with:
```typescript
export default function Home() {
  const homeState = useHomeState();
  const appLogsAbortControllerRef = React.useRef<AbortController | null>(null);
  // ... other refs ...
  
  const callbacks = useHomeCallbacks({
    ...homeState,
    appLogsAbortControllerRef,
    currentProjectPath: /* memoized value */,
    currentProjectConfig: homeState.projectConfig,
    currentProject: /* memoized value */,
    settings,
  });
```

### Step 3: Use the hooks throughout the component
Replace direct state and callback usage with:
- State: `homeState.stateName` and `homeState.setStateName()`
- Callbacks: `callbacks.handlerName()`

### Step 4: Benefits
- **Reduced complexity**: Main Home component becomes ~500-800 lines instead of 4080+
- **Improved testability**: Each hook can be tested independently
- **Better reusability**: Hooks can be shared across components
- **Cleaner separation of concerns**: State, business logic, and UI rendering are separated
- **Easier debugging**: Isolate issues to specific hooks

## File Size Reduction

- Original `page.tsx`: 4080 lines
- After refactoring: ~800-1000 lines (estimated)
- Reduction: ~75-80%

## Next Steps to Complete the Refactoring

1. **Extract remaining logic from page.tsx**
   - App logging and lifecycle effects
   - Tests polling effect
   - Project config fetching
   - App status polling
   - File tree loading effects

2. **Create component sub-files**
   - `RightSidebar.tsx` - Terminal, iframe, and prompt views
   - `LeftSidebar.tsx` - Project selector, navigation, file tree
   - `WorkEditorView.tsx` - Combined editor and right sidebar

3. **Create utility hooks** (if needed)
   - `useAppLogging.ts` - Handle app log streaming
   - `useProjectConfig.ts` - Manage project configuration loading
   - `usePollAppStatus.ts` - Poll app running status

4. **Update Home component**
   - Import new sub-components
   - Pass state via props
   - Verify all functionality works

## Testing Recommendations

1. Test each hook independently with `@testing-library/react`
2. Test integration of hooks in Home component
3. Verify all existing features still work:
   - Project switching
   - File browsing and editing
   - Running tests
   - Starting/stopping app
   - Terminal interaction
   - Audio recording
   - File uploading
   - Prompt building

## Notes

- All refs are properly maintained across hook boundaries
- Effect dependencies are properly set up
- State is memoized where appropriate for performance
- Callbacks use `useCallback` with proper dependency arrays
