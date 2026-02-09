import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");
const INDEX_FILE = path.join(TEST_DIR, "index.json");

// Ensure directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

export async function GET() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const content = fs.readFileSync(INDEX_FILE, "utf-8");
      const tests = JSON.parse(content);
      return NextResponse.json(tests);
    }
    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to list tests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name || "Untitled Test";
    const group = body.group || "experimental";
    const folderName = body.folder || name.replace(/[^a-zA-Z0-9]/g, ""); 
    const id = body.id || `test-${Date.now()}`;
    
    let index: any[] = [];
    if (fs.existsSync(INDEX_FILE)) {
      index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
    }

    const groupDir = path.join(TEST_DIR, group);
    if (!fs.existsSync(groupDir)) fs.mkdirSync(groupDir, { recursive: true });

    const testDir = path.join(groupDir, folderName);
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const filePath = path.join(testDir, "test.json");

    const scenario = {
      id,
      name,
      group,
      folder: folderName,
      description: body.description || "",
      steps: body.steps || [],
      updatedAt: new Date().toISOString(),
    };

    const stepsCount = Array.isArray(body.steps) ? body.steps.length : 0;

    const existingIdx = index.findIndex((t: any) => t.id === id);
    if (existingIdx >= 0) {
      index[existingIdx] = {
        id,
        name,
        group,
        folder: folderName,
        description: body.description || "",
        stepsCount,
        updatedAt: scenario.updatedAt
      };
    } else {
      index.push({
        id,
        name,
        group,
        folder: folderName,
        description: body.description || "",
        stepsCount,
        updatedAt: scenario.updatedAt
      });
    }
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));

    return NextResponse.json(scenario);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

