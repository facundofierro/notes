import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function ensureAgelumStructure(
  agelumDir: string,
) {
  const directories = [
    path.join("doc", "plan"),
    path.join("doc", "research"),
    path.join("doc", "docs"),
    path.join("ai", "commands"),
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
): FileNode | null {
  if (!fs.existsSync(dir)) return null;

  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) return null;

  const name = path.basename(dir);
  const relativePath = path.relative(
    basePath,
    dir,
  );

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
        entry.name.endsWith(".md")
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
    // Navigate up from the current working directory to get to the git directory
    // Current structure: /Users/facundofierro/git/agelum/apps/web
    // Target: /Users/facundofierro/git/{repo}
    const currentPath = process.cwd();
    const gitDir = path.dirname(
      path.dirname(
        path.dirname(currentPath),
      ),
    );

    const repoPath = path.join(
      gitDir,
      repo,
    );
    const basePath = gitDir;
    const agelumDir = path.join(
      repoPath,
      ".agelum",
    );

    ensureAgelumStructure(agelumDir);

    const targetDir = subPath
      ? path.join(agelumDir, subPath)
      : agelumDir;
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
