import { NextRequest, NextResponse } from "next/server";
import { resolveProjectPath } from "@/lib/settings";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const query = searchParams.get("query");

  if (!repo || !query) {
    return NextResponse.json(
      { error: "Missing repo or query parameter" },
      { status: 400 },
    );
  }

  try {
    // Resolve the real path using the shared settings logic
    let repoPath = await resolveProjectPath(repo);

    // Fallback if resolveProjectPath returns null
    if (!repoPath) {
      const basePath =
        process.env.AGELUM_BASE_PATH || path.join(process.cwd(), "../..");
      repoPath = path.join(basePath, repo);
    }

    // Verify the repository exists
    try {
      await fs.access(repoPath);
    } catch {
      return NextResponse.json(
        { error: `Repository not found at ${repoPath}` },
        { status: 404 },
      );
    }

    const searchQuery = query.toLowerCase();
    const maxResults = 50;

    // Attempt to use native 'find' command for performance on Unix systems
    if (process.platform !== "win32") {
      try {
        // Construct find command
        // find <path> -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -iname '*query*' | head -n 50
        // We use -ipath to allow flexible matching or -iname for filename matching
        // The user prompt implies searching "files", usually by name.

        const excludeDirs = [
          "node_modules",
          ".git",
          ".next",
          "dist",
          "build",
          ".agelum",
          "coverage",
        ];

        const excludes = excludeDirs
          .map((dir) => `-not -path '*/${dir}/*'`)
          .join(" ");

        // Sanitize query to avoid shell injection (basic)
        const safeQuery = query.replace(/'/g, "'\\''");

        const command = `find "${repoPath}" -type f ${excludes} -iname "*${safeQuery}*" | head -n ${maxResults}`;

        const { stdout } = await execAsync(command, {
          maxBuffer: 1024 * 1024 * 10,
        });
        const lines = stdout.split("\n").filter(Boolean);

        const results = lines.map((fullPath) => {
          const relativePath = path.relative(repoPath!, fullPath);
          return {
            name: path.basename(fullPath),
            path: relativePath,
            type: "file" as const,
          };
        });

        return NextResponse.json({ results });
      } catch (e) {
        console.warn("Fast search failed, falling back to JS search:", e);
        // Fallthrough to JS implementation
      }
    }

    // JS Fallback (Recursive)
    const results: {
      name: string;
      path: string;
      type: "file" | "directory";
    }[] = [];

    async function searchDir(dirPath: string, relativePath: string = "") {
      if (results.length >= maxResults) return;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (results.length >= maxResults) break;

          // Skip common directories
          if (
            entry.isDirectory() &&
            (entry.name === "node_modules" ||
              entry.name === ".git" ||
              entry.name === "dist" ||
              entry.name === "build" ||
              entry.name === ".next" ||
              entry.name === ".agelum")
          ) {
            continue;
          }

          const entryRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

          // Check if the name matches the search query
          if (entry.name.toLowerCase().includes(searchQuery)) {
            results.push({
              name: entry.name,
              path: entryRelativePath,
              type: entry.isDirectory() ? "directory" : "file",
            });
          }

          // Recursively search subdirectories
          if (entry.isDirectory()) {
            await searchDir(path.join(dirPath, entry.name), entryRelativePath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
        // console.error(`Error reading ${dirPath}:`, error);
      }
    }

    await searchDir(repoPath);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching files:", error);
    return NextResponse.json(
      { error: "Failed to search files" },
      { status: 500 },
    );
  }
}
