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
  selectedRepo: string | null;
  currentPath: string;
  basePath: string;
  selectedFile: {
    path: string;
    content: string;
  } | null;
  renderWorkEditor: (opts: {
    onBack: () => void;
    onRename?: (
      newTitle: string,
    ) => Promise<{
      path: string;
      content: string;
    } | void>;
    onRefresh?: () => void;
  }) => React.ReactNode;
  onFileSelect: (
    node: FileNode,
  ) => void;
  onRunTest: (path: string) => void;
  onBack: () => void;
  onSelectedFileChange: (file: { path: string; content: string } | null) => void;
}

export function TestsTab({
  selectedRepo,
  currentPath,
  basePath,
  selectedFile,
  renderWorkEditor,
  onFileSelect,
  onRunTest,
  onBack,
  onSelectedFileChange,
}: TestsTabProps) {
  const [fileTree, setFileTree] = React.useState<FileNode | null>(null);
  const [testsSetupStatus, setTestsSetupStatus] = React.useState<TestsSetupStatus | null>(null);
  const [isSetupLogsVisible, setIsSetupLogsVisible] = React.useState(true);

  const loadFileTree = React.useCallback(() => {
    if (selectedRepo) {
      fetch(`/api/files?repo=${selectedRepo}&path=work/tests`)
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.tree);
          const nextStatus = data.setupStatus ?? null;
          setTestsSetupStatus(nextStatus);
          if (nextStatus && (nextStatus.state !== "ready" || nextStatus.error)) {
            setIsSetupLogsVisible(true);
          }
        });
    }
  }, [selectedRepo]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  const handleRename = async (newTitle: string) => {
    if (!selectedFile) return;
    const oldPath = selectedFile.path;
    const dir = oldPath.split("/").slice(0, -1).join("/");
    const fileName = oldPath.split("/").pop() || "";
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
    const newPath =
      ext &&
      newTitle.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
        ? `${dir}/${newTitle}`
        : `${dir}/${newTitle}${ext ? `.${ext}` : ""}`;
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: oldPath,
        newPath: newPath,
        action: "rename",
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Failed to rename file");
    const next = { path: data.path, content: selectedFile.content };
    onSelectedFileChange(next);
    loadFileTree();
    return next;
  };
// ... status polling effect ...
  // Status polling
  React.useEffect(() => {
    if (!selectedRepo) return;
    const setupState = testsSetupStatus?.state;
    if (!setupState) return;
    if (setupState === "ready" || setupState === "error") return;

    let cancelled = false;
    let intervalId: number | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tests/status?repo=${selectedRepo}`);
        const data = (await res.json()) as {
          status: TestsSetupStatus;
        };
        if (cancelled) return;
        setTestsSetupStatus(data.status);

        if (!data.status) {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }

        if (data.status.state === "ready" || data.status.state === "error") {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        }

        if (data.status.state === "ready" && !data.status.error) return;
        setIsSetupLogsVisible(true);
      } catch {
        if (cancelled) return;
        setTestsSetupStatus(null);
      }
    };

    intervalId = window.setInterval(poll, 1500);
    poll();

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [selectedRepo, testsSetupStatus?.state]);

  return (
    <>
      <FileBrowser
        fileTree={fileTree}
        currentPath={currentPath}
        onFileSelect={onFileSelect}
        basePath={basePath}
        onRefresh={loadFileTree}
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
                  setIsSetupLogsVisible(
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
              onRename: handleRename,
              onRefresh: loadFileTree,
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
