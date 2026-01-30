import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { executeAgentCommand } from "@/lib/agent-tools";
import { resolveProjectPath, readSettings } from "@/lib/settings";
import { execSync } from "child_process";

interface Task {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  epic?: string;
  assignee?: string;
  path: string;
}

function resolveRepoDirs(
  repo: string,
): {
  repoDir: string;
  primaryAgelumDir: string;
  legacyAgelumDir: string;
} {
  const repoDir =
    resolveProjectPath(repo);

  if (!repoDir) {
    throw new Error(
      `Repository not found: ${repo}`,
    );
  }

  return {
    repoDir,
    primaryAgelumDir: path.join(
      repoDir,
      ".agelum",
    ),
    legacyAgelumDir: path.join(
      repoDir,
      "agelum",
    ),
  };
}

function resolveTasksRoots(
  repo: string,
): {
  primaryTasksRoot: string;
  legacyTasksRoot: string;
} {
  const {
    primaryAgelumDir,
    legacyAgelumDir,
  } = resolveRepoDirs(repo);
  return {
    primaryTasksRoot: path.join(
      primaryAgelumDir,
      "work",
      "tasks",
    ),
    legacyTasksRoot: path.join(
      legacyAgelumDir,
      "tasks",
    ),
  };
}

function ensureAgelumStructure(
  agelumDir: string,
) {
  const directories = [
    path.join("doc", "plan"),
    path.join("doc", "docs"),
    path.join("ai", "commands"),
    path.join(
      "doc",
      "ideas",
      "thinking",
    ),
    path.join(
      "doc",
      "ideas",
      "important",
    ),
    path.join(
      "doc",
      "ideas",
      "priority",
    ),
    path.join(
      "doc",
      "ideas",
      "planned",
    ),
    path.join("doc", "ideas", "done"),
    path.join(
      "work",
      "epics",
      "backlog",
    ),
    path.join(
      "work",
      "epics",
      "priority",
    ),
    path.join(
      "work",
      "epics",
      "pending",
    ),
    path.join("work", "epics", "doing"),
    path.join("work", "epics", "done"),
    path.join(
      "work",
      "tasks",
      "backlog",
    ),
    path.join(
      "work",
      "tasks",
      "priority",
    ),
    path.join(
      "work",
      "tasks",
      "pending",
    ),
    path.join("work", "tasks", "doing"),
    path.join("work", "tasks", "done"),
    path.join("work", "tests"),
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

function fileNameToId(
  fileName: string,
): string {
  return fileName.replace(".md", "");
}

function sanitizeTaskTitleToFileBase(
  title: string,
): string {
  return (
    title
      .trim()
      .replace(/[\\/]/g, "-")
      .replace(
        /[<>:"|?*\u0000-\u001F]/g,
        "",
      )
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .replace(/\.+$/, "")
      .slice(0, 120)
      .trim() || "untitled"
  );
}

function resolveUniqueFilePath(
  dir: string,
  baseName: string,
): string {
  const normalizedDir =
    path.resolve(dir);
  let candidateBase = baseName;
  let suffix = 2;

  while (
    fs.existsSync(
      path.join(
        normalizedDir,
        `${candidateBase}.md`,
      ),
    )
  ) {
    candidateBase = `${baseName}-${suffix}`;
    suffix += 1;
  }

  return path.join(
    normalizedDir,
    `${candidateBase}.md`,
  );
}

function removeTitleFromFrontmatter(
  content: string,
): string {
  const match = content.match(
    /^---\n([\s\S]*?)\n---\n?/,
  );
  if (!match) return content;

  const frontmatter = match[1];
  const updatedFrontmatter = frontmatter
    .split("\n")
    .filter(
      (line) =>
        !/^title:\s*/.test(line.trim()),
    )
    .join("\n");

  return `---\n${updatedFrontmatter}\n---\n${content.slice(match[0].length)}`;
}

function updateMarkdownTitle(
  content: string,
  newTitle: string,
): string {
  const frontmatterMatch =
    content.match(
      /^---\n[\s\S]*?\n---\n?/,
    );
  const startIndex = frontmatterMatch
    ? frontmatterMatch[0].length
    : 0;
  const body =
    content.slice(startIndex);

  const headingMatch = body.match(
    /^\s*#\s+(.+)\s*$/m,
  );
  if (!headingMatch) {
    const prefix = content.slice(
      0,
      startIndex,
    );
    const rest = body.trimStart();
    const separator =
      prefix && !prefix.endsWith("\n")
        ? "\n"
        : "";
    return `${prefix}${separator}\n# ${newTitle}\n\n${rest}`;
  }

  const headingLine = headingMatch[0];
  const updatedBody = body.replace(
    headingLine,
    `# ${newTitle}`,
  );
  return `${content.slice(0, startIndex)}${updatedBody}`;
}

function parseTaskFile(
  filePath: string,
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done",
  epic?: string,
): Task | null {
  try {
    const content = fs.readFileSync(
      filePath,
      "utf-8",
    );
    const fileName =
      path.basename(filePath);
    const stats = fs.statSync(filePath);

    const frontmatterMatch =
      content.match(
        /^---\n([\s\S]*?)\n---/,
      );
    const title =
      fileNameToId(fileName);
    let description = "";
    let assignee = "";

    if (frontmatterMatch) {
      const frontmatter =
        frontmatterMatch[1];
      description =
        frontmatter.match(
          /description:\s*(.+)/,
        )?.[1] || "";
      assignee =
        frontmatter
          .match(
            /assignee:\s*(.+)/,
          )?.[1]
          ?.trim() || "";
    }

    return {
      id: fileNameToId(fileName),
      title,
      description,
      state,
      createdAt:
        stats.mtime.toISOString(),
      ...(epic && { epic }),
      assignee,
      path: filePath,
    };
  } catch {
    return null;
  }
}

function readTasksRecursively(
  dir: string,
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done",
): Task[] {
  const tasks: Task[] = [];

  if (!fs.existsSync(dir)) return tasks;

  const items = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const item of items) {
    const fullPath = path.join(
      dir,
      item.name,
    );

    if (item.isDirectory()) {
      // This is an epic folder, read tasks from it
      const epicName = item.name;
      const epicTasks =
        readTasksRecursively(
          fullPath,
          state,
        );
      // Add epic name to each task
      tasks.push(
        ...epicTasks.map((task) => ({
          ...task,
          epic: epicName,
        })),
      );
    } else if (
      item.isFile() &&
      item.name.endsWith(".md")
    ) {
      // This is a task file at the root level (no epic)
      const task = parseTaskFile(
        fullPath,
        state,
      );
      if (task) tasks.push(task);
    }
  }

  return tasks;
}

function readTasks(
  repo: string,
): Task[] {
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureAgelumStructure(
    primaryAgelumDir,
  );
  const {
    primaryTasksRoot,
    legacyTasksRoot,
  } = resolveTasksRoots(repo);

  const tasksByPath = new Map<
    string,
    Task
  >();
  const roots = [
    primaryTasksRoot,
    legacyTasksRoot,
  ].filter((p) => fs.existsSync(p));

  const states = [
    "backlog",
    "priority",
    "pending",
    "doing",
    "done",
  ] as const;

  for (const tasksRoot of roots) {
    for (const state of states) {
      const stateDir = path.join(
        tasksRoot,
        state,
      );
      const stateTasks =
        readTasksRecursively(
          stateDir,
          state,
        );
      for (const task of stateTasks) {
        tasksByPath.set(
          task.path,
          task,
        );
      }
    }
  }

  return Array.from(
    tasksByPath.values(),
  );
}

function createTask(
  repo: string,
  data: {
    title: string;
    description?: string;
    state?: string;
    assignee?: string;
  },
): Task {
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureAgelumStructure(
    primaryAgelumDir,
  );
  const { primaryTasksRoot } =
    resolveTasksRoots(repo);
  const state =
    (data.state as
      | "backlog"
      | "priority"
      | "pending"
      | "doing"
      | "done") || "pending";

  const stateDir = path.join(
    primaryTasksRoot,
    state,
  );
  fs.mkdirSync(stateDir, {
    recursive: true,
  });

  const createdAt =
    new Date().toISOString();
  const safeTitle =
    sanitizeTaskTitleToFileBase(
      data.title || "",
    );
  const filePath =
    resolveUniqueFilePath(
      stateDir,
      safeTitle,
    );
  const id = fileNameToId(
    path.basename(filePath),
  );

  const frontmatterLines = [
    "---",
    `created: ${createdAt}`,
    `state: ${state}`,
    ...(data.assignee
      ? [`assignee: ${data.assignee}`]
      : []),
    "---",
  ];
  const frontmatter = `${frontmatterLines.join("\n")}\n`;

  fs.writeFileSync(
    filePath,
    `${frontmatter}\n# ${id}\n\n${data.description || ""}\n`,
  );

  return {
    id,
    title: id,
    description: data.description || "",
    state,
    createdAt,
    assignee: "",
    path: filePath,
  };
}

function buildNewTaskMarkdown(opts: {
  createdAt: string;
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done";
  title: string;
  content: string;
}): string {
  const hasFrontmatter =
    /^---\n[\s\S]*?\n---\n?/.test(
      opts.content,
    );
  const trimmed = opts.content.trim();
  const bodyWithHeading =
    /^\s*#\s+.+$/m.test(trimmed)
      ? trimmed
      : `# ${opts.title}\n\n${trimmed}`;

  if (hasFrontmatter) {
    return `${bodyWithHeading}\n`;
  }

  const frontmatterLines = [
    "---",
    `created: ${opts.createdAt}`,
    `state: ${opts.state}`,
    "---",
  ];
  return `${frontmatterLines.join("\n")}\n\n${bodyWithHeading}\n`;
}

function createTaskFromContent(
  repo: string,
  data: {
    state?: string;
    fileBase?: string;
    content: string;
  },
): { path: string; content: string } {
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureAgelumStructure(
    primaryAgelumDir,
  );
  const { primaryTasksRoot } =
    resolveTasksRoots(repo);
  const state =
    (data.state as
      | "backlog"
      | "priority"
      | "pending"
      | "doing"
      | "done") || "pending";

  const stateDir = path.join(
    primaryTasksRoot,
    state,
  );
  fs.mkdirSync(stateDir, {
    recursive: true,
  });

  const createdAt =
    new Date().toISOString();
  const safeTitle =
    sanitizeTaskTitleToFileBase(
      data.fileBase || "untitled",
    );
  const filePath =
    resolveUniqueFilePath(
      stateDir,
      safeTitle,
    );
  const finalBase = fileNameToId(
    path.basename(filePath),
  );
  const nextContent =
    buildNewTaskMarkdown({
      createdAt,
      state,
      title: finalBase,
      content: data.content,
    });

  fs.writeFileSync(
    filePath,
    nextContent,
  );

  try {
    const settings = readSettings();
    if (settings.createBranchPerTask) {
      const { repoDir } =
        resolveRepoDirs(repo);
      const branchName = `task/${finalBase}`;
      try {
        execSync(
          `git branch "${branchName}"`,
          {
            cwd: repoDir,
            stdio: "ignore",
          },
        );
      } catch (e) {
        // Ignore if branch exists or other git error
      }
    }
  } catch (e) {
    console.error(
      "Failed to create branch:",
      e,
    );
  }

  return {
    path: filePath,
    content: nextContent,
  };
}

function findTaskFile(
  baseDir: string,
  taskId: string,
): string | null {
  if (!fs.existsSync(baseDir))
    return null;

  const items = fs.readdirSync(
    baseDir,
    { withFileTypes: true },
  );

  for (const item of items) {
    const fullPath = path.join(
      baseDir,
      item.name,
    );

    if (item.isDirectory()) {
      // Search recursively in subdirectories (epic folders)
      const found = findTaskFile(
        fullPath,
        taskId,
      );
      if (found) return found;
    } else if (
      item.isFile() &&
      item.name === `${taskId}.md`
    ) {
      return fullPath;
    }
  }

  return null;
}

function moveTask(
  repo: string,
  taskId: string,
  fromState: string,
  toState: string,
): void {
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureAgelumStructure(
    primaryAgelumDir,
  );
  const {
    primaryTasksRoot,
    legacyTasksRoot,
  } = resolveTasksRoots(repo);

  const roots = [
    primaryTasksRoot,
    legacyTasksRoot,
  ].filter((p) => fs.existsSync(p));

  let fromPath: string | null = null;
  let tasksRootForMove: string | null =
    null;
  for (const root of roots) {
    const candidate = findTaskFile(
      path.join(root, fromState),
      taskId,
    );
    if (candidate) {
      fromPath = candidate;
      tasksRootForMove = root;
      break;
    }
  }

  if (!fromPath) {
    throw new Error(
      `Task file not found: ${taskId}`,
    );
  }
  if (!tasksRootForMove) {
    throw new Error(
      "Task root not found",
    );
  }

  // Determine if task is in an epic folder
  const fromStateDir = path.join(
    tasksRootForMove,
    fromState,
  );
  const relativePath = path.relative(
    fromStateDir,
    fromPath,
  );
  const pathParts = relativePath.split(
    path.sep,
  );

  let toPath: string;
  if (pathParts.length > 1) {
    // Task is in an epic folder, maintain the epic folder structure
    const epicFolder = pathParts[0];
    const toStateDir = path.join(
      tasksRootForMove,
      toState,
    );
    const toEpicDir = path.join(
      toStateDir,
      epicFolder,
    );
    fs.mkdirSync(toEpicDir, {
      recursive: true,
    });
    toPath = path.join(
      toEpicDir,
      `${taskId}.md`,
    );
  } else {
    // Task is at root level
    const toStateDir = path.join(
      tasksRootForMove,
      toState,
    );
    fs.mkdirSync(toStateDir, {
      recursive: true,
    });
    toPath = path.join(
      toStateDir,
      `${taskId}.md`,
    );
  }

  fs.renameSync(fromPath, toPath);
}

function renameTask(
  repo: string,
  filePath: string,
  newTitle: string,
): {
  path: string;
  content: string;
  id: string;
  title: string;
} {
  const {
    primaryTasksRoot,
    legacyTasksRoot,
  } = resolveTasksRoots(repo);
  const resolvedPrimaryRoot =
    path.resolve(primaryTasksRoot);
  const resolvedLegacyRoot =
    path.resolve(legacyTasksRoot);
  const resolvedFilePath =
    path.resolve(filePath);
  if (
    !resolvedFilePath.startsWith(
      resolvedPrimaryRoot + path.sep,
    ) &&
    !resolvedFilePath.startsWith(
      resolvedLegacyRoot + path.sep,
    )
  ) {
    throw new Error(
      "Invalid task path",
    );
  }

  if (
    !fs.existsSync(resolvedFilePath)
  ) {
    throw new Error(
      "Task file not found",
    );
  }

  const dir = path.dirname(
    resolvedFilePath,
  );
  const safeTitle =
    sanitizeTaskTitleToFileBase(
      newTitle,
    );
  const targetPathCandidate = path.join(
    dir,
    `${safeTitle}.md`,
  );
  const targetPath =
    resolvedFilePath ===
    targetPathCandidate
      ? resolvedFilePath
      : resolveUniqueFilePath(
          dir,
          safeTitle,
        );
  const finalBase = fileNameToId(
    path.basename(targetPath),
  );

  const existingContent =
    fs.readFileSync(
      resolvedFilePath,
      "utf-8",
    );
  let updatedContent =
    removeTitleFromFrontmatter(
      existingContent,
    );
  updatedContent = updateMarkdownTitle(
    updatedContent,
    finalBase,
  );

  if (resolvedFilePath !== targetPath) {
    fs.renameSync(
      resolvedFilePath,
      targetPath,
    );
  }

  fs.writeFileSync(
    targetPath,
    updatedContent,
  );

  return {
    path: targetPath,
    content: updatedContent,
    id: finalBase,
    title: finalBase,
  };
}

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({
      tasks: [],
    });
  }

  try {
    const tasks = readTasks(repo);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { tasks: [] },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const {
      repo,
      action,
      taskId,
      fromState,
      toState,
      data,
      path: taskPath,
      newTitle,
      agentMode,
      agent,
    } = body;

    if (!repo) {
      return NextResponse.json(
        {
          error:
            "Repository is required",
        },
        { status: 400 },
      );
    }

    if (
      action === "createFromContent"
    ) {
      if (
        !data ||
        typeof data.content !== "string"
      ) {
        return NextResponse.json(
          {
            error:
              "Content is required",
          },
          { status: 400 },
        );
      }
      const result =
        createTaskFromContent(
          repo,
          data,
        );
      return NextResponse.json({
        ...result,
      });
    }

    if (action === "create") {
      if (agentMode && agent) {
        // Agent mode: execute agent command first, then verify file was created
        try {
          const agentResult =
            await executeAgentCommand(
              agent.tool,
              agent.prompt,
              agent.model,
            );

          if (!agentResult.success) {
            return NextResponse.json(
              {
                error:
                  agentResult.error ||
                  "Agent execution failed",
                agentOutput:
                  agentResult,
              },
              { status: 500 },
            );
          }

          // Wait a moment for file system to sync
          await new Promise((resolve) =>
            setTimeout(resolve, 1000),
          );

          // Try to read the task that should have been created
          const { primaryTasksRoot } =
            resolveTasksRoots(repo);
          const state =
            (data?.state as
              | "backlog"
              | "priority"
              | "pending"
              | "doing"
              | "done") || "pending";
          const stateDir = path.join(
            primaryTasksRoot,
            state,
          );

          // Find the most recently created task file in this state (check recursively for epic folders)
          if (fs.existsSync(stateDir)) {
            const findLatestTask = (
              dir: string,
            ): {
              path: string;
              mtime: Date;
            } | null => {
              let latest: {
                path: string;
                mtime: Date;
              } | null = null;

              const items =
                fs.readdirSync(dir, {
                  withFileTypes: true,
                });
              for (const item of items) {
                const fullPath =
                  path.join(
                    dir,
                    item.name,
                  );
                if (
                  item.isDirectory()
                ) {
                  const subLatest =
                    findLatestTask(
                      fullPath,
                    );
                  if (
                    subLatest &&
                    (!latest ||
                      subLatest.mtime >
                        latest.mtime)
                  ) {
                    latest = subLatest;
                  }
                } else if (
                  item.isFile() &&
                  item.name.endsWith(
                    ".md",
                  )
                ) {
                  const stats =
                    fs.statSync(
                      fullPath,
                    );
                  if (
                    !latest ||
                    stats.mtime >
                      latest.mtime
                  ) {
                    latest = {
                      path: fullPath,
                      mtime:
                        stats.mtime,
                    };
                  }
                }
              }
              return latest;
            };

            const latestTask =
              findLatestTask(stateDir);
            if (latestTask) {
              const task =
                parseTaskFile(
                  latestTask.path,
                  state,
                );
              if (task) {
                return NextResponse.json(
                  {
                    task,
                    agentOutput:
                      agentResult,
                  },
                );
              }
            }
          }

          // Fallback: create the task directly if agent didn't create it
          const task = createTask(
            repo,
            data || {},
          );
          return NextResponse.json({
            task,
            agentOutput: agentResult,
            warning:
              "Task was created directly after agent execution",
          });
        } catch (error) {
          console.error(
            "Agent execution error:",
            error,
          );
          // Fallback to direct creation
          const task = createTask(
            repo,
            data || {},
          );
          return NextResponse.json({
            task,
            error:
              error instanceof Error
                ? error.message
                : "Agent execution failed, created directly",
          });
        }
      } else {
        // Direct mode: create file directly
        const task = createTask(
          repo,
          data || {},
        );
        return NextResponse.json({
          task,
        });
      }
    }

    if (
      action === "move" &&
      taskId &&
      fromState &&
      toState
    ) {
      moveTask(
        repo,
        taskId,
        fromState,
        toState,
      );
      return NextResponse.json({
        success: true,
      });
    }

    if (
      action === "rename" &&
      typeof taskPath === "string" &&
      typeof newTitle === "string"
    ) {
      const result = renameTask(
        repo,
        taskPath,
        newTitle,
      );
      return NextResponse.json({
        ...result,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Task API error:",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process task";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
