import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// If env is set to allow running runner directly?
// Or we assume local env/node.
// Since we are adding engine as a dependency, it should work via TSX if TSX exists.

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "No test ID" }, { status: 400 });

    const INDEX_FILE = path.join(process.cwd(), ".agelum/tests/index.json");
    
    let testPath = "";
    if (fs.existsSync(INDEX_FILE)) {
      const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
      const testEntry = index.find((t: any) => t.id === id);
      if (testEntry && testEntry.group && testEntry.folder) {
        testPath = path.join(process.cwd(), ".agelum/tests", testEntry.group, testEntry.folder, "test.json");
      }
    }

    // Fallback for legacy flat file structure if not found in index
    if (!testPath || !fs.existsSync(testPath)) {
       const legacyPath = path.join(process.cwd(), ".agelum/tests", `${id}.json`);
       if (fs.existsSync(legacyPath)) {
         testPath = legacyPath;
       } else {
         return NextResponse.json({ error: "Test not found" }, { status: 404 });
       }
    }


    const runnerPath = path.join(
      process.cwd(),
      "packages/test-engine/src/runner.ts",
    );

    // Use npx tsx to run the runner script
    // Ensure we are in project root
    const cwd = process.cwd();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const child = spawn(
          "npx",
          ["tsx", runnerPath, testPath],
          {
            cwd,
            env: { ...process.env, PATH: process.env.PATH },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );

        child.stdout.on("data", (chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });

        child.stderr.on("data", (chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });

        child.on("close", (code) => {
          controller.enqueue(encoder.encode(`\nProcess exited with code ${code}\n`));
          controller.close();
        });

        child.on("error", (err) => {
          controller.enqueue(encoder.encode(`Error: ${err.message}\n`));
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
