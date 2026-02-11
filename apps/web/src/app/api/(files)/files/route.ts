import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { readSettings } from "@/lib/settings";
import { ensureEnvFileMissingOnly } from "@/lib/env-file";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileNode[];
}

type TestsSetupState =
  | "missing"
  | "initializing"
  | "installing"
  | "ready"
  | "error";

interface TestsSetupStatus {
  state: TestsSetupState;
  startedAt?: string;
  updatedAt: string;
  pid?: number;
  log: string;
  error?: string;
}

const TESTS_SETUP_STATUS_FILE = ".agelum-tests-setup.json";
const TESTS_SETUP_LOCK_FILE = ".agelum-tests-setup.lock";
const MAX_STATUS_LOG_CHARS = 50_000;

const runningSetups = new Map<string, number>();

function ensureAgelumTestEnvFiles(
  projectDir: string,
  entries: Record<string, string | undefined>,
) {
  ensureEnvFileMissingOnly(projectDir, entries);
}

function readTestsSetupStatus(projectDir: string): TestsSetupStatus | null {
  const p = path.join(projectDir, TESTS_SETUP_STATUS_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as TestsSetupStatus;
  } catch {
    return null;
  }
}

function writeTestsSetupStatus(projectDir: string, status: TestsSetupStatus) {
  const p = path.join(projectDir, TESTS_SETUP_STATUS_FILE);
  fs.writeFileSync(p, JSON.stringify(status, null, 2));
}

function truncateLog(log: string): string {
  if (log.length <= MAX_STATUS_LOG_CHARS) return log;
  return log.slice(log.length - MAX_STATUS_LOG_CHARS);
}

function appendTestsSetupLog(projectDir: string, chunk: string) {
  const prev = readTestsSetupStatus(projectDir) ?? {
    state: "missing" as const,
    updatedAt: new Date().toISOString(),
    log: "",
  };
  const next: TestsSetupStatus = {
    ...prev,
    updatedAt: new Date().toISOString(),
    log: truncateLog(prev.log + chunk),
  };
  writeTestsSetupStatus(projectDir, next);
}

function isPidRunning(pid?: number): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function shouldStartInstall(
  projectDir: string,
  status: TestsSetupStatus | null,
): boolean {
  const nodeModulesPath = path.join(projectDir, "node_modules");
  if (fs.existsSync(nodeModulesPath)) return false;

  // Check for pnpm-lock.yaml - if it exists, install was already done
  const pnpmLockPath = path.join(projectDir, "pnpm-lock.yaml");
  if (fs.existsSync(pnpmLockPath)) return false;

  if (status?.state === "ready" && !status.error) return false;

  const runningPid = runningSetups.get(projectDir);
  if (runningPid && isPidRunning(runningPid)) return false;

  const lockPath = path.join(projectDir, TESTS_SETUP_LOCK_FILE);
  if (fs.existsSync(lockPath)) {
    try {
      const stat = fs.statSync(lockPath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 30 * 60 * 1000) return false;
    } catch {
      return false;
    }
  }

  if (status?.state === "installing") {
    if (isPidRunning(status.pid)) return false;
  }

  return true;
}

async function ensureStagehandSetup(
  projectDir: string,
  testsDir: string,
): Promise<TestsSetupStatus> {
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, {
      recursive: true,
    });
  }
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  const settings = await readSettings();
  ensureAgelumTestEnvFiles(projectDir, {
    BROWSERBASE_API_KEY:
      settings.stagehandApiKey || process.env.BROWSERBASE_API_KEY,
    OPENAI_API_KEY: settings.openaiApiKey || process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY:
      settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY:
      settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    XAI_API_KEY: settings.grokApiKey || process.env.XAI_API_KEY,
  });

  const workspacePath = path.join(projectDir, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspacePath)) {
    fs.writeFileSync(workspacePath, "packages: []\n");
  }

  const packageJsonPath = path.join(projectDir, "package.json");
  const srcDir = testsDir;

  if (!fs.existsSync(packageJsonPath)) {
    const packageJson = {
      name: "browser-tests",
      version: "1.0.0",
      packageManager: "pnpm@9.0.0",
      dependencies: {
        "@browserbasehq/stagehand": "latest",
        dotenv: "latest",
        zod: "latest",
      },
      devDependencies: {
        tsx: "latest",
        typescript: "latest",
      },
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  const tsConfigPath = path.join(projectDir, "tsconfig.json");
  if (!fs.existsSync(tsConfigPath)) {
    const tsConfig = {
      compilerOptions: {
        target: "es2020",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    };
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
  }

  // Create example test
  const exampleTest = `import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export async function main() {
  const stagehand = new Stagehand({
    env: "LOCAL",
  });

  await stagehand.init();
  const page = stagehand.page;
  await page.goto("https://example.com");

  const title = await page.extract({
    instruction: "get the title of the page",
    schema: z.object({ title: z.string() })
  });

  console.log("Page title:", title);
  await stagehand.close();
}

if (require.main === module) {
  main().catch(console.error);
}
`;
  if (!fs.existsSync(path.join(srcDir, "example.ts"))) {
    fs.writeFileSync(path.join(srcDir, "example.ts"), exampleTest);
  }

  const nodeModulesPath = path.join(projectDir, "node_modules");
  const pnpmLockPath = path.join(projectDir, "pnpm-lock.yaml");
  const nowIso = new Date().toISOString();
  const prev = readTestsSetupStatus(projectDir);

  const hasNodeModules = fs.existsSync(nodeModulesPath);
  const hasLockFile = fs.existsSync(pnpmLockPath);
  const wasAlreadyInstalled =
    hasNodeModules || hasLockFile || (prev?.state === "ready" && !prev.error);

  const baseStatus: TestsSetupStatus = {
    state: hasNodeModules
      ? "ready"
      : wasAlreadyInstalled
        ? "ready"
        : prev?.state === "error"
          ? "error"
          : prev?.state === "installing"
            ? "installing"
            : "initializing",
    startedAt: prev?.startedAt ?? nowIso,
    updatedAt: nowIso,
    pid: prev?.pid,
    log: prev?.log ?? "",
    error: prev?.error,
  };

  if (fs.existsSync(nodeModulesPath) || wasAlreadyInstalled) {
    const ready: TestsSetupStatus = {
      ...baseStatus,
      state: "ready",
      error: undefined,
    };
    writeTestsSetupStatus(projectDir, ready);
    return ready;
  }

  writeTestsSetupStatus(projectDir, baseStatus);

  if (shouldStartInstall(projectDir, baseStatus)) {
    const lockPath = path.join(projectDir, TESTS_SETUP_LOCK_FILE);
    try {
      fs.writeFileSync(lockPath, nowIso);
    } catch {}

    appendTestsSetupLog(projectDir, `\n[${nowIso}] Running: pnpm install\n`);

    const child = spawn("pnpm", ["install"], {
      cwd: projectDir,
      env: process.env,
      shell: true,
    });

    if (child.pid) {
      runningSetups.set(projectDir, child.pid);
      const installing: TestsSetupStatus = {
        ...(readTestsSetupStatus(projectDir) ?? baseStatus),
        state: "installing",
        pid: child.pid,
        updatedAt: new Date().toISOString(),
        error: undefined,
      };
      writeTestsSetupStatus(projectDir, installing);
    }

    child.stdout.on("data", (d) => {
      appendTestsSetupLog(projectDir, d.toString());
    });
    child.stderr.on("data", (d) => {
      appendTestsSetupLog(projectDir, d.toString());
    });
    child.on("error", (err) => {
      runningSetups.delete(projectDir);
      try {
        fs.unlinkSync(lockPath);
      } catch {}

      const updatedAt = new Date().toISOString();
      const message =
        err instanceof Error ? err.stack || err.message : String(err);
      const failed: TestsSetupStatus = {
        ...(readTestsSetupStatus(projectDir) ?? baseStatus),
        state: "error",
        updatedAt,
        error: message,
      };
      writeTestsSetupStatus(projectDir, failed);
      appendTestsSetupLog(
        projectDir,
        `\n[${updatedAt}] Failed: ${failed.error}\n`,
      );
    });
    child.on("close", (code, signal) => {
      runningSetups.delete(projectDir);
      try {
        fs.unlinkSync(lockPath);
      } catch {}

      const updatedAt = new Date().toISOString();
      if (code === 0) {
        const done: TestsSetupStatus = {
          ...(readTestsSetupStatus(projectDir) ?? baseStatus),
          state: "ready",
          updatedAt,
          error: undefined,
        };
        writeTestsSetupStatus(projectDir, done);
        appendTestsSetupLog(projectDir, `\n[${updatedAt}] Done.\n`);
        return;
      }

      const reasonParts = [`pnpm install exited with code ${code ?? "null"}`];
      if (signal) reasonParts.push(`signal ${signal}`);
      const failed: TestsSetupStatus = {
        ...(readTestsSetupStatus(projectDir) ?? baseStatus),
        state: "error",
        updatedAt,
        error: reasonParts.join(" "),
      };
      writeTestsSetupStatus(projectDir, failed);
      appendTestsSetupLog(
        projectDir,
        `\n[${updatedAt}] Failed: ${failed.error}\n`,
      );
    });
  }

  return readTestsSetupStatus(projectDir) ?? baseStatus;
}

function ensureAgelumStructure(agelumDir: string) {
  const directories = [
    path.join("doc", "docs"),
    path.join("doc", "docs", "plan"),
    path.join("doc", "docs", "research"),
    path.join("doc", "docs", "specs"),
    path.join("ai", "commands"),
    path.join("ai", "cli-tools"),
    path.join("ai", "skills"),
    path.join("ai", "designs"),
    path.join("doc", "ideas"),
    path.join("work", "epics"),
    path.join("work", "tests"),
    path.join("work", "tasks", "doing"),
    path.join("work", "tasks", "done"),
    path.join("work", "tasks", "pending"),
  ];

  fs.mkdirSync(agelumDir, {
    recursive: true,
  });
  for (const dir of directories) {
    fs.mkdirSync(path.join(agelumDir, dir), { recursive: true });
  }
}

function buildFileTree(
  dir: string,
  basePath: string,
  allowedFileExtensions: string[] | null = null,
): FileNode | null {
  if (!fs.existsSync(dir)) return null;

  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) return null;

  const name = path.basename(dir);

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  // Default ignores
  const ignores = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".turbo",
    ".DS_Store",
    "thumbs.db",
  ]);

  const children = entries
    .filter((entry) => {
      if (ignores.has(entry.name)) return false;
      if (entry.isDirectory()) return true;
      if (!allowedFileExtensions) return true;
      return allowedFileExtensions.some((ext) => entry.name.endsWith(ext));
    })
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return buildFileTree(fullPath, basePath, allowedFileExtensions)!;
      } else {
        let size = 0;
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
        } catch (e) {}

        return {
          name: entry.name,
          path: fullPath,
          type: "file" as const,
          size,
        };
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "directory" ? -1 : 1;
    });

  let totalSize = children.reduce((acc, child) => acc + (child.size || 0), 0);

  return {
    name,
    path: dir,
    type: "directory",
    size: totalSize,
    children,
  };
}

function migrateAgelumStructure(repoPath: string) {
  const oldAgelumDir = path.join(repoPath, "agelum");
  const newAgelumDir = path.join(repoPath, ".agelum");

  if (fs.existsSync(oldAgelumDir) && !fs.existsSync(newAgelumDir)) {
    try {
      fs.renameSync(oldAgelumDir, newAgelumDir);
    } catch (e) {
      console.error("Failed to rename agelum to .agelum", e);
    }
  }
  if (fs.existsSync(newAgelumDir)) {
    // Create parent dirs
    ["doc", "work", "ai", path.join("doc", "docs")].forEach((d) => {
      const p = path.join(newAgelumDir, d);
      if (!fs.existsSync(p))
        fs.mkdirSync(p, {
          recursive: true,
        });
    });

    const moves = [
      { from: "docs", to: "doc/docs" },
      { from: "plan", to: "doc/docs/plan" },
      { from: "plans", to: "doc/docs/plan" },
      { from: path.join("doc", "plan"), to: path.join("doc", "docs", "plan") },
      { from: path.join("doc", "plans"), to: path.join("doc", "docs", "plan") },
      {
        from: "research",
        to: "doc/docs/research",
      },
      {
        from: path.join("doc", "research"),
        to: path.join("doc", "docs", "research"),
      },
      {
        from: "ideas",
        to: "doc/ideas",
      },
      {
        from: "epics",
        to: "work/epics",
      },
      {
        from: "tasks",
        to: "work/tasks",
      },
      {
        from: "commands",
        to: "ai/commands",
      },
      {
        from: "skills",
        to: "ai/skills",
      },
      {
        from: "agents",
        to: "ai/agents",
      },
      {
        from: "context",
        to: "doc/context",
      },
      {
        from: "designs",
        to: "ai/designs",
      },
    ];

    for (const move of moves) {
      const fromPath = path.join(newAgelumDir, move.from);
      const toPath = path.join(newAgelumDir, move.to);

      if (fs.existsSync(fromPath)) {
        if (!fs.existsSync(toPath)) {
          try {
            fs.renameSync(fromPath, toPath);
          } catch (e) {
            console.error(`Failed to move ${move.from} to ${move.to}`, e);
          }
        } else if (fromPath !== toPath) {
          // If destination exists, try to move contents
          try {
            const files = fs.readdirSync(fromPath);
            for (const file of files) {
              const fPath = path.join(fromPath, file);
              const tPath = path.join(toPath, file);
              if (!fs.existsSync(tPath)) {
                fs.renameSync(fPath, tPath);
              }
            }
            // If empty, remove old
            if (fs.readdirSync(fromPath).length === 0) {
              fs.rmdirSync(fromPath);
            }
          } catch (e) {
            console.error(`Failed to merge ${move.from} into ${move.to}`, e);
          }
        }
      }
    }
  }
}

function migrateAgelumTestsStructure(repoPath: string): string {
  const projectDir = path.join(repoPath, "agelum-test");
  const newTestsDir = path.join(projectDir, "tests");
  const oldTestsDir = path.join(repoPath, ".agelum", "work", "tests");
  const oldTestsSrcDir = path.join(oldTestsDir, "src");
  if (!fs.existsSync(projectDir)) {
    try {
      fs.mkdirSync(projectDir, { recursive: true });
    } catch {}
  }
  if (!fs.existsSync(newTestsDir) && fs.existsSync(oldTestsSrcDir)) {
    try {
      fs.mkdirSync(path.dirname(newTestsDir), {
        recursive: true,
      });
      fs.renameSync(oldTestsSrcDir, newTestsDir);
    } catch {}
  }

  const legacyRootFiles = ["package.json", "tsconfig.json"];
  for (const name of legacyRootFiles) {
    const from = path.join(oldTestsDir, name);
    const to = path.join(projectDir, name);
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      try {
        fs.renameSync(from, to);
      } catch {}
    }
  }

  normalizeAgelumTestProjectStructure(projectDir, newTestsDir);

  return newTestsDir;
}

function normalizeAgelumTestProjectStructure(
  projectDir: string,
  testsDir: string,
) {
  if (!fs.existsSync(testsDir)) return;

  const rootFiles = [
    ".env",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    TESTS_SETUP_STATUS_FILE,
    TESTS_SETUP_LOCK_FILE,
  ];

  for (const name of rootFiles) {
    const from = path.join(testsDir, name);
    if (!fs.existsSync(from)) continue;
    const to = path.join(projectDir, name);
    if (!fs.existsSync(to)) {
      try {
        fs.renameSync(from, to);
        continue;
      } catch {}
    }
    try {
      fs.rmSync(from, { force: true });
    } catch {}
  }

  const fromNodeModules = path.join(testsDir, "node_modules");
  const toNodeModules = path.join(projectDir, "node_modules");
  if (fs.existsSync(fromNodeModules)) {
    if (!fs.existsSync(toNodeModules)) {
      try {
        fs.renameSync(fromNodeModules, toNodeModules);
        return;
      } catch {}
    }
    try {
      fs.rmSync(fromNodeModules, { recursive: true, force: true });
    } catch {}
  }

  try {
    const entries = fs.readdirSync(testsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.endsWith(".ts")) continue;
      if (entry.name.endsWith(".tsx")) continue;
      const from = path.join(testsDir, entry.name);
      const to = path.join(projectDir, entry.name);
      if (!fs.existsSync(to)) {
        try {
          fs.renameSync(from, to);
          continue;
        } catch {}
      }
      try {
        fs.rmSync(from, { force: true });
      } catch {}
    }
  } catch {}
}

import { resolveProjectPath } from "@/lib/settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const subPath = searchParams.get("path");
  const isRoot = searchParams.get("root") === "true";

  if (!repo) {
    return NextResponse.json({
      tree: null,
      rootPath: "",
    });
  }

  try {
    const repoPath = await resolveProjectPath(repo);

    if (!repoPath) {
      console.error(`Repository path not found for: ${repo}`);
      return NextResponse.json({ tree: null, rootPath: "" }, { status: 404 });
    }

    // Legacy support for migration
    migrateAgelumStructure(repoPath);

    const basePath = "";

    let targetDir;
    if (isRoot) {
      targetDir = subPath ? path.join(repoPath, subPath) : repoPath;
    } else {
      const agelumDir = path.join(repoPath, ".agelum");
      ensureAgelumStructure(agelumDir);
      targetDir = subPath ? path.join(agelumDir, subPath) : agelumDir;
    }

    // Check if we are targeting tests
    if (subPath === "work/tests" && !isRoot) {
      const testsDir = migrateAgelumTestsStructure(repoPath);
      const projectDir = path.dirname(testsDir);
      const status = await ensureStagehandSetup(projectDir, testsDir);
      const tree = buildFileTree(testsDir, basePath, [".ts", ".tsx", ".md"]);
      const root: FileNode = {
        name: "tests",
        path: testsDir,
        type: "directory",
        size: tree?.size,
        children: tree?.children ?? [],
      };

      return NextResponse.json({
        tree: root,
        rootPath: testsDir,
        setupStatus: status,
      });
    }

    const tree = buildFileTree(
      targetDir,
      basePath,
      isRoot ? null : [".md", ".json", ".ts", ".tsx"],
    );

    return NextResponse.json({
      tree: tree || {
        name: subPath || (isRoot ? path.basename(repoPath) : ".agelum"),
        path: targetDir,
        type: "directory",
        size: 0,
        children: [],
      },
      rootPath: targetDir,
    });
  } catch (error) {
    console.error("Error in GET /api/files:", error);
    return NextResponse.json({ tree: null, rootPath: "" }, { status: 500 });
  }
}
