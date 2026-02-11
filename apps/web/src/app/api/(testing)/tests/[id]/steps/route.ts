import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");
const INDEX_FILE = path.join(TEST_DIR, "index.json");

function resolveTestPath(id: string): string | null {
  // Try index-based lookup first (group/folder structure)
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
      const entry = index.find((t: any) => t.id === id);
      if (entry && entry.group && entry.folder) {
        const p = path.join(TEST_DIR, entry.group, entry.folder, "test.json");
        if (fs.existsSync(p)) return p;
      }
    } catch {
      /* ignore parse errors */
    }
  }
  // Fallback to flat file structure
  const flat = path.join(TEST_DIR, `${id}.json`);
  if (fs.existsSync(flat)) return flat;
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const filePath = resolveTestPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);

    return NextResponse.json(json.steps || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const step = await request.json();
    if (!step) {
      return NextResponse.json(
        { error: "Step data is required" },
        { status: 400 },
      );
    }

    const filePath = resolveTestPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);

    if (!json.steps) json.steps = [];
    json.steps.push(step);
    json.updatedAt = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));

    // Update index entry if it exists
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
        const entry = index.find((t: any) => t.id === id);
        if (entry) {
          entry.stepsCount = json.steps.length;
          entry.updatedAt = json.updatedAt;
          fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(step);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
