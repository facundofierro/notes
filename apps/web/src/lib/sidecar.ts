import { spawn, ChildProcess } from "node:child_process";

type EnsureServerOptions = {
  name: string;
  port: number;
  url: string;
  healthPath?: string;
  startCmd: string;
  cwd?: string;
  env?: Record<string, string>;
  startTimeoutMs?: number;
};

type SidecarRegistry = {
  [name: string]: {
    process: ChildProcess | null;
    url: string;
    cwd?: string;
  };
};

const globalKey = "__agelum_sidecars__";
const registry: SidecarRegistry =
  (globalThis as any)[globalKey] || ((globalThis as any)[globalKey] = {});

async function isUp(url: string, timeoutMs = 1000): Promise<boolean> {
  try {
    console.log(`Checking if ${url} is up...`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(id);
    console.log(`Response from ${url}: ${res.status}`);
    return res.ok || res.status < 500;
  } catch (err) {
    console.log(`Failed to check ${url}:`, (err as any).message);
    return false;
  }
}

export async function ensureServer(opts: EnsureServerOptions): Promise<string> {
  const existingEntry = registry[opts.name];
  if (
    existingEntry?.process &&
    !existingEntry.process.killed &&
    existingEntry.cwd &&
    opts.cwd &&
    existingEntry.cwd !== opts.cwd
  ) {
    existingEntry.process.kill();
    existingEntry.process = null;
  }

  const url = `${opts.url}${opts.healthPath || "/"}`;
  if (await isUp(url)) {
    registry[opts.name] = {
      process: registry[opts.name]?.process || null,
      url: opts.url,
      cwd: opts.cwd,
    };
    return opts.url;
  }

  const existing = registry[opts.name]?.process;
  if (existing && !existing.killed) {
    // give it another chance to become healthy
    const ok = await waitForHealth(url, opts.startTimeoutMs ?? 8000);
    if (ok) return registry[opts.name]!.url;
  }

  if (!opts.startCmd?.trim()) {
    throw new Error(`Missing start command for ${opts.name}`);
  }

  const child = spawn(opts.startCmd, {
    cwd: opts.cwd,
    env: {
      ...process.env,
      ...(opts.env || {}),
      PORT: String(opts.port),
    },
    stdio: "inherit",
    shell: true,
    detached: false,
  });

  child.on("exit", () => {
    const entry = registry[opts.name];
    if (entry && entry.process === child) {
      entry.process = null;
    }
  });

  registry[opts.name] = {
    process: child,
    url: opts.url,
    cwd: opts.cwd,
  };

  const ok = await waitForHealth(url, opts.startTimeoutMs ?? 12000);
  if (!ok) {
    throw new Error(`Failed to start ${opts.name} server`);
  }

  return opts.url;
}

async function waitForHealth(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp(url, 800)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
