import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { readSettings } from "@/lib/settings";
import {
  ensureEnvFileMissingOnly,
  readDotenvFile,
} from "@/lib/env-file";

function findAgelumTestsDir(
  inputPath: string,
): {
  projectDir: string;
  testsDir: string;
} | null {
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
      const projectDir =
        path.dirname(current);
      normalizeAgelumTestProjectStructure(
        projectDir,
        current,
      );
      return {
        projectDir,
        testsDir: current,
      };
    }
    if (base === "agelum-test") {
      const testsDir = path.join(
        current,
        "tests",
      );
      normalizeAgelumTestProjectStructure(
        current,
        testsDir,
      );
      return {
        projectDir: current,
        testsDir,
      };
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
        const projectDir = path.join(
          repoRoot,
          "agelum-test",
        );
        const newTestsDir = path.join(
          projectDir,
          "tests",
        );
        if (
          !fs.existsSync(newTestsDir) &&
          fs.existsSync(current)
        ) {
          try {
            fs.mkdirSync(projectDir, {
              recursive: true,
            });
            fs.renameSync(
              current,
              newTestsDir,
            );
          } catch {}
        }
        const oldTestsDir = path.join(
          repoRoot,
          ".agelum",
          "work",
          "tests",
        );
        for (const name of [
          "package.json",
          "tsconfig.json",
        ]) {
          const from = path.join(
            oldTestsDir,
            name,
          );
          const to = path.join(
            projectDir,
            name,
          );
          if (
            fs.existsSync(from) &&
            !fs.existsSync(to)
          ) {
            try {
              fs.renameSync(from, to);
            } catch {}
          }
        }

        normalizeAgelumTestProjectStructure(
          projectDir,
          newTestsDir,
        );
        return {
          projectDir,
          testsDir: fs.existsSync(
            newTestsDir,
          )
            ? newTestsDir
            : current,
        };
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
      const projectDir = path.join(
        repoRoot,
        "agelum-test",
      );
      const newTestsDir = path.join(
        projectDir,
        "tests",
      );
      if (
        !fs.existsSync(newTestsDir) &&
        fs.existsSync(legacySrc)
      ) {
        try {
          fs.mkdirSync(projectDir, {
            recursive: true,
          });
          fs.renameSync(
            legacySrc,
            newTestsDir,
          );
        } catch {}
      }
      for (const name of [
        "package.json",
        "tsconfig.json",
      ]) {
        const from = path.join(
          current,
          name,
        );
        const to = path.join(
          projectDir,
          name,
        );
        if (
          fs.existsSync(from) &&
          !fs.existsSync(to)
        ) {
          try {
            fs.renameSync(from, to);
          } catch {}
        }
      }

      normalizeAgelumTestProjectStructure(
        projectDir,
        newTestsDir,
      );
      if (fs.existsSync(newTestsDir)) {
        return {
          projectDir,
          testsDir: newTestsDir,
        };
      }
      return {
        projectDir,
        testsDir: legacySrc,
      };
    }
    current = path.dirname(current);
  }

  return null;
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
    ".agelum-tests-setup.json",
    ".agelum-tests-setup.lock",
  ];

  for (const name of rootFiles) {
    const from = path.join(
      testsDir,
      name,
    );
    if (!fs.existsSync(from)) continue;
    const to = path.join(
      projectDir,
      name,
    );
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

  const fromNodeModules = path.join(
    testsDir,
    "node_modules",
  );
  const toNodeModules = path.join(
    projectDir,
    "node_modules",
  );
  if (fs.existsSync(fromNodeModules)) {
    if (!fs.existsSync(toNodeModules)) {
      try {
        fs.renameSync(
          fromNodeModules,
          toNodeModules,
        );
        return;
      } catch {}
    }
    try {
      fs.rmSync(fromNodeModules, {
        recursive: true,
        force: true,
      });
    } catch {}
  }

  try {
    const entries = fs.readdirSync(
      testsDir,
      { withFileTypes: true },
    );
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.endsWith(".ts"))
        continue;
      const from = path.join(
        testsDir,
        entry.name,
      );
      const to = path.join(
        projectDir,
        entry.name,
      );
      if (!fs.existsSync(to)) {
        try {
          fs.renameSync(from, to);
          continue;
        } catch {}
      }
      try {
        fs.rmSync(from, {
          force: true,
        });
      } catch {}
    }
  } catch {}
}

function ensureAgelumTestEnvFiles(
  projectDir: string,
  entries: Record<
    string,
    string | undefined
  >,
) {
  ensureEnvFileMissingOnly(
    projectDir,
    entries,
  );
}

function ensureStagehandTestProject(
  projectDir: string,
) {
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, {
      recursive: true,
    });
  }

  const workspacePath = path.join(
    projectDir,
    "pnpm-workspace.yaml",
  );
  if (!fs.existsSync(workspacePath)) {
    fs.writeFileSync(
      workspacePath,
      "packages: []\n",
    );
  }

  const packageJsonPath = path.join(
    projectDir,
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
    projectDir,
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
  projectDir: string,
): boolean {
  const stagehandPath = path.join(
    projectDir,
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

    const settings = await readSettings();

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

        const agelumTestProjectDir =
          agelumTestsDir?.projectDir ??
          null;
        const runCwd =
          agelumTestProjectDir ??
          projectRoot;

        if (agelumTestProjectDir) {
          ensureStagehandTestProject(
            agelumTestProjectDir,
          );
        }

        const dotenvValues =
          agelumTestProjectDir
            ? readDotenvFile(
                path.join(
                  agelumTestProjectDir,
                  ".env",
                ),
              )
            : {};

        const seedEntries: Record<
          string,
          string | undefined
        > = {
          BROWSERBASE_API_KEY:
            settings.stagehandApiKey ||
            process.env
              .BROWSERBASE_API_KEY,
          OPENAI_API_KEY:
            settings.openaiApiKey ||
            process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY:
            settings.anthropicApiKey ||
            process.env
              .ANTHROPIC_API_KEY,
          GOOGLE_GENERATIVE_AI_API_KEY:
            settings.googleApiKey ||
            process.env
              .GOOGLE_GENERATIVE_AI_API_KEY,
          XAI_API_KEY:
            settings.grokApiKey ||
            process.env.XAI_API_KEY,
        };

        if (agelumTestProjectDir) {
          ensureAgelumTestEnvFiles(
            agelumTestProjectDir,
            seedEntries,
          );
        }

        const baseEnv: NodeJS.ProcessEnv =
          {
            ...process.env,
            PATH: process.env.PATH,
            BROWSERBASE_API_KEY:
              dotenvValues.BROWSERBASE_API_KEY ||
              seedEntries.BROWSERBASE_API_KEY,
            OPENAI_API_KEY:
              dotenvValues.OPENAI_API_KEY ||
              seedEntries.OPENAI_API_KEY,
            ANTHROPIC_API_KEY:
              dotenvValues.ANTHROPIC_API_KEY ||
              seedEntries.ANTHROPIC_API_KEY,
            GOOGLE_GENERATIVE_AI_API_KEY:
              dotenvValues.GOOGLE_GENERATIVE_AI_API_KEY ||
              seedEntries.GOOGLE_GENERATIVE_AI_API_KEY,
            XAI_API_KEY:
              dotenvValues.XAI_API_KEY ||
              seedEntries.XAI_API_KEY,
          };

        const missingMessages: string[] =
          [];
        if (
          !baseEnv.BROWSERBASE_API_KEY
        ) {
          missingMessages.push(
            "BROWSERBASE_API_KEY (only required for Browserbase runs; LOCAL Stagehand runs can work without it)",
          );
        }
        if (
          !baseEnv.OPENAI_API_KEY &&
          !baseEnv.ANTHROPIC_API_KEY &&
          !baseEnv.GOOGLE_GENERATIVE_AI_API_KEY &&
          !baseEnv.XAI_API_KEY
        ) {
          missingMessages.push(
            "OPENAI_API_KEY (or ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / XAI_API_KEY) (required for Stagehand LLM features like extract/act)",
          );
        }
        if (
          missingMessages.length > 0
        ) {
          controller.enqueue(
            encoder.encode(
              `\nEnvironment variables not set:\n- ${missingMessages.join("\n- ")}\n\nYou can set them in Settings → Tests, in agelum-test/.env, or in your shell environment.\n`,
            ),
          );
        }

        if (
          agelumTestProjectDir &&
          !hasStagehandInstalled(
            agelumTestProjectDir,
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
                cwd: agelumTestProjectDir,
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
