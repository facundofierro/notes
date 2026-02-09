import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const query = searchParams.get("query");

  if (!repo || !query) {
    return NextResponse.json({ error: "Missing repo or query parameter" }, { status: 400 });
  }

  try {
    // Get the base path for repositories
    const basePath = process.env.AGELUM_BASE_PATH || path.join(process.cwd(), "../..");
    const repoPath = path.join(basePath, repo);

    // Verify the repository exists
    try {
      await fs.access(repoPath);
    } catch {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Search for files recursively
    const results: { name: string; path: string; type: "file" | "directory" }[] = [];
    const searchQuery = query.toLowerCase();
    const maxResults = 50;

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

          const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

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
        console.error(`Error reading ${dirPath}:`, error);
      }
    }

    await searchDir(repoPath);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching files:", error);
    return NextResponse.json({ error: "Failed to search files" }, { status: 500 });
  }
}
