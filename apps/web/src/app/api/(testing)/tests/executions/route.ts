import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RUNS_DIR = path.join(process.cwd(), ".agelum/tests/runs");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId");

    if (!fs.existsSync(RUNS_DIR)) {
      return NextResponse.json([]);
    }

    const executions: any[] = [];

    if (testId) {
      // Get executions for a specific test
      const testRunsDir = path.join(RUNS_DIR, testId);
      if (fs.existsSync(testRunsDir)) {
        const execDirs = fs.readdirSync(testRunsDir).filter((d) => {
          return fs.statSync(path.join(testRunsDir, d)).isDirectory();
        });

        for (const execDir of execDirs) {
          const resultFile = path.join(testRunsDir, execDir, "result.json");
          if (fs.existsSync(resultFile)) {
            try {
              const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
              executions.push(result);
            } catch {
              // skip malformed result files
            }
          }
        }
      }
    } else {
      // Get all executions across all tests
      if (fs.existsSync(RUNS_DIR)) {
        const testDirs = fs.readdirSync(RUNS_DIR).filter((d) => {
          return fs.statSync(path.join(RUNS_DIR, d)).isDirectory();
        });

        for (const testDir of testDirs) {
          const testRunsPath = path.join(RUNS_DIR, testDir);
          const execDirs = fs.readdirSync(testRunsPath).filter((d) => {
            return fs.statSync(path.join(testRunsPath, d)).isDirectory();
          });

          for (const execDir of execDirs) {
            const resultFile = path.join(testRunsPath, execDir, "result.json");
            if (fs.existsSync(resultFile)) {
              try {
                const result = JSON.parse(
                  fs.readFileSync(resultFile, "utf-8")
                );
                executions.push(result);
              } catch {
                // skip malformed result files
              }
            }
          }
        }
      }
    }

    // Sort by startedAt descending (most recent first)
    executions.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    return NextResponse.json(executions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
