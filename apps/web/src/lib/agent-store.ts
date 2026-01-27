import { ChildProcess } from "child_process";

// Use globalThis to persist the store across hot reloads in development
const globalStore =
  globalThis as unknown as {
    activeProcesses?: Map<
      string,
      ChildProcess
    >;
  };

if (!globalStore.activeProcesses) {
  globalStore.activeProcesses =
    new Map();
}

export const activeProcesses =
  globalStore.activeProcesses;

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
