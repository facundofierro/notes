import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Idea {
  id: string;
  title: string;
  description: string;
  state:
    | "thinking"
    | "important"
    | "priority"
    | "planned"
    | "done";
  createdAt: string;
  path: string;
}

function resolveGitDir(): string {
  const currentPath = process.cwd();
  return path.dirname(path.dirname(path.dirname(currentPath)));
}

function resolveRepoDirs(repo: string): {
  gitDir: string;
  repoDir: string;
  primaryAgelumDir: string;
  legacyAgelumDir: string;
} {
  const gitDir = resolveGitDir();
  const repoDir = path.join(gitDir, repo);
  return {
    gitDir,
    repoDir,
    primaryAgelumDir: path.join(repoDir, ".agelum"),
    legacyAgelumDir: path.join(repoDir, "agelum"),
  };
}

function resolveIdeasRoots(repo: string): {
  primaryIdeasRoot: string;
  legacyIdeasRoot: string;
} {
  const { primaryAgelumDir, legacyAgelumDir } = resolveRepoDirs(repo);
  return {
    primaryIdeasRoot: path.join(primaryAgelumDir, "doc", "ideas"),
    legacyIdeasRoot: path.join(legacyAgelumDir, "ideas"),
  };
}

function ensureIdeasStructure(
  agelumDir: string,
) {
  const directories = [
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
  ];

  fs.mkdirSync(agelumDir, { recursive: true });
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

function parseIdeaFile(
  filePath: string,
  state:
    | "thinking"
    | "important"
    | "priority"
    | "planned"
    | "done",
): Idea | null {
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

function readIdeas(
  repo: string,
): Idea[] {
  const { primaryAgelumDir } = resolveRepoDirs(repo);
  ensureIdeasStructure(primaryAgelumDir);
  const { primaryIdeasRoot, legacyIdeasRoot } = resolveIdeasRoots(repo);

  const ideasByPath = new Map<string, Idea>();
  const roots = [primaryIdeasRoot, legacyIdeasRoot].filter((p) =>
    fs.existsSync(p),
  );
  const states = [
    "thinking",
    "important",
    "priority",
    "planned",
    "done",
  ] as const;

  for (const root of roots) {
    for (const state of states) {
      const stateDir = path.join(root, state);
      if (!fs.existsSync(stateDir)) continue;

      const files = fs.readdirSync(stateDir);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const idea = parseIdeaFile(path.join(stateDir, file), state);
        if (idea) ideasByPath.set(idea.path, idea);
      }
    }
  }

  return Array.from(ideasByPath.values());
}

function createIdea(
  repo: string,
  data: {
    title: string;
    description?: string;
    state?: string;
  },
): Idea {
  const { primaryAgelumDir } = resolveRepoDirs(repo);
  ensureIdeasStructure(primaryAgelumDir);
  const { primaryIdeasRoot } = resolveIdeasRoots(repo);
  const state =
    (data.state as
      | "thinking"
      | "important"
      | "priority"
      | "planned"
      | "done") || "thinking";

  const id = `idea-${Date.now()}`;
  const stateDir = path.join(
    primaryIdeasRoot,
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

function findIdeaFile(
  baseDir: string,
  ideaId: string,
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
      item.name === `${ideaId}.md`
    ) {
      return path.join(
        baseDir,
        item.name,
      );
    }
  }

  return null;
}

function moveIdea(
  repo: string,
  ideaId: string,
  fromState: string,
  toState: string,
): void {
  const { primaryAgelumDir } = resolveRepoDirs(repo);
  ensureIdeasStructure(primaryAgelumDir);
  const { primaryIdeasRoot, legacyIdeasRoot } = resolveIdeasRoots(repo);

  const roots = [primaryIdeasRoot, legacyIdeasRoot].filter((p) =>
    fs.existsSync(p),
  );

  let fromPath: string | null = null;
  let ideasRootForMove: string | null = null;
  for (const root of roots) {
    const candidate = findIdeaFile(path.join(root, fromState), ideaId);
    if (candidate) {
      fromPath = candidate;
      ideasRootForMove = root;
      break;
    }
  }

  if (!fromPath) {
    throw new Error(
      `Idea file not found: ${ideaId}`,
    );
  }

  const toStateDir = path.join(
    ideasRootForMove || primaryIdeasRoot,
    toState,
  );
  fs.mkdirSync(toStateDir, {
    recursive: true,
  });
  const toPath = path.join(
    toStateDir,
    `${ideaId}.md`,
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
      ideas: [],
    });
  }

  const ideas = readIdeas(repo);
  return NextResponse.json({ ideas });
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();
    const {
      repo,
      action,
      ideaId,
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
      const idea = createIdea(
        repo,
        data || {},
      );
      return NextResponse.json({
        idea,
      });
    }

    if (
      action === "move" &&
      ideaId &&
      fromState &&
      toState
    ) {
      moveIdea(
        repo,
        ideaId,
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
      "Idea API error:",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process idea";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
