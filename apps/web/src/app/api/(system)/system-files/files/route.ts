import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dirPath = searchParams.get("path") || os.homedir();
  const showHidden = searchParams.get("hidden") === "true";

  try {
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    const items = entries
      .filter((entry) => {
        if (!showHidden && entry.name.startsWith(".")) return false;
        return entry.isDirectory(); // Only list directories for project selection
      })
      .map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        type: "directory",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = path.dirname(dirPath);

    return NextResponse.json({
      path: dirPath,
      parent: parent !== dirPath ? parent : null,
      items,
    });
  } catch (error) {
    console.error("Error listing directory:", error);
    return NextResponse.json(
      { error: "Failed to list directory" },
      { status: 500 },
    );
  }
}
