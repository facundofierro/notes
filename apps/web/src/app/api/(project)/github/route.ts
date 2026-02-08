import { NextResponse } from "next/server";
import { exec } from "child_process";

// Helper to execute shell commands
const execPromise = (command: string, cwd: string): Promise<{ stdout: string; stderr: string }> => {
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
    return NextResponse.json({ error: "Repository path is required" }, { status: 400 });
  }

  try {
    if (action === "list") {
      // List open PRs
      const cmd = `gh pr list --json number,title,author,updatedAt,url,state,headRefName,baseRefName`;
      const { stdout } = await execPromise(cmd, repoPath);
      const prs = JSON.parse(stdout);
      return NextResponse.json({ prs });
    } else if (action === "details") {
      if (!prNumber) {
        return NextResponse.json({ error: "PR number is required" }, { status: 400 });
      }
      const cmd = `gh pr view ${prNumber} --json number,title,body,author,updatedAt,url,state,comments`;
      const { stdout } = await execPromise(cmd, repoPath);
      const pr = JSON.parse(stdout);
      return NextResponse.json({ pr });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: error.stderr || error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, repoPath, prNumber } = body;

    if (!repoPath) {
      return NextResponse.json({ error: "Repository path is required" }, { status: 400 });
    }

    if (action === "checkout") {
      if (!prNumber) {
        return NextResponse.json({ error: "PR number is required" }, { status: 400 });
      }
      const cmd = `gh pr checkout ${prNumber}`;
      const { stdout } = await execPromise(cmd, repoPath);
      return NextResponse.json({ success: true, output: stdout });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("GitHub API error:", error);
    return NextResponse.json({ error: error.stderr || error.message }, { status: 500 });
  }
}
