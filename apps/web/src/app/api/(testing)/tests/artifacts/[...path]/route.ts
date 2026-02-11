import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: filePathParts } = await params;
    if (!filePathParts || filePathParts.length === 0) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Security: Ensure we only serve from .agelum/tests/runs
    // We reconstruct the path
    const requestedPath = path.join(...filePathParts);

    // Prevent traversal
    if (requestedPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fullPath = path.join(
      process.cwd(),
      ".agelum/tests/runs",
      requestedPath,
    );

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    const fileBuffer = fs.readFileSync(fullPath);

    // Determine content type
    let contentType = "application/octet-stream";
    if (fullPath.endsWith(".png")) contentType = "image/png";
    else if (fullPath.endsWith(".jpg") || fullPath.endsWith(".jpeg"))
      contentType = "image/jpeg";
    else if (fullPath.endsWith(".json")) contentType = "application/json";
    else if (fullPath.endsWith(".txt") || fullPath.endsWith(".log"))
      contentType = "text/plain";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
