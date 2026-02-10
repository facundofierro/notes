import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");

// Ensure directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

const DEFAULT_GROUPS = [
  "LOGIN",
  "NAVIGATION",
  "REGRESSION",
  "FEATURES",
  "EXPERIMENTAL",
];

export async function GET() {
  try {
    const existingFolders = fs.readdirSync(TEST_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);

    // Ensure default groups exist (case-insensitive check)
    for (const group of DEFAULT_GROUPS) {
      const exists = existingFolders.some(f => f.toLowerCase() === group.toLowerCase());
      if (!exists) {
        const groupPath = path.join(TEST_DIR, group);
        fs.mkdirSync(groupPath, { recursive: true });
      }
    }

    // Re-read to get updated list
    const items = fs.readdirSync(TEST_DIR, { withFileTypes: true });
    const groups = items
      .filter((item) => item.isDirectory() && !item.name.startsWith("."))
      .map((item) => item.name);

    return NextResponse.json(groups);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const groupPath = path.join(TEST_DIR, name);
    if (!fs.existsSync(groupPath)) {
      fs.mkdirSync(groupPath, { recursive: true });
    }

    return NextResponse.json({ name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
