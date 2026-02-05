import { ChildProcess } from "child_process";
import { IPty } from "node-pty";

export interface AppProcess {
  pid: number;
  startedAt: string;
  command: string;
  childProcess?: ChildProcess;
  ptyProcess?: IPty;
}

// Shared state for app processes
export const processStore = new Map<string, AppProcess>();
export const processOutputBuffers = new Map<number, string>();
export const processInputHandlers = new Map<number, (data: string) => void>();

// Clean up process data
export function cleanupProcess(repo: string, pid: number) {
  processStore.delete(repo);
  processInputHandlers.delete(pid);
}

export function cleanupProcessBuffer(pid: number) {
  processOutputBuffers.delete(pid);
}
