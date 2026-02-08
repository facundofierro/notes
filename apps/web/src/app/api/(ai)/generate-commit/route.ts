import { NextResponse } from "next/server";
import { exec } from "child_process";

const execPromise = (command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> => {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoPath, diff } = body;

    if (!repoPath) {
      return NextResponse.json({ error: "Repository path is required" }, { status: 400 });
    }

    // 1. Get the diff if not provided
    let gitDiff = diff;
    if (!gitDiff) {
       // Get staged changes diff
       const { stdout } = await execPromise(`git diff --cached`, repoPath);
       gitDiff = stdout;
       
       if (!gitDiff) {
          // Fallback to all changes if nothing staged, or maybe return error?
          // Usually we want to generate commit for staged changes. 
          // If nothing staged, let's try to see if there are modified files and suggest staging?
          // For now, let's try getting diff of modified files too if staged is empty
           const { stdout: modifiedDiff } = await execPromise(`git diff`, repoPath);
           gitDiff = modifiedDiff;
       }
    }

    if (!gitDiff || gitDiff.trim().length === 0) {
        return NextResponse.json({ message: "No changes detected" }, { status: 200 }); // Or 400?
    }

    const prompt = `Generate a concise and descriptive git commit message for the following changes. 
    Follow the Conventional Commits specification (e.g., 'feat:', 'fix:', 'chore:', etc.).
    Only return the commit message, nothing else.

    Changes:
    ${gitDiff.substring(0, 10000)} 
    `; // Limit diff size to avoid token limits if very large
    
    // 2. Call Gemini CLI
    // We assume 'gemini' is in PATH. If not, we might need absolute path.
    // Using gemini-2.0-flash as requested for speed/cost.
    const command = `gemini "${prompt.replace(/"/g, '\\"')}" --model gemini-2.0-flash`;
    
    const { stdout } = await execPromise(command);

    return NextResponse.json({ message: stdout.trim() });

  } catch (error: any) {
    console.error("Generate commit error:", error);
    return NextResponse.json({ error: error.stderr || error.message }, { status: 500 });
  }
}
