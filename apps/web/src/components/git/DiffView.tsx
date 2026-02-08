"use client";

import * as React from "react";
import { DiffEditor } from "@monaco-editor/react";

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  className?: string;
}

export function DiffView({ original, modified, language = "plaintext", className }: DiffViewProps) {
  return (
    <div className={`h-full w-full ${className}`}>
      <DiffEditor
        original={original}
        modified={modified}
        language={language}
        options={{
          renderSideBySide: false, // Inline diff
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
        }}
        theme="vs-dark" 
      />
    </div>
  );
}
