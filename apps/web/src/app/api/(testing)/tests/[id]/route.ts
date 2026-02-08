
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(process.cwd(), ".agelum/tests");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const filePath = path.join(TEST_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);

    return NextResponse.json({
        id,
        ...json
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await request.json();
    const filePath = path.join(TEST_DIR, `${id}.json`);

    // Ensure we are saving valid JSON structure
    // We expect body to contain { name, steps }
    // We might want to validate against Zod schema here, but let's keep it simple for now and trust the client or just save generic JSON.
    // The runner does validation at runtime.
    
    // Validate minimally
    if (!body.name || !Array.isArray(body.steps)) {
         return NextResponse.json({ error: "Invalid test structure. Name and steps array required." }, { status: 400 });
    }

    const testContent = {
        name: body.name,
        steps: body.steps
    };

    fs.writeFileSync(filePath, JSON.stringify(testContent, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const filePath = path.join(TEST_DIR, `${id}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
