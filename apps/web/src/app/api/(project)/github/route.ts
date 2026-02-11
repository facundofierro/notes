import { NextResponse } from "next/server";
import { exec } from "child_process";

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
  const prNumber = searchParams.get("pr");

  if (!repoPath) {
    return NextResponse.json(
      { error: "Repository path is required" },
      { status: 400 },
    );
  }

  try {
    if (action === "list") {
      // List open PRs
      const cmd = `gh pr list --json number,title,author,updatedAt,url,state,headRefName,baseRefName,reviewDecision,statusCheckRollup`;
      const { stdout } = await execPromise(cmd, repoPath);
      const prs = JSON.parse(stdout);
      return NextResponse.json({ prs });
    } else if (action === "details") {
      if (!prNumber) {
        return NextResponse.json(
          { error: "PR number is required" },
          { status: 400 },
        );
      }
      const cmd = `gh pr view ${prNumber} --json number,title,body,author,updatedAt,url,state,comments,reviewDecision,statusCheckRollup,files,reviews,headRefName,baseRefName,mergeable`;
      const { stdout } = await execPromise(cmd, repoPath);
      const pr = JSON.parse(stdout);
      return NextResponse.json({ pr });
    } else if (action === "branches") {
      // List all local branches
      const cmd = `git branch --format='%(refname:short)'`;
      const { stdout } = await execPromise(cmd, repoPath);
      const branches = stdout.split("\n").filter((b) => b.trim() !== "");
      return NextResponse.json({ branches });
    } else if (action === "current-branch") {
      // Get current branch
      const cmd = `git branch --show-current`;
      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ branch: stdout.trim() });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("GitHub API error:", error);
    return NextResponse.json(
      { error: error.stderr || error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, repoPath, prNumber } = body;

    if (!repoPath) {
      return NextResponse.json(
        { error: "Repository path is required" },
        { status: 400 },
      );
    }

    if (action === "checkout") {
      if (!prNumber) {
        return NextResponse.json(
          { error: "PR number is required" },
          { status: 400 },
        );
      }
      const cmd = `gh pr checkout ${prNumber}`;
      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ success: true, output: stdout });
    } else if (action === "create") {
      const { title, body: prBody, base, head, isDraft } = body;

      if (!title || !head) {
        return NextResponse.json(
          { error: "Title and Head branch are required" },
          { status: 400 },
        );
      }

      // Construct command
      // properly escape quotes is tricky in shell, doing basic escaping here
      const escape = (str: string) => str.replace(/"/g, '\\"');

      let cmd = `gh pr create --title "${escape(title)}" --body "${escape(prBody || "")}" --head "${head}"`;
      if (base) cmd += ` --base "${base}"`;
      if (isDraft) cmd += ` --draft`;

      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ success: true, output: stdout });
    } else if (action === "merge") {
      if (!prNumber) {
        return NextResponse.json(
          { error: "PR number is required" },
          { status: 400 },
        );
      }
      // Merge with rebase by default or squash? The user didn't specify, but often squash or merge is safer.
      // Let's use --merge (default) or --auto if available.
      // For now, simple merge: gh pr merge <number> --merge --delete-branch
      // User asked "merge PR if that option is enabled, in this case is not requiring reviews"
      // We will just try `gh pr merge <number> --merge` (or --squash if preferred, but --merge preserves history).
      // Let's go with --merge.
      // Also added --admin to bypass requirements if needed? No, user said "if that option is enabled".

      const cmd = `gh pr merge ${prNumber} --merge --delete-branch`;
      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ success: true, output: stdout });
    } else if (action === "close") {
      if (!prNumber) {
        return NextResponse.json(
          { error: "PR number is required" },
          { status: 400 },
        );
      }
      const cmd = `gh pr close ${prNumber}`;
      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ success: true, output: stdout });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("GitHub API error:", error);
    return NextResponse.json(
      { error: error.stderr || error.message },
      { status: 500 },
    );
  }
}
