import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Epic {
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
  path: string;
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
      "priority",
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

function readEpics(
  repo: string,
): Epic[] {
  const homeDir =
    process.env.HOME ||
    process.env.USERPROFILE ||
    process.cwd();
  const gitDir = path.join(
    homeDir,
    "git",
  );
  const agelumDir = path.join(
    gitDir,
    repo,
    "agelum",
  );
  ensureEpicStructure(agelumDir);
  const epicsDir = path.join(
    agelumDir,
    "epics",
  );

  const epics: Epic[] = [];
  const states = [
    "backlog",
    "priority",
    "pending",
    "doing",
    "done",
  ] as const;

  for (const state of states) {
    const stateDir = path.join(
      epicsDir,
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
        state,
      );
      if (epic) epics.push(epic);
    }
  }

  return epics;
}

function createEpic(
  repo: string,
  data: {
    title: string;
    description?: string;
    state?: string;
  },
): Epic {
  const homeDir =
    process.env.HOME ||
    process.env.USERPROFILE ||
    process.cwd();
  const gitDir = path.join(
    homeDir,
    "git",
  );
  const agelumDir = path.join(
    gitDir,
    repo,
    ".agelum",
  );
  ensureEpicStructure(agelumDir);
  const epicsDir = path.join(
    agelumDir,
    "work",
    "epics",
  );
  const state =
    (data.state as
      | "backlog"
      | "priority"
      | "pending"
      | "doing"
      | "done") || "backlog";

  const id = `epic-${Date.now()}`;
  const stateDir = path.join(
    epicsDir,
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

function moveEpic(
  repo: string,
  epicId: string,
  fromState: string,
  toState: string,
): void {
  const homeDir =
    process.env.HOME ||
    process.env.USERPROFILE ||
    process.cwd();
  const gitDir = path.join(
    homeDir,
    "git",
  );
  const agelumDir = path.join(
    gitDir,
    repo,
    "agelum",
  );
  ensureEpicStructure(agelumDir);
  const epicsDir = path.join(
    agelumDir,
    "epics",
  );

  const fromStateDir = path.join(
    epicsDir,
    fromState,
  );
  const fromPath = findEpicFile(
    fromStateDir,
    epicId,
  );

  if (!fromPath) {
    throw new Error(
      `Epic file not found: ${epicId}`,
    );
  }

  const toStateDir = path.join(
    epicsDir,
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

  const epics = readEpics(repo);
  return NextResponse.json({ epics });
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const {
      repo,
      action,
      epicId,
      fromState,
      toState,
      data,
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

    if (action === "create") {
      const epic = createEpic(
        repo,
        data || {},
      );
      return NextResponse.json({
        epic,
      });
    }

    if (
      action === "move" &&
      epicId &&
      fromState &&
      toState
    ) {
      moveEpic(
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
