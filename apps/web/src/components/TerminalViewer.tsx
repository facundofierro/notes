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
      scrollback: 10000,
    });

    term.onData((data) => {
      onInputRef.current?.(data);
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);

    // Wait for fonts to load before fitting so character measurements are accurate
    const doInitialFit = () => {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        fitAddonRef.current.fit();

        // Manual dimension calculation with buffer to maximize space usage
        const container = containerRef.current;
        const core = (terminalRef.current as any)._core;
        const charWidth = core._renderService.dimensions.actualCellWidth;
        const charHeight = core._renderService.dimensions.actualCellHeight;

        if (charWidth && charHeight) {
          const cols = Math.floor(container.clientWidth / charWidth);
          const rows = Math.floor(container.clientHeight / charHeight);

          // Only resize if our calculation differs from fit's calculation
          if (cols !== terminalRef.current.cols || rows !== terminalRef.current.rows) {
            terminalRef.current.resize(cols, rows);
          }
        }

        terminalRef.current.scrollToBottom();
        if (onResizeRef.current) {
          onResizeRef.current(terminalRef.current.cols, terminalRef.current.rows);
        }
      }
    };
    document.fonts.ready.then(doInitialFit);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        fitAddonRef.current.fit();

        // Manual dimension calculation with buffer to maximize space usage
        const container = containerRef.current;
        const core = (terminalRef.current as any)._core;
        const charWidth = core._renderService.dimensions.actualCellWidth;
        const charHeight = core._renderService.dimensions.actualCellHeight;

        if (charWidth && charHeight) {
          const cols = Math.floor(container.clientWidth / charWidth);
          const rows = Math.floor(container.clientHeight / charHeight);

          // Only resize if our calculation differs from fit's calculation
          if (cols !== terminalRef.current.cols || rows !== terminalRef.current.rows) {
            terminalRef.current.resize(cols, rows);
          }
        }

        terminalRef.current.scrollToBottom();
        if (onResizeRef.current) {
          onResizeRef.current(terminalRef.current.cols, terminalRef.current.rows);
        }
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
      term.write(newContent, () => {
        term.scrollToBottom();
      });
      writtenLengthRef.current =
        output.length;
    }
  }, [output]);

  // Handle container resize (e.g. when sidebar expands)
  React.useEffect(() => {
    const observer = new ResizeObserver(
      () => {
        if (fitAddonRef.current && terminalRef.current && containerRef.current) {
          fitAddonRef.current.fit();

          // Manual dimension calculation with buffer to maximize space usage
          const container = containerRef.current;
          const core = (terminalRef.current as any)._core;
          const charWidth = core._renderService.dimensions.actualCellWidth;
          const charHeight = core._renderService.dimensions.actualCellHeight;

          if (charWidth && charHeight) {
            const cols = Math.floor(container.clientWidth / charWidth);
            const rows = Math.floor(container.clientHeight / charHeight);

            // Only resize if our calculation differs from fit's calculation
            if (cols !== terminalRef.current.cols || rows !== terminalRef.current.rows) {
              terminalRef.current.resize(cols, rows);
            }
          }

          terminalRef.current.scrollToBottom();
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
      className={`h-full w-full overflow-hidden relative p-3 bg-[#09090b] ${className || ""}`}
      style={{ minHeight: "100px" }}
    >
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
    </div>
  );
}
