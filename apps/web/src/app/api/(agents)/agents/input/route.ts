import { NextResponse } from "next/server";
import { getProcess } from "@/lib/agent-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, data } = body;

    if (!id || !data) {
      return NextResponse.json(
        { error: "Process ID and data are required" },
        { status: 400 },
      );
    }

    const process = getProcess(id);
    if (!process) {
      return NextResponse.json(
        { error: "Process not found or inactive" },
        { status: 404 },
      );
    }

    if (process.stdin && !process.stdin.destroyed) {
      process.stdin.write(data);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Process stdin is not writable" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process input" },
      { status: 500 },
    );
  }
}
