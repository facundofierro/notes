import * as React from "react";
import FileBrowser from "@/components/FileBrowser";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
}

type TestsSetupState =
  | "missing"
  | "initializing"
  | "installing"
  | "ready"
  | "error";

interface TestsSetupStatus {
  state: TestsSetupState;
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

interface TestsTabProps {
  fileTree: FileNode | null;
  currentPath: string;
  basePath: string;
  selectedFile: {
    path: string;
    content: string;
  } | null;
  testsSetupStatus: TestsSetupStatus | null;
  isSetupLogsVisible: boolean;
  renderWorkEditor: (opts: {
    onBack: () => void;
    onRename?: (
      newTitle: string,
    ) => Promise<{
      path: string;
      content: string;
    } | void>;
  }) => React.ReactNode;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onRefresh: () => void;
  onRunTest: (path: string) => void;
  onSetupLogsVisibleChange: (
    visible: boolean,
  ) => void;
  onBack: () => void;
  onRename?: (
    newTitle: string,
  ) => Promise<{
    path: string;
    content: string;
  } | void>;
}

export function TestsTab({
  fileTree,
  currentPath,
  basePath,
  selectedFile,
  testsSetupStatus,
  isSetupLogsVisible,
  renderWorkEditor,
  onFileSelect,
  onRefresh,
  onRunTest,
  onSetupLogsVisibleChange,
  onBack,
  onRename,
}: TestsTabProps) {
  return (
    <>
      <FileBrowser
        fileTree={fileTree}
        currentPath={currentPath}
        onFileSelect={onFileSelect}
        basePath={basePath}
        onRefresh={onRefresh}
        onRunFolder={onRunTest}
        viewMode="tests"
      />
      <div className="flex overflow-hidden flex-col flex-1 min-h-0">
        {testsSetupStatus &&
        testsSetupStatus.state !==
          "ready" ? (
          <div
            className={`bg-secondary border-b border-border min-h-0 ${
              isSetupLogsVisible
                ? "flex overflow-hidden flex-col flex-1"
                : ""
            }`}
          >
            <div className="flex flex-shrink-0 justify-between items-center px-3 py-2">
              <div className="text-sm text-muted-foreground">
                Setup:{" "}
                <span
                  className={`${
                    testsSetupStatus.state ===
                    "error"
                      ? "text-red-400"
                      : "text-yellow-300"
                  } ${
                    testsSetupStatus.state ===
                    "installing"
                      ? "animate-pulse"
                      : ""
                  }`}
                >
                  {
                    testsSetupStatus.state
                  }
                  {testsSetupStatus.state ===
                    "installing" &&
                    "..."}
                </span>
                {testsSetupStatus.error
                  ? ` — ${testsSetupStatus.error}`
                  : ""}
              </div>
              <button
                onClick={() =>
                  onSetupLogsVisibleChange(
                    !isSetupLogsVisible,
                  )
                }
                className="px-2 py-1 text-xs rounded transition-colors text-foreground hover:text-white hover:bg-accent"
              >
                {isSetupLogsVisible
                  ? "Hide logs"
                  : "Show logs"}
              </button>
            </div>
            {isSetupLogsVisible ? (
              <div className="flex overflow-hidden flex-col flex-1 px-3 pb-3 min-h-0">
                <div
                  ref={(el) => {
                    if (el) {
                      el.scrollTop =
                        el.scrollHeight;
                    }
                  }}
                  className="overflow-auto flex-1 p-3 min-h-0 font-mono text-xs whitespace-pre-wrap bg-black rounded text-foreground"
                >
                  {testsSetupStatus.log ||
                    `State: ${testsSetupStatus.state}`}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {(!testsSetupStatus ||
          testsSetupStatus.state ===
            "ready" ||
          !isSetupLogsVisible) &&
          (selectedFile ? (
            renderWorkEditor({
              onBack,
              onRename,
            })
          ) : (
            <div className="flex flex-1 justify-center items-center text-gray-500">
              Select a test file to view
              and edit
            </div>
          ))}
      </div>
    </>
  );
}
