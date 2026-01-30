import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { readSettings } from "@/lib/settings";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
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

const TESTS_SETUP_STATUS_FILE =
  ".agelum-tests-setup.json";
const TESTS_SETUP_LOCK_FILE =
  ".agelum-tests-setup.lock";
const MAX_STATUS_LOG_CHARS = 50_000;

const runningSetups = new Map<
  string,
  number
>();

function dotenvEscape(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function ensureEnvFile(
  dir: string,
  entries: Record<string, string | undefined>,
) {
  const pairs = Object.entries(entries).filter(
    ([, v]) => typeof v === "string" && v.length > 0,
  ) as Array<[string, string]>;
  if (pairs.length === 0) return;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const envPath = path.join(dir, ".env");
  let lines: string[] = [];
  const lineIndexByKey = new Map<string, number>();

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (/^\s*#/.test(line)) continue;
      const match =
        /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (!match) continue;
      lineIndexByKey.set(match[1], i);
    }
  }

  for (const [key, value] of pairs) {
    const nextLine = `${key}=${dotenvEscape(value)}`;
    const idx = lineIndexByKey.get(key);
    if (typeof idx === "number") {
      lines[idx] = nextLine;
    } else {
      lines.push(nextLine);
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, {
    mode: 0o600,
  });
}

function ensureAgelumTestEnvFiles(
  testsDir: string,
  entries: Record<string, string | undefined>,
) {
  ensureEnvFile(testsDir, entries);
  const parentDir = path.dirname(testsDir);
  if (path.basename(parentDir) === "agelum-test") {
    ensureEnvFile(parentDir, entries);
  }
}

function readTestsSetupStatus(
  testsDir: string,
): TestsSetupStatus | null {
  const p = path.join(
    testsDir,
    TESTS_SETUP_STATUS_FILE,
  );
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(
      p,
      "utf8",
    );
    return JSON.parse(
      raw,
    ) as TestsSetupStatus;
  } catch {
    return null;
  }
}

function writeTestsSetupStatus(
  testsDir: string,
  status: TestsSetupStatus,
) {
  const p = path.join(
    testsDir,
    TESTS_SETUP_STATUS_FILE,
  );
  fs.writeFileSync(
    p,
    JSON.stringify(status, null, 2),
  );
}

function truncateLog(
  log: string,
): string {
  if (
    log.length <= MAX_STATUS_LOG_CHARS
  )
    return log;
  return log.slice(
    log.length - MAX_STATUS_LOG_CHARS,
  );
}

function appendTestsSetupLog(
  testsDir: string,
  chunk: string,
) {
  const prev = readTestsSetupStatus(
    testsDir,
  ) ?? {
    state: "missing" as const,
    updatedAt: new Date().toISOString(),
    log: "",
  };
  const next: TestsSetupStatus = {
    ...prev,
    updatedAt: new Date().toISOString(),
    log: truncateLog(prev.log + chunk),
  };
  writeTestsSetupStatus(testsDir, next);
}

function isPidRunning(
  pid?: number,
): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function shouldStartInstall(
  testsDir: string,
  status: TestsSetupStatus | null,
): boolean {
  const nodeModulesPath = path.join(
    testsDir,
    "node_modules",
  );
  if (fs.existsSync(nodeModulesPath))
    return false;

  // Check for pnpm-lock.yaml - if it exists, install was already done
  const pnpmLockPath = path.join(
    testsDir,
    "pnpm-lock.yaml",
  );
  if (fs.existsSync(pnpmLockPath))
    return false;

  if (
    status?.state === "ready" &&
    !status.error
  )
    return false;

  const runningPid =
    runningSetups.get(testsDir);
  if (
    runningPid &&
    isPidRunning(runningPid)
  )
    return false;

  const lockPath = path.join(
    testsDir,
    TESTS_SETUP_LOCK_FILE,
  );
  if (fs.existsSync(lockPath)) {
    try {
      const stat =
        fs.statSync(lockPath);
      const ageMs =
        Date.now() - stat.mtimeMs;
      if (ageMs < 30 * 60 * 1000)
        return false;
    } catch {
      return false;
    }
  }

  if (status?.state === "installing") {
    if (isPidRunning(status.pid))
      return false;
  }

  return true;
}

function ensureStagehandSetup(
  testsDir: string,
): TestsSetupStatus {
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, {
      recursive: true,
    });
  }

  const settings = readSettings();
  ensureAgelumTestEnvFiles(testsDir, {
    BROWSERBASE_API_KEY:
      settings.stagehandApiKey ||
      process.env.BROWSERBASE_API_KEY,
    OPENAI_API_KEY:
      settings.openaiApiKey ||
      process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY:
      settings.anthropicApiKey ||
      process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY:
      settings.googleApiKey ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  // Add pnpm-workspace.yaml to isolate from monorepo
  const workspacePath = path.join(
    testsDir,
    "pnpm-workspace.yaml",
  );
  if (!fs.existsSync(workspacePath)) {
    fs.writeFileSync(
      workspacePath,
      "packages: []\n",
    );
  }

  const packageJsonPath = path.join(
    testsDir,
    "package.json",
  );

  const srcDir = testsDir; // Tests are directly in the provided directory

  if (!fs.existsSync(packageJsonPath)) {
    const packageJson = {
      name: "browser-tests",
      version: "1.0.0",
      packageManager: "pnpm@9.0.0",
      dependencies: {
        "@browserbasehq/stagehand":
          "latest",
        dotenv: "latest",
        zod: "latest",
      },
      devDependencies: {
        tsx: "latest",
        typescript: "latest",
      },
    };
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        packageJson,
        null,
        2,
      ),
    );
  }

  const tsConfigPath = path.join(
    testsDir,
    "tsconfig.json",
  );
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
    fs.writeFileSync(
      tsConfigPath,
      JSON.stringify(tsConfig, null, 2),
    );
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
  if (
    !fs.existsSync(
      path.join(srcDir, "example.ts"),
    )
  ) {
    fs.writeFileSync(
      path.join(srcDir, "example.ts"),
      exampleTest,
    );
  }

  const nodeModulesPath = path.join(
    testsDir,
    "node_modules",
  );
  const pnpmLockPath = path.join(
    testsDir,
    "pnpm-lock.yaml",
  );
  const nowIso =
    new Date().toISOString();
  const prev = readTestsSetupStatus(
    testsDir,
  );

  const hasNodeModules = fs.existsSync(
    nodeModulesPath,
  );
  const hasLockFile = fs.existsSync(
    pnpmLockPath,
  );
  const wasAlreadyInstalled =
    hasNodeModules ||
    hasLockFile ||
    (prev?.state === "ready" &&
      !prev.error);

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
    startedAt:
      prev?.startedAt ?? nowIso,
    updatedAt: nowIso,
    pid: prev?.pid,
    log: prev?.log ?? "",
    error: prev?.error,
  };

  if (
    fs.existsSync(nodeModulesPath) ||
    wasAlreadyInstalled
  ) {
    const ready: TestsSetupStatus = {
      ...baseStatus,
      state: "ready",
      error: undefined,
    };
    writeTestsSetupStatus(
      testsDir,
      ready,
    );
    return ready;
  }

  writeTestsSetupStatus(
    testsDir,
    baseStatus,
  );

  if (
    shouldStartInstall(
      testsDir,
      baseStatus,
    )
  ) {
    const lockPath = path.join(
      testsDir,
      TESTS_SETUP_LOCK_FILE,
    );
    try {
      fs.writeFileSync(
        lockPath,
        nowIso,
      );
    } catch {}

    appendTestsSetupLog(
      testsDir,
      `\n[${nowIso}] Running: pnpm install\n`,
    );

    const child = spawn(
      "pnpm",
      ["install"],
      {
        cwd: testsDir,
        env: process.env,
        shell: true,
      },
    );

    if (child.pid) {
      runningSetups.set(
        testsDir,
        child.pid,
      );
      const installing: TestsSetupStatus =
        {
          ...(readTestsSetupStatus(
            testsDir,
          ) ?? baseStatus),
          state: "installing",
          pid: child.pid,
          updatedAt:
            new Date().toISOString(),
          error: undefined,
        };
      writeTestsSetupStatus(
        testsDir,
        installing,
      );
    }

    child.stdout.on("data", (d) => {
      appendTestsSetupLog(
        testsDir,
        d.toString(),
      );
    });
    child.stderr.on("data", (d) => {
      appendTestsSetupLog(
        testsDir,
        d.toString(),
      );
    });
    child.on("error", (err) => {
      runningSetups.delete(testsDir);
      try {
        fs.unlinkSync(lockPath);
      } catch {}

      const updatedAt =
        new Date().toISOString();
      const message =
        err instanceof Error
          ? err.stack || err.message
          : String(err);
      const failed: TestsSetupStatus = {
        ...(readTestsSetupStatus(
          testsDir,
        ) ?? baseStatus),
        state: "error",
        updatedAt,
        error: message,
      };
      writeTestsSetupStatus(
        testsDir,
        failed,
      );
      appendTestsSetupLog(
        testsDir,
        `\n[${updatedAt}] Failed: ${failed.error}\n`,
      );
    });
    child.on(
      "close",
      (code, signal) => {
        runningSetups.delete(
          testsDir,
        );
        try {
          fs.unlinkSync(lockPath);
        } catch {}

        const updatedAt =
          new Date().toISOString();
        if (code === 0) {
          const done: TestsSetupStatus =
            {
              ...(readTestsSetupStatus(
                testsDir,
              ) ?? baseStatus),
              state: "ready",
              updatedAt,
              error: undefined,
            };
          writeTestsSetupStatus(
            testsDir,
            done,
          );
          appendTestsSetupLog(
            testsDir,
            `\n[${updatedAt}] Done.\n`,
          );
          return;
        }

        const reasonParts = [
          `pnpm install exited with code ${code ?? "null"}`,
        ];
        if (signal)
          reasonParts.push(
            `signal ${signal}`,
          );
        const failed: TestsSetupStatus =
          {
            ...(readTestsSetupStatus(
              testsDir,
            ) ?? baseStatus),
            state: "error",
            updatedAt,
            error:
              reasonParts.join(" "),
          };
        writeTestsSetupStatus(
          testsDir,
          failed,
        );
        appendTestsSetupLog(
          testsDir,
          `\n[${updatedAt}] Failed: ${failed.error}\n`,
        );
      },
    );
  }

  return (
    readTestsSetupStatus(testsDir) ??
    baseStatus
  );
}

function ensureAgelumStructure(
  agelumDir: string,
) {
  const directories = [
    path.join("doc", "plan"),
    path.join("doc", "research"),
    path.join("doc", "docs"),
    path.join("ai", "commands"),
    path.join("ai", "cli-tools"),
    path.join("doc", "ideas"),
    path.join("work", "epics"),
    path.join("work", "tests"),
    path.join("work", "tasks", "doing"),
    path.join("work", "tasks", "done"),
    path.join(
      "work",
      "tasks",
      "pending",
    ),
  ];

  fs.mkdirSync(agelumDir, {
    recursive: true,
  });
  for (const dir of directories) {
    fs.mkdirSync(
      path.join(agelumDir, dir),
      { recursive: true },
    );
  }
}

function buildFileTree(
  dir: string,
  basePath: string,
  allowedFileExtensions: string[] = [
    ".md",
  ],
): FileNode | null {
  if (!fs.existsSync(dir)) return null;

  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) return null;

  const name = path.basename(dir);
  void basePath;

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });
  const children = entries
    .filter((entry) => {
      if (entry.name.startsWith("."))
        return false;
      if (entry.isDirectory())
        return true;
      return (
        entry.isFile() &&
        allowedFileExtensions.some(
          (ext) =>
            entry.name.endsWith(ext),
        )
      );
    })
    .map((entry) => {
      const fullPath = path.join(
        dir,
        entry.name,
      );
      if (entry.isDirectory()) {
        return buildFileTree(
          fullPath,
          basePath,
          allowedFileExtensions,
        )!;
      } else {
        return {
          name: entry.name,
          path: fullPath,
          type: "file" as const,
        };
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type === b.type)
        return a.name.localeCompare(
          b.name,
        );
      return a.type === "directory"
        ? -1
        : 1;
    });

  return {
    name,
    path: dir,
    type: "directory",
    children,
  };
}

function migrateAgelumStructure(
  repoPath: string,
) {
  const oldAgelumDir = path.join(
    repoPath,
    "agelum",
  );
  const newAgelumDir = path.join(
    repoPath,
    ".agelum",
  );

  if (
    fs.existsSync(oldAgelumDir) &&
    !fs.existsSync(newAgelumDir)
  ) {
    try {
      fs.renameSync(
        oldAgelumDir,
        newAgelumDir,
      );
    } catch (e) {
      console.error(
        "Failed to rename agelum to .agelum",
        e,
      );
    }
  }

  if (fs.existsSync(newAgelumDir)) {
    const moves = [
      { from: "docs", to: "doc/docs" },
      { from: "plan", to: "doc/plan" },
      { from: "plans", to: "doc/plan" },
      {
        from: "research",
        to: "doc/research",
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
    ];

    // Create parent dirs
    ["doc", "work", "ai"].forEach(
      (d) => {
        const p = path.join(
          newAgelumDir,
          d,
        );
        if (!fs.existsSync(p))
          fs.mkdirSync(p, {
            recursive: true,
          });
      },
    );

    for (const move of moves) {
      const fromPath = path.join(
        newAgelumDir,
        move.from,
      );
      const toPath = path.join(
        newAgelumDir,
        move.to,
      );

      if (fs.existsSync(fromPath)) {
        if (!fs.existsSync(toPath)) {
          try {
            fs.renameSync(
              fromPath,
              toPath,
            );
          } catch (e) {
            console.error(
              `Failed to move ${move.from} to ${move.to}`,
              e,
            );
          }
        }
      }
    }
  }
}

function migrateAgelumTestsStructure(
  repoPath: string,
): string {
  const newTestsDir = path.join(
    repoPath,
    "agelum-test",
    "tests",
  );
  const oldTestsSrcDir = path.join(
    repoPath,
    ".agelum",
    "work",
    "tests",
    "src",
  );
  if (
    !fs.existsSync(newTestsDir) &&
    fs.existsSync(oldTestsSrcDir)
  ) {
    try {
      fs.mkdirSync(path.dirname(newTestsDir), {
        recursive: true,
      });
      fs.renameSync(oldTestsSrcDir, newTestsDir);
    } catch {}
  }
  return newTestsDir;
}

import { resolveProjectPath } from "@/lib/settings";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const repo = searchParams.get("repo");
  const subPath =
    searchParams.get("path");

  if (!repo) {
    return NextResponse.json({
      tree: null,
      rootPath: "",
    });
  }

  try {
    const repoPath =
      resolveProjectPath(repo);

    if (!repoPath) {
      console.error(
        `Repository path not found for: ${repo}`,
      );
      return NextResponse.json(
        { tree: null, rootPath: "" },
        { status: 404 },
      );
    }

    // Legacy support for migration
    migrateAgelumStructure(repoPath);

    const basePath = ""; // Unused in buildFileTree but required by signature

    const agelumDir = path.join(
      repoPath,
      ".agelum",
    );

    ensureAgelumStructure(agelumDir);

    let targetDir = subPath
      ? path.join(agelumDir, subPath)
      : agelumDir;

    // Check if we are targeting tests
    if (subPath === "work/tests") {
      const testsDir =
        migrateAgelumTestsStructure(repoPath);
      const status =
        ensureStagehandSetup(testsDir);
      const tree = buildFileTree(
        testsDir,
        basePath,
        [".ts", ".tsx", ".md"],
      );
      const root: FileNode = {
        name: "tests",
        path: testsDir,
        type: "directory",
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
    );

    return NextResponse.json({
      tree: tree || {
        name: subPath || ".agelum",
        path: targetDir,
        type: "directory",
        children: [],
      },
      rootPath: targetDir,
    });
  } catch (error) {
    return NextResponse.json(
      { tree: null, rootPath: "" },
      { status: 500 },
    );
  }
}
