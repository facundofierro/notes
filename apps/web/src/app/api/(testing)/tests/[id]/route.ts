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

    return NextResponse.json({
      id,
      ...json,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await request.json();

    if (!body.name || !Array.isArray(body.steps)) {
      return NextResponse.json(
        { error: "Invalid test structure. Name and steps array required." },
        { status: 400 },
      );
    }

    let filePath = resolveTestPath(id);
    if (!filePath) {
      // Create in flat structure as fallback
      filePath = path.join(TEST_DIR, `${id}.json`);
    }

    const testContent = {
      id,
      name: body.name,
      steps: body.steps,
    };

    fs.writeFileSync(filePath, JSON.stringify(testContent, null, 2));

    // Update index entry if it exists
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
        const entry = index.find((t: any) => t.id === id);
        if (entry) {
          entry.name = body.name;
          entry.stepsCount = body.steps.length;
          entry.updatedAt = new Date().toISOString();
          fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const filePath = resolveTestPath(id);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      // Try to remove the parent folder if empty
      const dir = path.dirname(filePath);
      try {
        const remaining = fs.readdirSync(dir);
        if (remaining.length === 0) fs.rmdirSync(dir);
      } catch {
        /* ignore */
      }
    }

    // Remove from index
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
        const filtered = index.filter((t: any) => t.id !== id);
        fs.writeFileSync(INDEX_FILE, JSON.stringify(filtered, null, 2));
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
