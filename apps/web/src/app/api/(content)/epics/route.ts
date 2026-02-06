import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { executeAgentCommand } from "@/lib/agent-tools";
import { resolveProjectPath } from "@/lib/settings";

interface Epic {
  id: string;
  title: string;
  description: string;
  state:
    | "backlog"
    | "priority" // Legacy
    | "fixes"
    | "pending"
    | "doing"
    | "done";
  createdAt: string;
  path: string;
}

async function resolveRepoDirs(
  repo: string,
): Promise<{
  repoDir: string;
  primaryAgelumDir: string;
  legacyAgelumDir: string;
}> {
  const repoDir =
    await resolveProjectPath(repo);

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

async function resolveEpicsRoots(
  repo: string,
): Promise<{
  primaryEpicsRoot: string;
  legacyEpicsRoot: string;
}> {
  const {
    primaryAgelumDir,
    legacyAgelumDir,
  } = await resolveRepoDirs(repo);
  return {
    primaryEpicsRoot: path.join(
      primaryAgelumDir,
      "work",
      "epics",
    ),
    legacyEpicsRoot: path.join(
      legacyAgelumDir,
      "epics",
    ),
  };
}

function sanitizeFileBase(
  input: string,
): string {
  return (
    input
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

function ensureEpicStructure(
  agelumDir: string,
) {
  const directories = [
    path.join(
      "work",
      "epics",
      "backlog",
    ),
    path.join(
      "work",
      "epics",
      "fixes",
    ),
    path.join(
      "work",
      "epics",
      "pending",
    ),
    path.join("work", "epics", "doing"),
    path.join("work", "epics", "done"),
  ];

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

function parseEpicFile(
  filePath: string,
  state:
    | "backlog"
    | "priority"
    | "pending"
    | "doing"
    | "done",
): Epic | null {
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
    let title = fileNameToId(fileName);
    let description = "";

    if (frontmatterMatch) {
      const frontmatter =
        frontmatterMatch[1];
      const titleMatch =
        frontmatter.match(
          /title:\s*(.+)/,
        );
      description =
        frontmatter.match(
          /description:\s*(.+)/,
        )?.[1] || "";
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }

    return {
      id: fileNameToId(fileName),
      title,
      description,
      state,
      createdAt:
        stats.mtime.toISOString(),
      path: filePath,
    };
  } catch {
    return null;
  }
}

async function readEpics(
  repo: string,
): Promise<Epic[]> {
  const { primaryAgelumDir } =
    await resolveRepoDirs(repo);
  ensureEpicStructure(primaryAgelumDir);
  const {
    primaryEpicsRoot,
    legacyEpicsRoot,
  } = await resolveEpicsRoots(repo);

  const epicsByPath = new Map<
    string,
    Epic
  >();
  const roots = [
    primaryEpicsRoot,
    legacyEpicsRoot,
  ].filter((p) => fs.existsSync(p));
  const states = [
    "backlog",
    "priority",
    "fixes",
    "pending",
    "doing",
    "done",
  ] as const;

  for (const epicsRoot of roots) {
    for (const state of states) {
      const stateDir = path.join(
        epicsRoot,
        state,
      );
      if (!fs.existsSync(stateDir))
        continue;
      const files =
        fs.readdirSync(stateDir);
      for (const file of files) {
        if (!file.endsWith(".md"))
          continue;
        const epic = parseEpicFile(
          path.join(stateDir, file),
          state === "priority" ? "fixes" : state,
        );
        if (epic)
          epicsByPath.set(
            epic.path,
            epic,
          );
      }
    }
  }

  return Array.from(
    epicsByPath.values(),
  );
}

async function createEpic(
  repo: string,
  data: {
    title: string;
    description?: string;
    state?: string;
  },
): Promise<Epic> {
  const { primaryAgelumDir } =
    await resolveRepoDirs(repo);
  ensureEpicStructure(primaryAgelumDir);
  const { primaryEpicsRoot } =
    await resolveEpicsRoots(repo);
  const state =
    (data.state as
      | "backlog"
      | "priority"
      | "fixes"
      | "pending"
      | "doing"
      | "done") || "backlog";

  const id = `epic-${Date.now()}`;
  const stateDir = path.join(
    primaryEpicsRoot,
    state,
  );
  fs.mkdirSync(stateDir, {
    recursive: true,
  });

  const filePath = path.join(
    stateDir,
    `${id}.md`,
  );
  const createdAt =
    new Date().toISOString();

  const frontmatter = `---
title: ${data.title}
created: ${createdAt}
state: ${state}
---
`;

  fs.writeFileSync(
    filePath,
    `${frontmatter}\n# ${data.title}\n\n${data.description || ""}\n`,
  );

  return {
    id,
    title: data.title,
    description: data.description || "",
    state,
    createdAt,
    path: filePath,
  };
}

function findEpicFile(
  baseDir: string,
  epicId: string,
): string | null {
  if (!fs.existsSync(baseDir))
    return null;

  const items = fs.readdirSync(
    baseDir,
    { withFileTypes: true },
  );

  for (const item of items) {
    if (
      item.isFile() &&
      item.name === `${epicId}.md`
    ) {
      return path.join(
        baseDir,
        item.name,
      );
    }
  }

  return null;
}

async function moveEpic(
  repo: string,
  epicId: string,
  fromState: string,
  toState: string,
): Promise<void> {
  const { primaryAgelumDir } =
    await resolveRepoDirs(repo);
  ensureEpicStructure(primaryAgelumDir);
  const {
    primaryEpicsRoot,
    legacyEpicsRoot,
  } = await resolveEpicsRoots(repo);

  const roots = [
    primaryEpicsRoot,
    legacyEpicsRoot,
  ].filter((p) => fs.existsSync(p));

  let fromPath: string | null = null;
  let epicsRootForMove: string | null =
    null;
  for (const root of roots) {
    const candidate = findEpicFile(
      path.join(root, fromState),
      epicId,
    );
    if (candidate) {
      fromPath = candidate;
      epicsRootForMove = root;
      break;
    }
  }

  if (!fromPath) {
    throw new Error(
      `Epic file not found: ${epicId}`,
    );
  }
  if (!epicsRootForMove) {
    throw new Error(
      "Epic root not found",
    );
  }

  const toStateDir = path.join(
    epicsRootForMove,
    toState,
  );
  fs.mkdirSync(toStateDir, {
    recursive: true,
  });
  const toPath = path.join(
    toStateDir,
    `${epicId}.md`,
  );

  fs.renameSync(fromPath, toPath);
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

function renameEpic(
  repo: string,
  filePath: string,
  newTitle: string,
): {
  path: string;
  content: string;
} {
  const resolvedFilePath =
    path.resolve(filePath);

  if (
    !fs.existsSync(resolvedFilePath)
  ) {
    throw new Error(
      "Epic file not found",
    );
  }

  const content = fs.readFileSync(
    resolvedFilePath,
    "utf-8",
  );
  const updatedMarkdown =
    updateMarkdownTitle(
      content,
      newTitle,
    );

  // Also update frontmatter title if present
  const frontmatterMatch =
    updatedMarkdown.match(
      /^---\n([\s\S]*?)\n---/,
    );
  let finalContent = updatedMarkdown;
  if (frontmatterMatch) {
    const frontmatter =
      frontmatterMatch[1];
    if (
      frontmatter.includes("title:")
    ) {
      const updatedFrontmatter =
        frontmatter.replace(
          /title:\s*.*/,
          `title: ${newTitle}`,
        );
      finalContent = `---\n${updatedFrontmatter}\n---${updatedMarkdown.slice(frontmatterMatch[0].length)}`;
    } else {
      const updatedFrontmatter = `title: ${newTitle}\n${frontmatter}`;
      finalContent = `---\n${updatedFrontmatter}\n---${updatedMarkdown.slice(frontmatterMatch[0].length)}`;
    }
  }

  const dir = path.dirname(
    resolvedFilePath,
  );
  const safeTitle =
    sanitizeFileBase(newTitle);

  const currentFileName = path.basename(
    resolvedFilePath,
    ".md",
  );
  let targetPath = resolvedFilePath;

  const targetPathCandidate = path.join(
    dir,
    safeTitle.toLowerCase().endsWith(".md")
      ? safeTitle
      : `${safeTitle}.md`,
  );
  if (
    resolvedFilePath !==
    targetPathCandidate
  ) {
    targetPath = resolveUniqueFilePath(
      dir,
      safeTitle,
    );
  }

  if (resolvedFilePath !== targetPath) {
    fs.renameSync(
      resolvedFilePath,
      targetPath,
    );
  }

  fs.writeFileSync(
    targetPath,
    finalContent,
  );

  return {
    path: targetPath,
    content: finalContent,
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
      epics: [],
    });
  }

  try {
    const epics = await readEpics(repo);
    return NextResponse.json({ epics });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { epics: [] },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    let {
      repo,
      action,
      epicId,
      fromState,
      toState,
      data,
      agentMode,
      agent,
    } = body;

    // Redirect legacy 'priority' to 'fixes'
    if (toState === "priority") toState = "fixes";
    if (data && data.state === "priority") data.state = "fixes";

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
      action === "rename" &&
      body.path &&
      body.newTitle
    ) {
      const result = renameEpic(
        repo,
        body.path,
        body.newTitle,
      );
      return NextResponse.json(result);
    }

    if (action === "create") {
      if (agentMode && agent) {
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

          await new Promise((resolve) =>
            setTimeout(resolve, 1000),
          );

          const state =
            (data?.state as
              | "backlog"
              | "priority"
              | "fixes"
              | "pending"
              | "doing"
              | "done") || "backlog";
          const { primaryAgelumDir } =
            await resolveRepoDirs(repo);
          ensureEpicStructure(
            primaryAgelumDir,
          );
          const {
            primaryEpicsRoot,
            legacyEpicsRoot,
          } = await resolveEpicsRoots(repo);
          const roots = [
            primaryEpicsRoot,
            legacyEpicsRoot,
          ].filter((p) =>
            fs.existsSync(p),
          );

          let latest: {
            path: string;
            mtime: Date;
          } | null = null;
          for (const root of roots) {
            const stateDir = path.join(
              root,
              state,
            );
            if (
              !fs.existsSync(stateDir)
            )
              continue;
            const files = fs
              .readdirSync(stateDir)
              .filter((f) =>
                f.endsWith(".md"),
              )
              .map((f) => {
                const p = path.join(
                  stateDir,
                  f,
                );
                return {
                  path: p,
                  mtime:
                    fs.statSync(p)
                      .mtime,
                };
              });
            for (const f of files) {
              if (
                !latest ||
                f.mtime.getTime() >
                  latest.mtime.getTime()
              ) {
                latest = f;
              }
            }
          }

          if (latest) {
            const epic = parseEpicFile(
              latest.path,
              state,
            );
            if (epic) {
              return NextResponse.json({
                epic,
                agentOutput:
                  agentResult,
              });
            }
          }

          const epic = await createEpic(
            repo,
            data || {},
          );
          return NextResponse.json({
            epic,
            agentOutput: agentResult,
            warning:
              "Epic was created directly after agent execution",
          });
        } catch (error) {
          console.error(
            "Agent execution error:",
            error,
          );
          const epic = await createEpic(
            repo,
            data || {},
          );
          return NextResponse.json({
            epic,
            error:
              error instanceof Error
                ? error.message
                : "Agent execution failed, created directly",
          });
        }
      } else {
        const epic = await createEpic(
          repo,
          data || {},
        );
        return NextResponse.json({
          epic,
        });
      }
    }

    if (
      action === "move" &&
      epicId &&
      fromState &&
      toState
    ) {
      await moveEpic(
        repo,
        epicId,
        fromState,
        toState,
      );
      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Epic API error:",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process epic";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
