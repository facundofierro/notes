"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@agelum/shadcn";
import FileBrowser from "@/components/FileBrowser";
import FileViewer from "@/components/FileViewer";
import TaskKanban from "@/components/TaskKanban";
import EpicsKanban from "@/components/EpicsKanban";
import IdeasKanban from "@/components/IdeasKanban";
import { MonochromeLogo } from "@agelum/shadcn";
import {
  Kanban,
  Files,
  Layers,
  FolderGit2,
  Lightbulb,
  BookOpen,
  Map,
  Terminal,
  ListTodo,
  TestTube,
  Settings,
  LogIn,
} from "lucide-react";

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

type ViewMode =
  | "ideas"
  | "docs"
  | "plan"
  | "epics"
  | "tasks"
  | "commands"
  | "browser"
  | "kanban"
  | "tests";

interface Task {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  epic?: string;
  assignee?: string;
  path?: string;
}

interface Epic {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  path?: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  state:
    | "thinking"
    | "important"
    | "priority"
    | "planned"
    | "done";
  createdAt: string;
  path?: string;
}

export default function Home() {
  const [
    repositories,
    setRepositories,
  ] = React.useState<string[]>([]);
  const [
    selectedRepo,
    setSelectedRepo,
  ] = React.useState<string | null>(
    null,
  );
  const [currentPath, setCurrentPath] =
    React.useState<string>("");
  const [fileTree, setFileTree] =
    React.useState<FileNode | null>(
      null,
    );
  const [
    selectedFile,
    setSelectedFile,
  ] = React.useState<{
    path: string;
    content: string;
  } | null>(null);
  const [basePath, setBasePath] =
    React.useState<string>("");
  const [viewMode, setViewMode] =
    React.useState<ViewMode>("epics");
  const [testOutput, setTestOutput] =
    React.useState<string>("");
  const [
    isTestRunning,
    setIsTestRunning,
  ] = React.useState(false);
  const [
    isTestDialogOpen,
    setIsTestDialogOpen,
  ] = React.useState(false);
  const [
    testsSetupStatus,
    setTestsSetupStatus,
  ] =
    React.useState<TestsSetupStatus | null>(
      null,
    );
  const [
    isSetupLogsVisible,
    setIsSetupLogsVisible,
  ] = React.useState(true);

  const selectedRepoStorageKey =
    "agelum.selectedRepo";

  React.useEffect(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        const nextRepos =
          (data.repositories ||
            []) as string[];
        setRepositories(nextRepos);
        if (data.basePath)
          setBasePath(data.basePath);

        if (nextRepos.length > 0) {
          const saved =
            window.localStorage.getItem(
              selectedRepoStorageKey,
            );
          const nextSelected =
            saved &&
            nextRepos.includes(saved)
              ? saved
              : nextRepos[0];
          setSelectedRepo(nextSelected);
        }
      });
  }, []);

  React.useEffect(() => {
    if (!selectedRepo) return;
    window.localStorage.setItem(
      selectedRepoStorageKey,
      selectedRepo,
    );
  }, [selectedRepo]);

  const loadFileTree =
    React.useCallback(() => {
      if (selectedRepo) {
        let url = `/api/files?repo=${selectedRepo}`;
        if (viewMode === "ideas")
          url += "&path=doc/ideas";
        if (viewMode === "docs")
          url += "&path=doc/docs";
        if (viewMode === "plan")
          url += "&path=doc/plan";
        if (viewMode === "commands")
          url += "&path=ai/commands";
        if (viewMode === "tests")
          url += "&path=work/tests";

        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            setFileTree(data.tree);
            setCurrentPath(
              data.rootPath,
            );
          });
      }
    }, [selectedRepo, viewMode]);

  React.useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  React.useEffect(() => {
    if (viewMode !== "tests") return;
    if (!selectedRepo) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/tests/status?repo=${selectedRepo}`,
        );
        const data =
          (await res.json()) as {
            status: TestsSetupStatus | null;
          };
        if (cancelled) return;
        setTestsSetupStatus(
          data.status,
        );
        if (!data.status) return;
        if (
          data.status.state ===
            "ready" &&
          !data.status.error
        )
          return;
        setIsSetupLogsVisible(true);
      } catch {
        if (cancelled) return;
        setTestsSetupStatus(null);
      }
    };

    poll();
    const id = window.setInterval(
      poll,
      1500,
    );
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [selectedRepo, viewMode]);

  const handleFileSelect = async (
    node: FileNode,
  ) => {
    if (node.type === "file") {
      const content = await fetch(
        `/api/file?path=${encodeURIComponent(node.path)}`,
      ).then((res) => res.json());
      setSelectedFile({
        path: node.path,
        content: content.content || "",
      });
    }
  };

  const handleTaskSelect = (
    task: Task,
  ) => {
    if (!selectedRepo || !task.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/agelum/tasks/${task.state}/${task.epic ? `${task.epic}/` : ""}${task.id}.md`
        : "";

    const filePath =
      task.path || fallbackPath;
    if (!filePath) return;

    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleEpicSelect = (
    epic: Epic,
  ) => {
    if (!selectedRepo || !epic.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/agelum/epics/${epic.state}/${epic.id}.md`
        : "";

    const filePath =
      epic.path || fallbackPath;
    if (!filePath) return;

    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleIdeaSelect = (
    idea: Idea,
  ) => {
    if (!selectedRepo || !idea.id)
      return;

    const fallbackPath =
      basePath && selectedRepo
        ? `${basePath}/${selectedRepo}/agelum/ideas/${idea.state}/${idea.id}.md`
        : "";

    const filePath =
      idea.path || fallbackPath;
    if (!filePath) return;

    fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setSelectedFile({
          path: filePath,
          content: data.content || "",
        });
      });
  };

  const handleRunTest = async (
    path: string,
  ) => {
    setTestOutput("");
    setIsTestRunning(true);
    setIsTestDialogOpen(true);

    try {
      const response = await fetch(
        "/api/tests/run",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path,
          }),
        },
      );

      const reader =
        response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } =
          await reader.read();
        if (done) break;
        const text =
          new TextDecoder().decode(
            value,
          );
        setTestOutput(
          (prev) => prev + text,
        );
      }
    } catch (error) {
      setTestOutput(
        (prev) =>
          prev + "\nError running test",
      );
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-6 items-center">
          <MonochromeLogo
            size="sm"
            color="text-white"
          />

          <div className="flex gap-1 items-center">
            {/* Doc Section */}
            <button
              onClick={() =>
                setViewMode("ideas")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "ideas"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Ideas
            </button>
            <button
              onClick={() =>
                setViewMode("docs")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "docs"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </button>
            <button
              onClick={() =>
                setViewMode("plan")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "plan"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Map className="w-4 h-4" />
              Plan
            </button>

            <div className="mx-2 w-px h-6 bg-gray-700" />

            {/* Work Section */}
            <button
              onClick={() =>
                setViewMode("epics")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "epics"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              Epics
            </button>
            <button
              onClick={() =>
                setViewMode("kanban")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() =>
                setViewMode("tests")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "tests"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <TestTube className="w-4 h-4" />
              Tests
            </button>

            <div className="mx-2 w-px h-6 bg-gray-700" />

            {/* AI Section */}
            <button
              onClick={() =>
                setViewMode("commands")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === "commands"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Commands
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedRepo || ""}
            onChange={(e) =>
              setSelectedRepo(
                e.target.value,
              )
            }
            className="bg-gray-700 text-gray-100 text-sm rounded-lg border-none focus:ring-2 focus:ring-blue-500 p-1.5 min-w-[160px]"
          >
            <option value="" disabled>
              Select repository
            </option>
            {repositories.map(
              (repo) => (
                <option
                  key={repo}
                  value={repo}
                >
                  {repo}
                </option>
              ),
            )}
          </select>

          <div className="mx-2 w-px h-6 bg-gray-700" />

          <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-white hover:bg-gray-700">
            <Settings className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg text-sm transition-colors">
            <LogIn className="w-4 h-4" />
            Login
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <div className="flex overflow-hidden flex-1">
          {[
            "docs",
            "plan",
            "commands",
            "tests",
          ].includes(viewMode) ? (
            <>
              <FileBrowser
                fileTree={fileTree}
                currentPath={
                  currentPath
                }
                onFileSelect={
                  handleFileSelect
                }
                basePath={basePath}
                onRefresh={loadFileTree}
                onRunFolder={
                  viewMode === "tests"
                    ? handleRunTest
                    : undefined
                }
              />
              {viewMode === "tests" ? (
                <div className="flex overflow-hidden flex-col flex-1">
                  {testsSetupStatus &&
                  testsSetupStatus.state !==
                    "ready" ? (
                    <div className="bg-gray-800 border-b border-gray-700">
                      <div className="flex justify-between items-center px-3 py-2">
                        <div className="text-sm text-gray-300">
                          Setup:{" "}
                          <span
                            className={
                              testsSetupStatus.state ===
                              "error"
                                ? "text-red-400"
                                : "text-yellow-300"
                            }
                          >
                            {
                              testsSetupStatus.state
                            }
                          </span>
                          {testsSetupStatus.error
                            ? ` — ${testsSetupStatus.error}`
                            : ""}
                        </div>
                        <button
                          onClick={() =>
                            setIsSetupLogsVisible(
                              (v) => !v,
                            )
                          }
                          className="px-2 py-1 text-xs text-gray-200 rounded transition-colors hover:text-white hover:bg-gray-700"
                        >
                          {isSetupLogsVisible
                            ? "Hide logs"
                            : "Show logs"}
                        </button>
                      </div>
                      {isSetupLogsVisible ? (
                        <div className="px-3 pb-3">
                          <div className="bg-black p-3 rounded overflow-auto font-mono text-xs text-gray-200 whitespace-pre-wrap max-h-[240px]">
                            {testsSetupStatus.log ||
                              `State: ${testsSetupStatus.state}`}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <FileViewer
                    file={selectedFile}
                    onFileSaved={
                      loadFileTree
                    }
                    onRun={
                      handleRunTest
                    }
                  />
                </div>
              ) : (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                />
              )}
            </>
          ) : viewMode === "ideas" ? (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                  onBack={() =>
                    setSelectedFile(
                      null,
                    )
                  }
                />
              ) : selectedRepo ? (
                <IdeasKanban
                  repo={selectedRepo}
                  onIdeaSelect={
                    handleIdeaSelect
                  }
                />
              ) : null}
            </div>
          ) : viewMode === "epics" ? (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                  onBack={() =>
                    setSelectedFile(
                      null,
                    )
                  }
                />
              ) : selectedRepo ? (
                <EpicsKanban
                  repo={selectedRepo}
                  onEpicSelect={
                    handleEpicSelect
                  }
                />
              ) : null}
            </div>
          ) : (
            <div className="flex-1 bg-background">
              {selectedFile ? (
                <FileViewer
                  file={selectedFile}
                  onFileSaved={
                    loadFileTree
                  }
                  onBack={() =>
                    setSelectedFile(
                      null,
                    )
                  }
                  onRename={
                    viewMode ===
                      "kanban" &&
                    selectedRepo
                      ? async (
                          newTitle: string,
                        ) => {
                          const res =
                            await fetch(
                              "/api/tasks",
                              {
                                method:
                                  "POST",
                                headers:
                                  {
                                    "Content-Type":
                                      "application/json",
                                  },
                                body: JSON.stringify(
                                  {
                                    repo: selectedRepo,
                                    action:
                                      "rename",
                                    path: selectedFile.path,
                                    newTitle,
                                  },
                                ),
                              },
                            );

                          const data =
                            await res.json();
                          if (!res.ok)
                            throw new Error(
                              data.error ||
                                "Failed to rename task",
                            );

                          const next = {
                            path: data.path as string,
                            content:
                              data.content as string,
                          };
                          setSelectedFile(
                            next,
                          );
                          return next;
                        }
                      : undefined
                  }
                />
              ) : selectedRepo ? (
                <TaskKanban
                  repo={selectedRepo}
                  onTaskSelect={
                    handleTaskSelect
                  }
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={isTestDialogOpen}
        onOpenChange={
          setIsTestDialogOpen
        }
      >
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Test Execution
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 p-4 font-mono text-sm text-green-400 whitespace-pre-wrap bg-black rounded">
            {testOutput}
            {isTestRunning && (
              <span className="animate-pulse">
                _
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
