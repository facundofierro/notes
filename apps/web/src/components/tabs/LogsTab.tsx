import * as React from "react";
import dynamic from "next/dynamic";
import { useHomeStore, TerminalState } from "@/store/useHomeStore";
import { Plus, X, Terminal as TerminalIcon } from "lucide-react";

const TerminalViewer = dynamic(
  () =>
    import("@/components/features/terminal/TerminalViewer").then(
      (mod) => mod.TerminalViewer,
    ),
  { ssr: false },
);

export function LogsTab() {
  const { terminals, activeTerminalId } = useHomeStore((s) => {
    const pState = s.selectedRepo ? s.projectStates[s.selectedRepo] : null;
    return {
      terminals: pState?.terminals || [],
      activeTerminalId: pState?.activeTerminalId || "logs",
    };
  }, (oldVal, newVal) => {
    return (
      oldVal.terminals === newVal.terminals &&
      oldVal.activeTerminalId === newVal.activeTerminalId
    );
  });

  const setActiveTerminalId = useHomeStore((s) => s.setActiveTerminalId);
  const addTerminal = useHomeStore((s) => s.addTerminal);
  const removeTerminal = useHomeStore((s) => s.removeTerminal);
  const updateTerminalOutput = useHomeStore((s) => s.updateTerminalOutput);
  const selectedRepo = useHomeStore((s) => s.selectedRepo);
  const repositories = useHomeStore((s) => s.repositories);
  const setProjectState = useHomeStore((s) => s.setProjectState);

  const currentRepoPath = React.useMemo(() => {
    return repositories.find((r) => r.name === selectedRepo)?.path;
  }, [repositories, selectedRepo]);

  const handleInput = React.useCallback(
    (data: string) => {
      const terminal = terminals.find((t) => t.id === activeTerminalId);
      if (terminal?.processId) {
        fetch("/api/terminal", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: terminal.processId,
            input: data,
          }),
        }).catch((error) => {
          console.error("Failed to send input to terminal:", error);
        });
      }
    },
    [activeTerminalId, terminals],
  );

  const [termSize, setTermSize] = React.useState({ cols: 100, rows: 40 });

  // Initialize main terminal on mount
  React.useEffect(() => {
    // Only create main terminal if it doesn't exist
    if (!terminals.find((t) => t.id === "main")) {
      createMainTerminal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMainTerminal = async () => {
    const id = "main";
    const newTerminal: TerminalState = {
      id,
      title: "Main Logs",
      output: "Starting terminal...\n",
    };
    addTerminal(newTerminal);
    setActiveTerminalId(id);

    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cwd: currentRepoPath,
          cols: termSize.cols,
          rows: termSize.rows,
        }),
      });

      if (!response.ok || !response.body) {
        updateTerminalOutput(
          id,
          (prev) => prev + "\nFailed to start terminal session.",
        );
        return;
      }

      const processId = response.headers.get("X-Agent-Process-ID");
      if (processId) {
        setProjectState((prev) => ({
          terminals:
            prev.terminals?.map((t) =>
              t.id === id ? { ...t, processId } : t,
            ) || [],
        }));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        updateTerminalOutput(id, (prev) => prev + text);
      }
    } catch (error: any) {
      updateTerminalOutput(id, (prev) => prev + `\nError: ${error.message}`);
    }
  };

  const createNewTerminal = async () => {
    const id = crypto.randomUUID();
    const newTerminal: TerminalState = {
      id,
      title: `Terminal ${terminals.length + 1}`,
      output: "Starting terminal...\n",
    };
    addTerminal(newTerminal);

    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cwd: currentRepoPath,
          cols: termSize.cols,
          rows: termSize.rows,
        }),
      });

      if (!response.ok || !response.body) {
        updateTerminalOutput(
          id,
          (prev) => prev + "\nFailed to start terminal session.",
        );
        return;
      }

      const processId = response.headers.get("X-Agent-Process-ID");
      if (processId) {
        // We should probably update the terminal state with the processId
        // But our TerminalState already has processId? Yes.
        // Update the store with the processId
        setProjectState((prev) => ({
          terminals:
            prev.terminals?.map((t) =>
              t.id === id
                ? {
                    ...t,
                    processId,
                  }
                : t,
            ) || [],
        }));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        updateTerminalOutput(id, (prev) => prev + text);
      }
    } catch (error: any) {
      updateTerminalOutput(id, (prev) => prev + `\nError: ${error.message}`);
    }
  };

  const activeOutput = React.useMemo(() => {
    return terminals.find((t) => t.id === activeTerminalId)?.output || "";
  }, [activeTerminalId, terminals]);

  return (
    <div className="flex overflow-hidden flex-col flex-1 bg-background">
      <div className="flex-1 p-4 min-h-0 bg-background">
        <TerminalViewer
          output={activeOutput}
          className="w-full h-full"
          onInput={handleInput}
          onResize={(cols, rows) => setTermSize({ cols, rows })}
        />
      </div>

      {/* Bottom Bar */}
      <div className="flex overflow-x-auto gap-1 items-center px-2 h-9 border-t bg-muted/50 no-scrollbar">
        {/* Main Logs Terminal */}
        {terminals.find((t) => t.id === "main") && (
          <div
            className={`group flex items-center h-full border-b-2 transition-colors ${
              activeTerminalId === "main"
                ? "bg-background border-primary text-foreground"
                : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            }`}
          >
            <button
              onClick={() => setActiveTerminalId("main")}
              className="flex gap-2 items-center px-3 py-1 h-full text-xs font-medium"
            >
              <TerminalIcon size={12} />
              Main Logs
            </button>
          </div>
        )}

        {terminals
          ?.filter((t) => t.id !== "main")
          .map((terminal) => (
            <div
              key={terminal.id}
              className={`group flex items-center h-full border-b-2 transition-colors ${
                activeTerminalId === terminal.id
                  ? "bg-background border-primary text-foreground"
                  : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
              }`}
            >
              <button
                onClick={() => setActiveTerminalId(terminal.id)}
                className="flex gap-2 items-center px-3 py-1 h-full text-xs font-medium"
              >
                <TerminalIcon size={12} />
                {terminal.title}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (terminal.processId) {
                    fetch("/api/terminal", {
                      method: "DELETE",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        id: terminal.processId,
                      }),
                    }).catch(console.error);
                  }
                  removeTerminal(terminal.id);
                }}
                className="pr-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </div>
          ))}

        <button
          onClick={createNewTerminal}
          className="p-1.5 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Open new terminal"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
