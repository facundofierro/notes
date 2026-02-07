import * as React from "react";
import dynamic from "next/dynamic";
import {
  useHomeStore,
  TerminalState,
} from "@/store/useHomeStore";
import {
  Plus,
  X,
  Terminal as TerminalIcon,
} from "lucide-react";

const TerminalViewer = dynamic(
  () =>
    import("@/components/TerminalViewer").then(
      (mod) => mod.TerminalViewer,
    ),
  { ssr: false },
);

export function LogsTab() {
  const store = useHomeStore();
  const {
    appLogs,
    isAppStarting,
    appPid,
    isAppRunning,
    terminals,
    activeTerminalId,
  } = store.getProjectState();
  const {
    setActiveTerminalId,
    addTerminal,
    removeTerminal,
    updateTerminalOutput,
    selectedRepo,
    repositories,
  } = store;

  const currentRepoPath =
    React.useMemo(() => {
      return repositories.find(
        (r) => r.name === selectedRepo,
      )?.path;
    }, [repositories, selectedRepo]);

  const handleInput = React.useCallback(
    (data: string) => {
      if (activeTerminalId === "logs") {
        if (appPid && isAppRunning) {
          fetch("/api/app-logs", {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              pid: appPid,
              input: data,
            }),
          }).catch((error) => {
            console.error(
              "Failed to send input to app logs:",
              error,
            );
          });
        }
      } else {
        const terminal = terminals.find(
          (t) =>
            t.id === activeTerminalId,
        );
        if (terminal?.processId) {
          fetch("/api/terminal", {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: terminal.processId,
              input: data,
            }),
          }).catch((error) => {
            console.error(
              "Failed to send input to terminal:",
              error,
            );
          });
        }
      }
    },
    [
      activeTerminalId,
      appPid,
      isAppRunning,
      terminals,
    ],
  );

  const [termSize, setTermSize] = React.useState({ cols: 100, rows: 40 });

  const createNewTerminal =
    async () => {
      const id = crypto.randomUUID();
      const newTerminal: TerminalState =
        {
          id,
          title: `Terminal ${terminals.length + 1}`,
          output:
            "Starting terminal...\n",
        };
      addTerminal(newTerminal);

      try {
        const response = await fetch(
          "/api/terminal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              cwd: currentRepoPath,
              cols: termSize.cols,
              rows: termSize.rows,
            }),
          },
        );

        if (
          !response.ok ||
          !response.body
        ) {
          updateTerminalOutput(
            id,
            (prev) =>
              prev +
              "\nFailed to start terminal session.",
          );
          return;
        }

        const processId =
          response.headers.get(
            "X-Agent-Process-ID",
          );
        if (processId) {
          // We should probably update the terminal state with the processId
          // But our TerminalState already has processId? Yes.
          // Update the store with the processId
          store.setProjectState(
            (prev) => ({
              terminals:
                prev.terminals?.map(
                  (t) =>
                    t.id === id
                      ? {
                          ...t,
                          processId,
                        }
                      : t,
                ) || [],
            }),
          );
        }

        const reader =
          response.body.getReader();
        const decoder =
          new TextDecoder();

        while (true) {
          const { done, value } =
            await reader.read();
          if (done) break;
          const text =
            decoder.decode(value);
          updateTerminalOutput(
            id,
            (prev) => prev + text,
          );
        }
      } catch (error: any) {
        updateTerminalOutput(
          id,
          (prev) =>
            prev +
            `\nError: ${error.message}`,
        );
      }
    };

  const activeOutput =
    React.useMemo(() => {
      if (activeTerminalId === "logs") {
        return (
          appLogs ||
          (isAppStarting
            ? "Starting application...\n"
            : "")
        );
      }
      return (
        terminals.find(
          (t) =>
            t.id === activeTerminalId,
        )?.output || ""
      );
    }, [
      activeTerminalId,
      appLogs,
      isAppStarting,
      terminals,
    ]);

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
        <button
          onClick={() =>
            setActiveTerminalId("logs")
          }
          className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors flex items-center gap-2 h-full border-b-2 ${
            activeTerminalId === "logs"
              ? "bg-background border-primary text-foreground"
              : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
          }`}
        >
          <TerminalIcon size={12} />
          Main Logs
        </button>

        {terminals?.map((terminal) => (
          <div
            key={terminal.id}
            className={`group flex items-center h-full border-b-2 transition-colors ${
              activeTerminalId ===
              terminal.id
                ? "bg-background border-primary text-foreground"
                : "text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            }`}
          >
            <button
              onClick={() =>
                setActiveTerminalId(
                  terminal.id,
                )
              }
              className="flex gap-2 items-center px-3 py-1 h-full text-xs font-medium"
            >
              <TerminalIcon size={12} />
              {terminal.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  terminal.processId
                ) {
                  fetch(
                    "/api/terminal",
                    {
                      method: "DELETE",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body: JSON.stringify(
                        {
                          id: terminal.processId,
                        },
                      ),
                    },
                  ).catch(
                    console.error,
                  );
                }
                removeTerminal(
                  terminal.id,
                );
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
