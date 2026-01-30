import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { readSettings } from "@/lib/settings";

function findAgelumTestsDir(
  inputPath: string,
): string | null {
  let current = inputPath;
  if (fs.existsSync(inputPath)) {
    try {
      if (
        fs.statSync(inputPath).isFile()
      ) {
        current =
          path.dirname(inputPath);
      }
    } catch {
      return null;
    }
  }

  while (current !== "/") {
    const base = path.basename(current);
    const parent = path.basename(
      path.dirname(current),
    );
    const grandParent = path.basename(
      path.dirname(
        path.dirname(current),
      ),
    );

    if (
      base === "tests" &&
      parent === "agelum-test"
    ) {
      return current;
    }

    // If we are in the src folder of the tests, that's our root
    if (
      base === "src" &&
      parent === "tests" &&
      grandParent === "work"
    ) {
      const greatGrandParent =
        path.basename(
          path.dirname(
            path.dirname(
              path.dirname(current),
            ),
          ),
        );
      if (
        greatGrandParent === ".agelum"
      ) {
        const repoRoot = path.dirname(
          path.dirname(
            path.dirname(
              path.dirname(current),
            ),
          ),
        );
        const newTestsDir = path.join(
          repoRoot,
          "agelum-test",
          "tests",
        );
        if (
          !fs.existsSync(newTestsDir) &&
          fs.existsSync(current)
        ) {
          try {
            fs.mkdirSync(
              path.dirname(newTestsDir),
              { recursive: true },
            );
            fs.renameSync(
              current,
              newTestsDir,
            );
          } catch {}
        }
        return fs.existsSync(
          newTestsDir,
        )
          ? newTestsDir
          : current;
      }
    }

    // If we are in the tests folder itself, use the src subfolder as the root
    if (
      base === "tests" &&
      parent === "work" &&
      grandParent === ".agelum"
    ) {
      const legacySrc = path.join(
        current,
        "src",
      );
      const repoRoot = path.dirname(
        path.dirname(
          path.dirname(current),
        ),
      );
      const newTestsDir = path.join(
        repoRoot,
        "agelum-test",
        "tests",
      );
      if (
        !fs.existsSync(newTestsDir) &&
        fs.existsSync(legacySrc)
      ) {
        try {
          fs.mkdirSync(
            path.dirname(newTestsDir),
            { recursive: true },
          );
          fs.renameSync(
            legacySrc,
            newTestsDir,
          );
        } catch {}
      }
      if (fs.existsSync(newTestsDir))
        return newTestsDir;
      return legacySrc;
    }
    current = path.dirname(current);
  }

  return null;
}

function dotenvEscape(
  value: string,
): string {
  if (
    /^[A-Za-z0-9_./:@+-]+$/.test(value)
  )
    return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function ensureEnvFile(
  dir: string,
  entries: Record<
    string,
    string | undefined
  >,
) {
  const pairs = Object.entries(
    entries,
  ).filter(
    ([, v]) =>
      typeof v === "string" &&
      v.length > 0,
  ) as Array<[string, string]>;
  if (pairs.length === 0) return;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }

  const envPath = path.join(
    dir,
    ".env",
  );
  let lines: string[] = [];
  const lineIndexByKey = new Map<
    string,
    number
  >();

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(
      envPath,
      "utf8",
    );
    lines = raw.split(/\r?\n/);
    for (
      let i = 0;
      i < lines.length;
      i++
    ) {
      const line = lines[i];
      if (!line) continue;
      if (/^\s*#/.test(line)) continue;
      const match =
        /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(
          line,
        );
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

  while (
    lines.length > 0 &&
    lines[lines.length - 1] === ""
  ) {
    lines.pop();
  }
  fs.writeFileSync(
    envPath,
    `${lines.join("\n")}\n`,
    {
      mode: 0o600,
    },
  );
}

function ensureAgelumTestEnvFiles(
  testsDir: string,
  entries: Record<
    string,
    string | undefined
  >,
) {
  ensureEnvFile(testsDir, entries);
  const parentDir =
    path.dirname(testsDir);
  if (
    path.basename(parentDir) ===
    "agelum-test"
  ) {
    ensureEnvFile(parentDir, entries);
  }
}

function ensureStagehandTestProject(
  testsDir: string,
) {
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, {
      recursive: true,
    });
  }

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
}

function hasStagehandInstalled(
  testsDir: string,
): boolean {
  const stagehandPath = path.join(
    testsDir,
    "node_modules",
    "@browserbasehq",
    "stagehand",
  );
  return fs.existsSync(stagehandPath);
}

async function runCommandStreaming(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  options: {
    command: string;
    args: string[];
    cwd: string;
    env: NodeJS.ProcessEnv;
    onStdoutChunk?: (
      chunk: string,
    ) => void;
    onStderrChunk?: (
      chunk: string,
    ) => void;
  },
): Promise<number | null> {
  return await new Promise<
    number | null
  >((resolve) => {
    const child = spawn(
      options.command,
      options.args,
      {
        cwd: options.cwd,
        env: options.env,
        shell: true,
      },
    );

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      options.onStdoutChunk?.(chunk);
      controller.enqueue(
        encoder.encode(chunk),
      );
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      options.onStderrChunk?.(chunk);
      controller.enqueue(
        encoder.encode(chunk),
      );
    });

    child.on("close", (code) => {
      resolve(code);
    });

    child.on("error", (err) => {
      controller.enqueue(
        encoder.encode(
          `\nFailed to start process: ${err.message}\n`,
        ),
      );
      resolve(null);
    });
  });
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const { path: testPath } = body;

    if (!testPath) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 },
      );
    }

    if (!fs.existsSync(testPath)) {
      return NextResponse.json(
        {
          error: "File does not exist",
        },
        { status: 404 },
      );
    }

    let projectRoot = testPath;
    if (
      fs.statSync(testPath).isFile()
    ) {
      projectRoot =
        path.dirname(testPath);
    }
    // Walk up until we find package.json
    while (
      projectRoot !== "/" &&
      !fs.existsSync(
        path.join(
          projectRoot,
          "package.json",
        ),
      )
    ) {
      projectRoot = path.dirname(
        projectRoot,
      );
    }

    if (projectRoot === "/") {
      // Fallback: assume parent of parent if src is used
      projectRoot = path.dirname(
        path.dirname(testPath),
      );
    }

    let filesToRun: string[] = [];
    if (
      fs
        .statSync(testPath)
        .isDirectory()
    ) {
      const findTsFiles = (
        dir: string,
      ) => {
        const files = fs.readdirSync(
          dir,
          { withFileTypes: true },
        );
        for (const file of files) {
          const fullPath = path.join(
            dir,
            file.name,
          );
          if (file.isDirectory()) {
            findTsFiles(fullPath);
          } else if (
            file.isFile() &&
            file.name.endsWith(".ts")
          ) {
            filesToRun.push(fullPath);
          }
        }
      };
      findTsFiles(testPath);
    } else {
      filesToRun = [testPath];
    }

    if (filesToRun.length === 0) {
      return NextResponse.json(
        {
          error: "No test files found",
        },
        { status: 404 },
      );
    }

    const settings = readSettings();

    const chunkLooksErrorLike = (
      text: string,
    ) => {
      return /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|AggregateError):|\bUnhandledPromiseRejection\b|\bERR_[A-Z0-9_]+\b/.test(
        text,
      );
    };

    // Create a readable stream for the output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const agelumTestsDir =
          findAgelumTestsDir(testPath);

        const runCwd =
          agelumTestsDir ?? projectRoot;

        if (agelumTestsDir) {
          ensureStagehandTestProject(
            agelumTestsDir,
          );
        }

        const baseEnv: NodeJS.ProcessEnv =
          {
            ...process.env,
            PATH: process.env.PATH,
            BROWSERBASE_API_KEY:
              settings.stagehandApiKey ||
              process.env
                .BROWSERBASE_API_KEY,
            OPENAI_API_KEY:
              settings.openaiApiKey ||
              process.env
                .OPENAI_API_KEY,
            ANTHROPIC_API_KEY:
              settings.anthropicApiKey ||
              process.env
                .ANTHROPIC_API_KEY,
            GOOGLE_GENERATIVE_AI_API_KEY:
              settings.googleApiKey ||
              process.env
                .GOOGLE_GENERATIVE_AI_API_KEY,
          };

        if (agelumTestsDir) {
          ensureAgelumTestEnvFiles(
            agelumTestsDir,
            {
              BROWSERBASE_API_KEY:
                baseEnv.BROWSERBASE_API_KEY,
              OPENAI_API_KEY:
                baseEnv.OPENAI_API_KEY,
              ANTHROPIC_API_KEY:
                baseEnv.ANTHROPIC_API_KEY,
              GOOGLE_GENERATIVE_AI_API_KEY:
                baseEnv.GOOGLE_GENERATIVE_AI_API_KEY,
            },
          );
        }

        if (
          agelumTestsDir &&
          !hasStagehandInstalled(
            agelumTestsDir,
          )
        ) {
          controller.enqueue(
            encoder.encode(
              `\n\n--- Installing test dependencies ---\n`,
            ),
          );
          const installCode =
            await runCommandStreaming(
              controller,
              encoder,
              {
                command: "pnpm",
                args: ["install"],
                cwd: agelumTestsDir,
                env: baseEnv,
              },
            );

          if (installCode !== 0) {
            controller.enqueue(
              encoder.encode(
                `\nDependency install failed (exit code ${installCode}).\n`,
              ),
            );
            controller.close();
            return;
          }
        }

        const tsxCandidatePaths = [
          path.join(
            runCwd,
            "node_modules",
            ".bin",
            "tsx",
          ),
          path.join(
            projectRoot,
            "node_modules",
            ".bin",
            "tsx",
          ),
          path.join(
            process.cwd(),
            "node_modules",
            ".bin",
            "tsx",
          ),
        ];
        const tsxPath =
          tsxCandidatePaths.find((p) =>
            fs.existsSync(p),
          ) ?? null;

        for (const file of filesToRun) {
          controller.enqueue(
            encoder.encode(
              `\n\n--- Running ${path.basename(file)} ---\n`,
            ),
          );

          let stdoutTail = "";
          let stderrTail = "";
          let sawErrorLikeInStdout = false;
          let sawErrorLikeInStderr = false;

          const command =
            tsxPath ?? "npx";
          const args = tsxPath
            ? [file]
            : ["tsx", file];
          const code =
            await runCommandStreaming(
              controller,
              encoder,
              {
                command,
                args,
                cwd: runCwd,
                env: baseEnv,
                onStdoutChunk: (
                  chunk,
                ) => {
                  stdoutTail = (
                    stdoutTail + chunk
                  ).slice(-4000);
                  if (
                    !sawErrorLikeInStdout &&
                    chunkLooksErrorLike(
                      stdoutTail,
                    )
                  ) {
                    sawErrorLikeInStdout = true;
                  }
                },
                onStderrChunk: (
                  chunk,
                ) => {
                  stderrTail = (
                    stderrTail + chunk
                  ).slice(-4000);
                  if (
                    !sawErrorLikeInStderr &&
                    chunkLooksErrorLike(
                      stderrTail,
                    )
                  ) {
                    sawErrorLikeInStderr = true;
                  }
                },
              },
            );

          const errorDetectedNote =
            sawErrorLikeInStdout ||
            sawErrorLikeInStderr
              ? ` (errors detected in ${[
                  sawErrorLikeInStdout
                    ? "stdout"
                    : null,
                  sawErrorLikeInStderr
                    ? "stderr"
                    : null,
                ]
                  .filter(Boolean)
                  .join("+")})`
              : "";

          controller.enqueue(
            encoder.encode(
              `\nTest ${path.basename(file)} exited with code ${code}${errorDetectedNote}\n`,
            ),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to run test" },
      { status: 500 },
    );
  }
}
