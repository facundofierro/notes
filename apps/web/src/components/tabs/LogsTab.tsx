import * as React from "react";
import dynamic from "next/dynamic";
import { useHomeStore } from "@/store/useHomeStore";

const TerminalViewer = dynamic(
  () => import("@/components/TerminalViewer").then((mod) => mod.TerminalViewer),
  { ssr: false },
);

export function LogsTab() {
  const { appLogs, isAppStarting, appPid, isAppRunning } = useHomeStore();

  const handleInput = React.useCallback(
    (data: string) => {
      if (appPid && isAppRunning) {
        fetch("/api/app-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pid: appPid,
            input: data,
          }),
        }).catch((error) => {
          console.error("Failed to send input:", error);
        });
      }
    },
    [appPid, isAppRunning],
  );

  return (
    <div className="flex flex-1 overflow-hidden flex-col bg-background">
      <div className="flex-1 min-h-0 bg-black">
        <TerminalViewer
          output={appLogs || (isAppStarting ? "Starting application...\n" : "")}
          className="w-full h-full"
          onInput={handleInput}
        />
      </div>
    </div>
  );
}