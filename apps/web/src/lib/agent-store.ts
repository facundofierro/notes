import { ChildProcess } from "child_process";

// Use globalThis to persist the store across hot reloads in development
const globalStore = globalThis as unknown as {
  activeProcesses?: Map<string, ChildProcess>;
  agentOutputBuffers?: Map<string, string>;
  agentProcessMeta?: Map<
    string,
    { toolName: string; startedAt: number; exited: boolean }
  >;
};

if (!globalStore.activeProcesses) {
  globalStore.activeProcesses = new Map();
}
if (!globalStore.agentOutputBuffers) {
  globalStore.agentOutputBuffers = new Map();
}
if (!globalStore.agentProcessMeta) {
  globalStore.agentProcessMeta = new Map();
}

export const activeProcesses = globalStore.activeProcesses;
export const agentOutputBuffers = globalStore.agentOutputBuffers;
export const agentProcessMeta = globalStore.agentProcessMeta;

export function registerProcess(
  id: string,
  childProcess: ChildProcess,
  toolName: string = "",
) {
  activeProcesses.set(id, childProcess);
  agentOutputBuffers.set(id, "");
  agentProcessMeta.set(id, { toolName, startedAt: Date.now(), exited: false });

  childProcess.on("close", () => {
    activeProcesses.delete(id);
    const meta = agentProcessMeta.get(id);
    if (meta) agentProcessMeta.set(id, { ...meta, exited: true });
  });

  childProcess.on("error", () => {
    activeProcesses.delete(id);
    const meta = agentProcessMeta.get(id);
    if (meta) agentProcessMeta.set(id, { ...meta, exited: true });
  });
}

export function appendOutput(id: string, data: string) {
  const current = agentOutputBuffers.get(id) || "";
  agentOutputBuffers.set(id, current + data);
}

export function getOutputBuffer(id: string): string | undefined {
  return agentOutputBuffers.get(id);
}

export function isProcessAlive(id: string): boolean {
  return activeProcesses.has(id);
}

export function getProcessStatus(
  id: string,
): {
  alive: boolean;
  exited: boolean;
  toolName: string;
  hasOutput: boolean;
} | null {
  const meta = agentProcessMeta.get(id);
  if (!meta) return null;
  return {
    alive: activeProcesses.has(id),
    exited: meta.exited,
    toolName: meta.toolName,
    hasOutput: (agentOutputBuffers.get(id) || "").length > 0,
  };
}

export function getProcess(id: string): ChildProcess | undefined {
  return activeProcesses.get(id);
}

export function killProcess(id: string) {
  const proc = activeProcesses.get(id);
  if (proc) {
    proc.kill();
    activeProcesses.delete(id);
    return true;
  }
  return false;
}

export function cleanupSession(id: string) {
  activeProcesses.delete(id);
  agentOutputBuffers.delete(id);
  agentProcessMeta.delete(id);
}
