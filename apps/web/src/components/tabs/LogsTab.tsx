import * as React from "react";
import dynamic from "next/dynamic";

const TerminalViewer = dynamic(
  () =>
    import("@/components/TerminalViewer").then(
      (mod) => mod.TerminalViewer,
    ),
  { ssr: false },
);

interface LogsTabProps {
  appLogs: string;
  isAppStarting: boolean;
  appPid: number | null;
  isAppRunning: boolean;
  onInput?: (data: string) => void;
}

export function LogsTab({
  appLogs,
  isAppStarting,
  appPid,
  isAppRunning,
  onInput,
}: LogsTabProps) {
  const handleInput = React.useCallback(
    (data: string) => {
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
            "Failed to send input:",
            error,
          );
        });
      }
      onInput?.(data);
    },
    [appPid, isAppRunning, onInput],
  );

  return (
    <div className="flex flex-1 overflow-hidden flex-col bg-background">
      <div className="flex-1 min-h-0 bg-black">
        <TerminalViewer
          output={
            appLogs ||
            (isAppStarting
              ? "Starting application...\n"
              : "")
          }
          className="w-full h-full"
          onInput={handleInput}
        />
      </div>
    </div>
  );
}
