import { NextResponse } from "next/server";
import { spawn } from "child_process";

const execPromise = (
  command: string,
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    // We keep execPromise for git commands which are simple
    // But for Gemini we will use spawn directly below
    const { exec } = require("child_process");
    exec(command, { cwd }, (error: any, stdout: string, stderr: string) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoPath, diff } = body;

    if (!repoPath) {
      return NextResponse.json(
        { error: "Repository path is required" },
        { status: 400 },
      );
    }

    // 1. Get the diff if not provided
    let gitDiff = diff;
    if (!gitDiff) {
      // Get staged changes diff
      const { stdout } = await execPromise(`git diff --cached`, repoPath);
      gitDiff = stdout;

      if (!gitDiff) {
        // Fallback to all changes if nothing staged
        const { stdout: modifiedDiff } = await execPromise(
          `git diff`,
          repoPath,
        );
        gitDiff = modifiedDiff;
      }
    }

    if (!gitDiff || gitDiff.trim().length === 0) {
      return NextResponse.json(
        { message: "No changes detected" },
        { status: 200 },
      );
    }

    const prompt = `Generate a concise and descriptive git commit message for the following changes. 
    Follow the Conventional Commits specification (e.g., 'feat:', 'fix:', 'chore:', etc.).
    Only return the commit message, nothing else.

    Changes:
    ${gitDiff.substring(0, 10000)} 
    `; // Limit diff size to avoid token limits if very large

    // 2. Call Gemini CLI using spawn to avoid shell issues and length limits
    const geminiOutput = await new Promise<string>((resolve, reject) => {
      // Use -p "" to force non-interactive mode while providing prompt via stdin
      const child = spawn("gemini", ["-p", "", "--model", "gemini-2.0-flash"], {
        env: process.env,
      });

      const outputChunks: string[] = [];
      const errorChunks: string[] = [];

      if (child.stdin) {
        child.stdin.end(prompt);
      } else {
        reject(new Error("Failed to create stdin for Gemini CLI"));
        return;
      }

      child.stdout.on("data", (data) => outputChunks.push(data.toString()));
      child.stderr.on("data", (data) => errorChunks.push(data.toString()));

      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Gemini CLI exited with code ${code}: ${errorChunks.join("")}`,
            ),
          );
        } else {
          resolve(outputChunks.join(""));
        }
      });

      child.on("error", (err) => reject(err));
    });

    return NextResponse.json({ message: geminiOutput.trim() });
  } catch (error: any) {
    console.error("Generate commit error:", error);
    return NextResponse.json(
      { error: error.stderr || error.message },
      { status: 500 },
    );
  }
}
