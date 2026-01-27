import { ChildProcess } from "child_process";

// Global store for active agent processes
// Key: Process ID (UUID)
// Value: ChildProcess instance
export const activeProcesses = new Map<
  string,
  ChildProcess
>();

export function registerProcess(
  id: string,
  process: ChildProcess,
) {
  activeProcesses.set(id, process);

  // Auto-cleanup when process exits
  process.on("close", () => {
    activeProcesses.delete(id);
  });

  process.on("error", () => {
    activeProcesses.delete(id);
  });
}

export function getProcess(
  id: string,
): ChildProcess | undefined {
  return activeProcesses.get(id);
}

export function killProcess(
  id: string,
) {
  const process =
    activeProcesses.get(id);
  if (process) {
    process.kill();
    activeProcesses.delete(id);
    return true;
  }
  return false;
}
