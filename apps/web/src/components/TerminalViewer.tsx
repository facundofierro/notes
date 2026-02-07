"use client";

import * as React from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface TerminalViewerProps {
  output: string;
  className?: string;
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function TerminalViewer({
  output,
  className,
  onInput,
  onResize,
}: TerminalViewerProps) {
  const containerRef =
    React.useRef<HTMLDivElement>(null);
  const terminalRef =
    React.useRef<Terminal | null>(null);
  const fitAddonRef =
    React.useRef<FitAddon | null>(null);
  const writtenLengthRef =
    React.useRef(0);
  const onInputRef = React.useRef(onInput);
  const onResizeRef = React.useRef(onResize);

  // Update refs
  React.useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);

  React.useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // Initialize terminal
  React.useEffect(() => {
    if (
      !containerRef.current ||
      terminalRef.current
    )
      return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily:
        'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      theme: {
        background: "#09090b", // Zinc 950
        foreground: "#f8fafc", // text-foreground
        cursor: "#94a3b8",
        selectionBackground:
          "rgba(255, 255, 255, 0.2)",
      },
      convertEol: true, // Treat \n as \r\n
      disableStdin: false, // Allow input
    });

    term.onData((data) => {
      onInputRef.current?.(data);
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    
    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
      if (onResizeRef.current) {
        onResizeRef.current(term.cols, term.rows);
      }
    }, 0);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (onResizeRef.current) {
        onResizeRef.current(term.cols, term.rows);
      }
    };
    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      writtenLengthRef.current = 0;
    };
  }, []);

  // Handle output updates
  React.useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    // If output was cleared or reset (length smaller than what we wrote), reset terminal
    if (
      output.length <
      writtenLengthRef.current
    ) {
      term.reset();
      writtenLengthRef.current = 0;
    }

    // Write only the new part
    const newContent = output.slice(
      writtenLengthRef.current,
    );
    if (newContent) {
      term.write(newContent);
      writtenLengthRef.current =
        output.length;
    }
  }, [output]);

  // Handle container resize (e.g. when sidebar expands)
  React.useEffect(() => {
    const observer = new ResizeObserver(
      () => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          if (onResizeRef.current) {
            onResizeRef.current(terminalRef.current.cols, terminalRef.current.rows);
          }
        }
      },
    );

    if (containerRef.current) {
      observer.observe(
        containerRef.current,
      );
    }

    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${className || ""}`}
      style={{ minHeight: "100px" }}
    />
  );
}
