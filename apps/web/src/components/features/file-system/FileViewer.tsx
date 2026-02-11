"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Edit,
  Save,
  X,
  ArrowLeft,
  Play,
  Code,
  ListTree,
  History,
} from "lucide-react";
import dynamic from "next/dynamic";
import { TestSteps } from "../testing/TestSteps";
import { TestResults } from "../testing/TestResults";
import type { EditorProps } from "@monaco-editor/react";

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false },
);

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false },
);

const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
  { ssr: false },
);

interface FileViewerProps {
  file: {
    path: string;
    content: string;
  } | null;
  value?: string;
  editing?: boolean;
  onFileSaved?: () => void;
  onBack?: () => void;
  onRename?: (newTitle: string) => Promise<{
    path: string;
    content: string;
  } | void>;
  onSave?: (opts: { path: string; content: string }) => Promise<{
    path?: string;
    content?: string;
  } | void>;
  onValueChange?: (next: string) => void;
  onEditingChange?: (next: boolean) => void;
  onRun?: (path: string) => void;
  isTestFile?: boolean;
  testViewMode?: "steps" | "code" | "results";
  onTestViewModeChange?: (mode: "steps" | "code" | "results") => void;
  testOutput?: string;
  isTestRunning?: boolean;
  headerCenter?: React.ReactNode;
  allowEdit?: boolean;
  defaultRenaming?: boolean;
}

export default function FileViewer({
  file,
  value,
  editing,
  onFileSaved,
  onBack,
  onRename,
  onSave,
  onValueChange,
  onEditingChange,
  onRun,
  isTestFile,
  testViewMode = "code",
  onTestViewModeChange,
  testOutput,
  isTestRunning,
  headerCenter,
  allowEdit = true,
  defaultRenaming = false,
}: FileViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenamingSaving, setIsRenamingSaving] = useState(false);

  useEffect(() => {
    if (file) {
      if (value === undefined) {
        setContent(file.content);
      }
      if (editing === undefined) {
        setIsEditing(false);
      }
      if (defaultRenaming) {
        setIsRenaming(true);
        setRenameValue("");
      } else {
        setIsRenaming(false);
        setRenameValue("");
      }
    }
  }, [file, editing, value, defaultRenaming]);

  useEffect(() => {
    if (editing !== undefined) {
      setIsEditing(editing);
    }
  }, [editing]);

  const effectiveContent = value !== undefined ? value : content;

  const updateContent = useCallback(
    (next: string) => {
      if (value !== undefined) {
        onValueChange?.(next);
        return;
      }
      setContent(next);
    },
    [onValueChange, value],
  );

  const updateEditing = useCallback(
    (next: boolean) => {
      if (editing !== undefined) {
        onEditingChange?.(next);
        return;
      }
      setIsEditing(next);
    },
    [editing, onEditingChange],
  );

  const handleSave = async () => {
    if (!file) return;

    setIsSaving(true);
    try {
      let pathToSave = file.path;
      let contentToSave = effectiveContent;

      // Handle pending rename if saving while renaming
      if (isRenaming && onRename && renameValue.trim()) {
        try {
          setIsRenamingSaving(true);
          const result = await onRename(renameValue.trim());
          if (result) {
            pathToSave = result.path;
            if (result.content !== undefined) {
              contentToSave = result.content;
              updateContent(result.content);
            }
          }
          setIsRenaming(false);
        } catch (err) {
          console.error("Failed to rename during save:", err);
          // If rename fails, we probably shouldn't save to old path if the intent was new name?
          // But let's proceed or return?
        } finally {
          setIsRenamingSaving(false);
        }
      }

      if (onSave) {
        const result = await onSave({
          path: pathToSave,
          content: contentToSave,
        });
        if (result?.content !== undefined) {
          updateContent(result.content);
        }
        updateEditing(false);
        if (onFileSaved) onFileSaved();
        return;
      }

      const response = await fetch("/api/file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: pathToSave,
          content: contentToSave,
        }),
      });

      if (response.ok) {
        updateEditing(false);
        if (onFileSaved) onFileSaved();
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    updateContent(file?.content || "");
    updateEditing(false);
  }, [file?.content, updateContent, updateEditing]);

  const displayedFileName = file?.path.split("/").pop() || "";
  const displayedTitle = displayedFileName.endsWith(".md")
    ? displayedFileName.replace(/\.md$/, "")
    : displayedFileName;

  const isMarkdown = displayedFileName.endsWith(".md");
  const isJSON = displayedFileName.endsWith(".json");
  const isTypeScript =
    displayedFileName.endsWith(".ts") || displayedFileName.endsWith(".tsx");
  const isTSX = displayedFileName.endsWith(".tsx");
  const isJavaScript =
    displayedFileName.endsWith(".js") ||
    displayedFileName.endsWith(".jsx") ||
    displayedFileName.endsWith(".mjs") ||
    displayedFileName.endsWith(".cjs");
  const isJSX = displayedFileName.endsWith(".jsx");

  const commitRename = useCallback(async () => {
    if (!file || !onRename) return;

    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setIsRenaming(false);
      setRenameValue("");
      return;
    }

    setIsRenamingSaving(true);
    try {
      const result = await onRename(nextTitle);
      if (result?.content !== undefined) {
        setContent(result.content);
      }
      setIsRenaming(false);
    } finally {
      setIsRenamingSaving(false);
    }
  }, [file, onRename, renameValue]);

  useEffect(() => {
    if (!file) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isRenaming) {
        e.preventDefault();
        setIsRenaming(false);
        setRenameValue("");
        return;
      }

      if (isEditing) {
        e.preventDefault();
        handleCancel();
        return;
      }

      if (onBack) {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [file, handleCancel, isEditing, isRenaming, onBack]);

  if (!file) {
    return (
      <div className="flex flex-1 justify-center items-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileText className="mx-auto mb-4 w-16 h-16 opacity-50" />
          <p>Select a file to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-background">
      <div className="relative flex justify-between items-center p-3 border-b bg-secondary border-border">
        <div className="relative flex gap-2 items-center z-10">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 mr-1 rounded transition-colors text-muted-foreground hover:text-white hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-4 h-4 text-muted-foreground" />
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (!isRenamingSaving) commitRename();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!isRenamingSaving) commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setIsRenaming(false);
                  setRenameValue("");
                }
              }}
              className="bg-secondary text-foreground text-sm rounded border border-border px-2 py-1 w-[320px]"
              autoFocus
              disabled={isRenamingSaving}
            />
          ) : (
            <span
              className={`text-sm font-medium text-foreground truncate ${onRename ? "cursor-pointer hover:text-white" : ""}`}
              onClick={() => {
                if (!onRename) return;
                setRenameValue(displayedTitle);
                setIsRenaming(true);
              }}
              title={onRename ? "Click to rename" : undefined}
            >
              {displayedTitle}
            </span>
          )}
        </div>

        {headerCenter && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {headerCenter}
          </div>
        )}

        {isTestFile && (
          <div className="flex p-1 rounded-lg border bg-background border-border">
            <button
              onClick={() => onTestViewModeChange?.("steps")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                testViewMode === "steps"
                  ? "bg-secondary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              Steps
            </button>
            <button
              onClick={() => onTestViewModeChange?.("code")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                testViewMode === "code"
                  ? "bg-secondary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </button>
            <button
              onClick={() => onTestViewModeChange?.("results")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                testViewMode === "results"
                  ? "bg-secondary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Results
            </button>
          </div>
        )}

        <div className="relative flex gap-2 items-center z-10">
          {onRun && (
            <button
              onClick={() => onRun(file.path)}
              className="flex gap-1 items-center px-3 py-1 mr-2 text-sm text-green-400 rounded transition-colors hover:text-white hover:bg-green-900"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex gap-1 items-center px-3 py-1 text-sm rounded transition-colors text-muted-foreground hover:text-white hover:bg-accent"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            allowEdit && (
              <button
                onClick={() => updateEditing(true)}
                className="flex gap-1 items-center px-3 py-1 text-sm rounded transition-colors text-muted-foreground hover:text-white hover:bg-accent"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )
          )}
        </div>
      </div>
      <div
        className={
          isMarkdown ? "overflow-auto flex-1" : "overflow-hidden flex-1"
        }
        data-color-mode="dark"
      >
        {testViewMode === "steps" ? (
          <div className="overflow-auto flex-1 h-full">
            <TestSteps code={effectiveContent} />
          </div>
        ) : testViewMode === "results" ? (
          <div className="overflow-hidden flex-1 h-full">
            <TestResults
              testPath={file.path}
              currentOutput={testOutput}
              isTestRunning={isTestRunning}
            />
          </div>
        ) : isMarkdown ? (
          isEditing ? (
            <MDEditor
              value={effectiveContent}
              onChange={(val: string | undefined) => updateContent(val || "")}
              height="100%"
              preview="edit"
              hideToolbar={false}
            />
          ) : (
            <div className="p-4">
              <MarkdownPreview
                source={effectiveContent}
                style={{
                  background: "transparent",
                  color: "#d1d5db",
                  fontSize: "14px",
                }}
                urlTransform={(src) => {
                  // If the src is already absolute URL or a data URI, return as-is
                  if (
                    src.startsWith("http") ||
                    src.startsWith("data:") ||
                    src.startsWith("/api/")
                  ) {
                    return src;
                  }

                  // Check if this looks like an image path
                  const imageExts = [
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".gif",
                    ".svg",
                    ".webp",
                    ".bmp",
                    ".ico",
                  ];
                  const isImage = imageExts.some((ext) =>
                    src.toLowerCase().endsWith(ext),
                  );

                  if (!isImage) {
                    return src;
                  }

                  // Get the directory of the current file
                  const fileDir = file.path.split("/").slice(0, -1).join("/");

                  // Resolve relative path to absolute filesystem path
                  const combined =
                    fileDir && fileDir !== "" ? `${fileDir}/${src}` : src;
                  const isAbsolute = combined.startsWith("/");
                  const resolvedPath =
                    (isAbsolute ? "/" : "") +
                    combined
                      .split("/")
                      .reduce((acc: string[], part) => {
                        if (part === "..") {
                          acc.pop();
                        } else if (part !== "." && part !== "") {
                          acc.push(part);
                        }
                        return acc;
                      }, [])
                      .join("/");

                  // Route through the image API
                  return `/api/image?path=${encodeURIComponent(resolvedPath)}`;
                }}
              />
            </div>
          )
        ) : displayedFileName.match(
            /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i,
          ) ? (
          <div className="flex justify-center items-center h-full bg-secondary/10">
            <img
              src={`/api/image?path=${encodeURIComponent(file.path)}`}
              alt={displayedFileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : displayedFileName.match(/\.(mp4|webm|mov)$/i) ? (
          <div className="flex justify-center items-center h-full bg-secondary/10">
            <video
              src={`/api/image?path=${encodeURIComponent(file.path)}`} // Reusing general file server logic, assuming api/image streams or serves files
              controls
              className="max-w-full max-h-full"
            />
          </div>
        ) : (
          <MonacoEditor
            value={effectiveContent}
            onChange={(val: string | undefined) => updateContent(val || "")}
            path={file.path}
            language={
              isTypeScript || isTSX
                ? "typescript" // Monaco's typescript mode handles .ts and .tsx (via compiler options) usually, but 'typescriptreact' is safer for coloring if configured
                : isJavaScript || isJSX
                  ? "javascript"
                  : isJSON
                    ? "json"
                    : displayedFileName.endsWith(".css")
                      ? "css"
                      : displayedFileName.endsWith(".html")
                        ? "html"
                        : "plaintext"
            }
            theme="vs-dark"
            height="100%"
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: {
                enabled: false,
              },
              readOnly: !isEditing,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on",
            }}
            beforeMount={(monaco: any) => {
              monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
                {
                  allowNonTsExtensions: true,
                  noEmit: true,
                  target: monaco.languages.typescript.ScriptTarget.ES2020,
                  module: monaco.languages.typescript.ModuleKind.ESNext,
                  moduleResolution:
                    monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                  jsx:
                    isTSX || isJSX
                      ? monaco.languages.typescript.JsxEmit.Preserve
                      : monaco.languages.typescript.JsxEmit.None,
                  strict: true,
                },
              );
            }}
          />
        )}
      </div>
      <div className="px-3 py-1 border-t bg-secondary border-border">
        <span className="text-[10px] text-muted-foreground font-mono">
          {file.path}
        </span>
      </div>
    </div>
  );
}
