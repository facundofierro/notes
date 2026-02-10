import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");
const INDEX_FILE = path.join(TEST_DIR, "index.json");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { executionId, status, logs, screenshots, startedAt, completedAt } = body;

    if (!executionId) {
      return NextResponse.json({ error: "Execution ID is required" }, { status: 400 });
    }

    const execDir = path.join(process.cwd(), ".agelum/tests/runs", id, executionId);
    if (!fs.existsSync(execDir)) {
      fs.mkdirSync(execDir, { recursive: true });
    }

    let testName = id;
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
        const entry = index.find((t: any) => t.id === id);
        if (entry) testName = entry.name || testName;
      } catch {}
    }

    const start = startedAt || new Date().toISOString();
    const end = completedAt || new Date().toISOString();
    const duration = new Date(end).getTime() - new Date(start).getTime();

    const result = {
      id: executionId,
      testId: id,
      testName,
      startedAt: start,
      completedAt: end,
      status: status || "unknown",
      duration,
      logs: logs || [],
      screenshotCount: (screenshots || []).length,
      screenshots: (screenshots || []).map((p: string) => {
        if (p.startsWith("http") || p.startsWith("/api/tests/artifacts/")) return p;
        const parts = p.split(".agelum/tests/runs/");
        return parts.length > 1 ? `/api/tests/artifacts/${parts[1]}` : p;
      }),
    };

    fs.writeFileSync(
      path.join(execDir, "result.json"),
      JSON.stringify(result, null, 2)
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
