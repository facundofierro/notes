import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = new Date().toISOString().split("T")[0];
    const shortId = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.name) || ".png";
    const fileName = `${timestamp}-${shortId}${ext}`;

    const publicDir = path.join(process.cwd(), "public");
    const uploadDir = path.join(publicDir, "temp", "images");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Cleanup old files (older than 24h)
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    files.forEach((f) => {
      const filePath = path.join(uploadDir, f);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/temp/images/${fileName}`;
    return NextResponse.json({ path: relativePath, name: file.name });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
