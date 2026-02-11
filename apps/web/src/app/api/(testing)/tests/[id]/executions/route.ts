import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RUNS_DIR = path.join(process.cwd(), ".agelum/tests/runs");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const testRunsDir = path.join(RUNS_DIR, id);
    if (!fs.existsSync(testRunsDir)) {
      return NextResponse.json([]);
    }

    const executions: any[] = [];
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

    // Sort by startedAt descending (most recent first)
    executions.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return NextResponse.json(executions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
