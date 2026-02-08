import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");

// Ensure directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

export async function GET() {
  try {
    const files = fs.readdirSync(TEST_DIR).filter((f) => f.endsWith(".json"));
    const tests = files.map((file) => {
      const filePath = path.join(TEST_DIR, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(content);
        return {
          id: file.replace(".json", ""),
          name: json.name || file,
          stepsCount: json.steps?.length || 0,
          updatedAt: fs.statSync(filePath).mtime.toISOString(),
        };
      } catch (e) {
        return {
          id: file.replace(".json", ""),
          name: file,
          error: "Invalid JSON",
        };
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    return NextResponse.json({ error: "Failed to list tests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name || "Untitled Test";
    const id = body.name
      ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : `test-${Date.now()}`;
    
    // Basic scenario structure
    const scenario = {
      name,
      steps: body.steps || [],
    };

    const filePath = path.join(TEST_DIR, `${id}.json`);
    
    // Write file
    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));

    return NextResponse.json({ id, name, filePath });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
