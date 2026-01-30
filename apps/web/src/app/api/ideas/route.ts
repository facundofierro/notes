import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveProjectPath } from "@/lib/settings";

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

function resolveIdeasRoots(
  repo: string,
): {
  primaryIdeasRoot: string;
  legacyIdeasRoot: string;
} {
  const {
    primaryAgelumDir,
    legacyAgelumDir,
  } = resolveRepoDirs(repo);
  return {
    primaryIdeasRoot: path.join(
      primaryAgelumDir,
      "doc",
      "ideas",
    ),
    legacyIdeasRoot: path.join(
      legacyAgelumDir,
      "ideas",
    ),
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
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureIdeasStructure(
    primaryAgelumDir,
  );
  const {
    primaryIdeasRoot,
    legacyIdeasRoot,
  } = resolveIdeasRoots(repo);

  const ideasByPath = new Map<
    string,
    Idea
  >();
  const roots = [
    primaryIdeasRoot,
    legacyIdeasRoot,
  ].filter((p) => fs.existsSync(p));
  const states = [
    "thinking",
    "important",
    "priority",
    "planned",
    "done",
  ] as const;

  for (const root of roots) {
    for (const state of states) {
      const stateDir = path.join(
        root,
        state,
      );
      if (!fs.existsSync(stateDir))
        continue;

      const files =
        fs.readdirSync(stateDir);
      for (const file of files) {
        if (!file.endsWith(".md"))
          continue;
        const idea = parseIdeaFile(
          path.join(stateDir, file),
          state,
        );
        if (idea)
          ideasByPath.set(
            idea.path,
            idea,
          );
      }
    }
  }

  return Array.from(
    ideasByPath.values(),
  );
}

function createIdea(
  repo: string,
  data: {
    title: string;
    description?: string;
    state?: string;
  },
): Idea {
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureIdeasStructure(
    primaryAgelumDir,
  );
  const { primaryIdeasRoot } =
    resolveIdeasRoots(repo);
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
  const { primaryAgelumDir } =
    resolveRepoDirs(repo);
  ensureIdeasStructure(
    primaryAgelumDir,
  );
  const {
    primaryIdeasRoot,
    legacyIdeasRoot,
  } = resolveIdeasRoots(repo);

  const roots = [
    primaryIdeasRoot,
    legacyIdeasRoot,
  ].filter((p) => fs.existsSync(p));

  let fromPath: string | null = null;
  let ideasRootForMove: string | null =
    null;
  for (const root of roots) {
    const candidate = findIdeaFile(
      path.join(root, fromState),
      ideaId,
    );
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
    ideasRootForMove ||
      primaryIdeasRoot,
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

function renameIdea(
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
      "Idea file not found",
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
    `${safeTitle}.md`,
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
      ideas: [],
    });
  }

  try {
    const ideas = readIdeas(repo);
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ideas: [] },
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

    if (
      action === "rename" &&
      body.path &&
      body.newTitle
    ) {
      const result = renameIdea(
        repo,
        body.path,
        body.newTitle,
      );
      return NextResponse.json(result);
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
