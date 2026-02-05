import { ChildProcess } from "child_process";

export interface AppProcess {
  pid: number;
  startedAt: string;
  command: string;
  childProcess?: ChildProcess;
}

// Shared state for app processes
export const processStore = new Map<string, AppProcess>();
export const processOutputBuffers = new Map<number, string>();
export const processStdinStreams = new Map<number, NodeJS.WritableStream>();

// Clean up process data
export function cleanupProcess(repo: string, pid: number) {
  processStore.delete(repo);
  processOutputBuffers.delete(pid);
  processStdinStreams.delete(pid);
}
