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
  const includeCommon = searchParams.get("includeCommon") === "true";

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

    // Default excluded directories
    let excludeDirs = [
      "node_modules",
      ".git",
      ".next",
      "dist",
      "build",
      ".agelum",
      "coverage",
      "target", // Rust/Maven
      "vendor", // PHP/Go
      "bin", // C#/Java
      "obj", // C#
    ];

    // If includeCommon is true, only exclude .git
    if (includeCommon) {
      excludeDirs = [".git"];
    }

    const globs = excludeDirs
      .map((dir) => `--glob "!**/${dir}/**"`)
      .join(" ");

    // Max results to prevent massive payloads
    const maxResults = 100;

    // Use ripgrep (rg) for fast text search
    // -i: case insensitive
    // -n: line number
    // --json: output in JSON format
    // --max-count: limit matches per file (optional, but good for performance)
    // -C 0: context lines (0 for now)
    
    // Sanitize query to avoid shell injection (basic)
    // Note: exec is still risky with user input, ideally use spawn or execFile with array args
    const safeQuery = query.replace(/'/g, "'\\''");

    const command = `rg --json -i -e '${safeQuery}' ${globs} "${repoPath}" | head -n 500`;

    try {
      // Increase maxBuffer to handle more output if needed
      const { stdout } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, 
      });

      const results = [];
      const lines = stdout.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.type === "match") {
            const file = item.data.path.text;
            const lineNumber = item.data.line_number;
            const content = item.data.lines.text.trim();
            const relativePath = path.relative(repoPath, file);

            results.push({
              file: relativePath,
              line: lineNumber,
              content: content,
            });

            if (results.length >= maxResults) break;
          }
        } catch (e) {
          // Ignore parse errors or non-match lines
        }
      }

      return NextResponse.json({ results });
    } catch (error: any) {
       // rg returns exit code 1 if no matches found, which isn't an error for us
       if (error.code === 1) {
         return NextResponse.json({ results: [] });
       }
       console.error("Search execution failed:", error);
       throw error;
    }

  } catch (error) {
    console.error("Error searching text:", error);
    return NextResponse.json(
      { error: "Failed to search text" },
      { status: 500 },
    );
  }
}
