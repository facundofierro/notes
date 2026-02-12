import { NextResponse } from "next/server";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Helper to execute shell commands
const execPromise = (
  command: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoPath = searchParams.get("path");
  const action = searchParams.get("action");
  const file = searchParams.get("file");
  const ref = searchParams.get("ref");

  if (!repoPath) {
    return NextResponse.json(
      { error: "Repository path is required" },
      { status: 400 },
    );
  }

  try {
    if (action === "content") {
      if (!file)
        return NextResponse.json(
          { error: "File path required" },
          { status: 400 },
        );
      const targetRef = ref || "HEAD";
      // use git show
      const result = await execPromise(
        `git show ${targetRef}:"${file}"`,
        repoPath,
      );
      return NextResponse.json({ content: result.stdout });
    }

    // Helper to get all branches
    if (action === "branches") {
      const { stdout } = await execPromise(
        `git branch --format="%(refname:short)"`,
        repoPath,
      );
      const branches = stdout
        .split("\n")
        .filter(Boolean)
        .map((b) => b.trim());
      // Get current branch
      const { stdout: current } = await execPromise(
        `git branch --show-current`,
        repoPath,
      );
      return NextResponse.json({ branches, current: current.trim() });
    }

    // Default: Get Status (changed files)
    const statusCmd = `git status --porcelain=v2 -b -u`;
    const { stdout: statusOutput } = await execPromise(statusCmd, repoPath);

    // Parse status output
    const lines = statusOutput.split("\n").filter(Boolean);
    const files: any[] = [];
    let branchVal = { oid: "", head: "", upstream: "", ahead: 0, behind: 0 };

    lines.forEach((line) => {
      if (line.startsWith("#")) {
        // Branch info
        const parts = line.split(" ");
        if (parts[1] === "branch.oid") branchVal.oid = parts[2];
        if (parts[1] === "branch.head") branchVal.head = parts[2];
        if (parts[1] === "branch.upstream") branchVal.upstream = parts[2];
        if (parts[1] === "branch.ab") {
          branchVal.ahead = parseInt(parts[2].replace("+", ""));
          branchVal.behind = parseInt(parts[3].replace("-", ""));
        }
      } else {
        const char = line[0];
        if (char === "1" || char === "2") {
          const parts = line.split(" ");
          const xy = parts[1];
          const stagedStatus = xy[0];
          const unstagedStatus = xy[1];
          const filePath = parts.slice(8).join(" ");

          if (stagedStatus !== "." && stagedStatus !== " ") {
            files.push({
              path: filePath,
              status: "staged",
              code: stagedStatus,
            });
          }
          if (unstagedStatus !== "." && unstagedStatus !== " ") {
            files.push({
              path: filePath,
              status: "modified",
              code: unstagedStatus,
            });
          }
        } else if (char === "u") {
          const parts = line.split(" ");
          const filePath = parts.slice(10).join(" ");
          files.push({
            path: filePath,
            status: "unmerged",
            code: "U",
          });
        } else if (char === "?") {
          const parts = line.split(" ");
          const filePath = parts.slice(1).join(" ");
          files.push({ path: filePath, status: "untracked", code: "?" });
        }
      }
    });

    // 2. Get Local Commits (not pushed)
    // We need commits that are ahead of upstream
    // 2. Get Local Commits (not pushed)
    // We need commits that are ahead of upstream
    let localCommits: any[] = [];
    if (branchVal.ahead > 0 && branchVal.upstream) {
      const logCmd = `git log ${branchVal.upstream}..HEAD --pretty=format:"COMMIT:%H|%s|%an|%ad" --date=short --name-status`;
      try {
        const { stdout: logOutput } = await execPromise(logCmd, repoPath);

        const lines = logOutput.split("\n");
        let currentCommit: any = null;

        lines.forEach((line) => {
          if (!line.trim()) return;

          if (line.startsWith("COMMIT:")) {
            if (currentCommit) localCommits.push(currentCommit);
            const [hash, message, author, date] = line.substring(7).split("|");
            currentCommit = { hash, message, author, date, files: [] };
          } else if (currentCommit) {
            const parts = line.split("\t");
            const statusRaw = parts[0];
            const filePath = parts[parts.length - 1]; // Handle renames if necessary by taking the last part

            currentCommit.files.push({
              path: filePath,
              status: "committed",
              code: statusRaw,
            });
          }
        });
        if (currentCommit) localCommits.push(currentCommit);
      } catch (e) {
        console.error("Failed to get local commits", e);
      }
    }

    return NextResponse.json({
      branch: branchVal.head,
      upstream: branchVal.upstream,
      ahead: branchVal.ahead,
      behind: branchVal.behind,
      files,
      localCommits,
    });
  } catch (error: any) {
    console.error("Git status error:", error);
    // If fetching content fails (new file), return empty
    if (action === "content") return NextResponse.json({ content: "" });
    return NextResponse.json(
      { error: error.stderr || error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, repoPath, files, message } = body;

    if (!repoPath) {
      return NextResponse.json(
        { error: "Repository path is required" },
        { status: 400 },
      );
    }

    let result;
    switch (action) {
      case "stage":
        if (files && files.length > 0) {
          // stage specific files
          const filesArg = files.map((f: string) => `"${f}"`).join(" ");
          result = await execPromise(`git add ${filesArg}`, repoPath);
        } else {
          // stage all
          result = await execPromise(`git add .`, repoPath);
        }
        break;

      case "unstage":
        if (files && files.length > 0) {
          const filesArg = files.map((f: string) => `"${f}"`).join(" ");
          result = await execPromise(
            `git restore --staged ${filesArg}`,
            repoPath,
          );
        } else {
          result = await execPromise(`git restore --staged .`, repoPath);
        }
        break;

      case "commit":
        if (!message)
          return NextResponse.json(
            { error: "Commit message required" },
            { status: 400 },
          );
        // Escape quotes in message
        const escapedMessage = message.replace(/"/g, '\\"');
        result = await execPromise(
          `git commit -m "${escapedMessage}"`,
          repoPath,
        );
        break;

      case "push":
        result = await execPromise(`git push`, repoPath);
        break;

      case "pull":
        result = await execPromise(`git pull`, repoPath);
        break;

      case "fetch":
        result = await execPromise(`git fetch`, repoPath);
        break;

      case "checkout":
        const { branch } = body;
        if (!branch)
          return NextResponse.json(
            { error: "Branch name is required" },
            { status: 400 },
          );
        result = await execPromise(`git checkout "${branch}"`, repoPath);
        break;

      case "create-branch":
        const { newBranch } = body;
        if (!newBranch)
          return NextResponse.json(
            { error: "Branch name is required" },
            { status: 400 },
          );
        result = await execPromise(`git checkout -b "${newBranch}"`, repoPath);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, output: result?.stdout });
  } catch (error: any) {
    console.error("Git action error:", error);
    return NextResponse.json(
      { error: error.stderr || error.message },
      { status: 500 },
    );
  }
}
