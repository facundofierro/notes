"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  FileText,
  Edit,
  Save,
  X,
  ArrowLeft,
  Play,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";

const MonacoEditor =
  dynamic<EditorProps>(
    () =>
      import("@monaco-editor/react").then(
        (mod) => mod.default,
      ),
    { ssr: false },
  );

const MDEditor = dynamic(
  () =>
    import("@uiw/react-md-editor").then(
      (mod) => mod.default,
    ),
  { ssr: false },
);

const MarkdownPreview = dynamic(
  () =>
    import("@uiw/react-markdown-preview").then(
      (mod) => mod.default,
    ),
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
  onRename?: (
    newTitle: string,
  ) => Promise<{
    path: string;
    content: string;
  } | void>;
  onSave?: (opts: {
    path: string;
    content: string;
  }) => Promise<{
    path?: string;
    content?: string;
  } | void>;
  onValueChange?: (
    next: string,
  ) => void;
  onEditingChange?: (
    next: boolean,
  ) => void;
  onRun?: (path: string) => void;
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
}: FileViewerProps) {
  const [isEditing, setIsEditing] =
    useState(false);
  const [content, setContent] =
    useState("");
  const [isSaving, setIsSaving] =
    useState(false);
  const [isRenaming, setIsRenaming] =
    useState(false);
  const [renameValue, setRenameValue] =
    useState("");
  const [
    isRenamingSaving,
    setIsRenamingSaving,
  ] = useState(false);

  useEffect(() => {
    if (file) {
      if (value === undefined) {
        setContent(file.content);
      }
      if (editing === undefined) {
        setIsEditing(false);
      }
      setIsRenaming(false);
      setRenameValue("");
    }
  }, [
    file,
    editing,
    value,
  ]);

  useEffect(() => {
    if (editing !== undefined) {
      setIsEditing(editing);
    }
  }, [editing]);

  const effectiveContent =
    value !== undefined
      ? value
      : content;

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
      if (onSave) {
        const result = await onSave({
          path: file.path,
          content: effectiveContent,
        });
        if (
          result?.content !== undefined
        ) {
          updateContent(result.content);
        }
        updateEditing(false);
        if (onFileSaved) onFileSaved();
        return;
      }

      const response = await fetch(
        "/api/file",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path: file.path,
            content: effectiveContent,
          }),
        },
      );

      if (response.ok) {
        updateEditing(false);
        if (onFileSaved) onFileSaved();
      }
    } catch (error) {
      console.error(
        "Failed to save file:",
        error,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel =
    useCallback(() => {
      updateContent(
        file?.content || "",
      );
      updateEditing(false);
    }, [
      file?.content,
      updateContent,
      updateEditing,
    ]);

  const displayedFileName =
    file?.path.split("/").pop() || "";
  const displayedTitle =
    displayedFileName.endsWith(".md")
      ? displayedFileName.replace(
          /\.md$/,
          "",
        )
      : displayedFileName;

  const isMarkdown =
    displayedFileName.endsWith(".md");
  const isTypeScript =
    displayedFileName.endsWith(".ts") ||
    displayedFileName.endsWith(".tsx");
  const isTSX =
    displayedFileName.endsWith(".tsx");

  const commitRename =
    useCallback(async () => {
      if (!file || !onRename) return;

      const nextTitle =
        renameValue.trim();
      if (!nextTitle) {
        setIsRenaming(false);
        setRenameValue("");
        return;
      }

      setIsRenamingSaving(true);
      try {
        const result =
          await onRename(nextTitle);
        if (
          result?.content !== undefined
        ) {
          setContent(result.content);
        }
        setIsRenaming(false);
      } finally {
        setIsRenamingSaving(false);
      }
    }, [file, onRename, renameValue]);

  useEffect(() => {
    if (!file) return;

    const onKeyDown = (
      e: KeyboardEvent,
    ) => {
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

    window.addEventListener(
      "keydown",
      onKeyDown,
    );
    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
  }, [
    file,
    handleCancel,
    isEditing,
    isRenaming,
    onBack,
  ]);

  if (!file) {
    return (
      <div className="flex flex-1 justify-center items-center bg-gray-900">
        <div className="text-center text-gray-500">
          <FileText className="mx-auto mb-4 w-16 h-16 opacity-50" />
          <p>Select a file to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-900">
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-2 items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 mr-1 text-gray-400 rounded transition-colors hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-4 h-4 text-gray-400" />
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={(e) =>
                setRenameValue(
                  e.target.value,
                )
              }
              onBlur={() => {
                if (!isRenamingSaving)
                  commitRename();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!isRenamingSaving)
                    commitRename();
                }
                if (
                  e.key === "Escape"
                ) {
                  e.preventDefault();
                  setIsRenaming(false);
                  setRenameValue("");
                }
              }}
              className="bg-gray-700 text-gray-100 text-sm rounded border border-gray-600 px-2 py-1 w-[320px]"
              autoFocus
              disabled={
                isRenamingSaving
              }
            />
          ) : (
            <span
              className={`text-sm font-medium text-gray-200 truncate ${onRename ? "cursor-text" : ""}`}
              onDoubleClick={() => {
                if (!onRename) return;
                setRenameValue(
                  displayedTitle,
                );
                setIsRenaming(true);
              }}
              title={
                onRename
                  ? "Double click to rename"
                  : undefined
              }
            >
              {displayedTitle}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <span className="mr-4 max-w-md text-xs text-gray-500 truncate">
            {file.path}
          </span>
          {onRun && (
            <button
              onClick={() =>
                onRun(file.path)
              }
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
                className="flex gap-1 items-center px-3 py-1 text-sm text-gray-300 rounded transition-colors hover:text-white hover:bg-gray-700"
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
                {isSaving
                  ? "Saving..."
                  : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                updateEditing(true)
              }
              className="flex gap-1 items-center px-3 py-1 text-sm text-gray-300 rounded transition-colors hover:text-white hover:bg-gray-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>
      <div
        className={
          isMarkdown
            ? "overflow-auto flex-1"
            : "overflow-hidden flex-1"
        }
        data-color-mode="dark"
      >
        {isMarkdown ? (
          isEditing ? (
            <MDEditor
              value={effectiveContent}
              onChange={(
                val: string | undefined,
              ) =>
                updateContent(val || "")
              }
              height="100%"
              preview="edit"
              hideToolbar={false}
            />
          ) : (
            <div className="p-4">
              <MarkdownPreview
                source={
                  effectiveContent
                }
                style={{
                  background:
                    "transparent",
                  color: "#d1d5db",
                  fontSize: "14px",
                }}
              />
            </div>
          )
        ) : (
          <MonacoEditor
            value={effectiveContent}
            onChange={(
              val: string | undefined,
            ) =>
              updateContent(val || "")
            }
            path={file.path}
            language={
              isTypeScript
                ? isTSX
                  ? "typescriptreact"
                  : "typescript"
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
            beforeMount={(
              monaco: any,
            ) => {
              monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
                {
                  allowNonTsExtensions: true,
                  noEmit: true,
                  target:
                    monaco.languages
                      .typescript
                      .ScriptTarget
                      .ES2020,
                  module:
                    monaco.languages
                      .typescript
                      .ModuleKind
                      .ESNext,
                  moduleResolution:
                    monaco.languages
                      .typescript
                      .ModuleResolutionKind
                      .NodeJs,
                  jsx: isTSX
                    ? monaco.languages
                        .typescript
                        .JsxEmit
                        .Preserve
                    : monaco.languages
                        .typescript
                        .JsxEmit.None,
                  strict: true,
                },
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
