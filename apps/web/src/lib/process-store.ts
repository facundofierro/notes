import { ChildProcess } from "node:child_process";

export interface AppProcess {
  pid: number;
  startedAt: string;
  command: string;
  childProcess?: ChildProcess;
}

// Singleton instances using globalThis for Next.js HMR stability
const g = globalThis as any;

if (!g._processStore) {
  g._processStore = new Map<string, AppProcess>();
}
if (!g._processOutputBuffers) {
  g._processOutputBuffers = new Map<number, string>();
}
if (!g._processInputHandlers) {
  g._processInputHandlers = new Map<number, (data: string) => void>();
}

export const processStore = g._processStore as Map<string, AppProcess>;
export const processOutputBuffers = g._processOutputBuffers as Map<number, string>;
export const processInputHandlers = g._processInputHandlers as Map<number, (data: string) => void>;

// Clean up process data
export function cleanupProcess(repo: string, pid: number) {
  processStore.delete(repo);
  processInputHandlers.delete(pid);
}

export function cleanupProcessBuffer(pid: number) {
  processOutputBuffers.delete(pid);
}
