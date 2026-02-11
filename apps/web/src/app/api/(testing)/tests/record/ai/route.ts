import { NextResponse } from "next/server";
import { detectAvailableBackends, getAIRecommendation } from "@/lib/record-ai";

export async function GET() {
  try {
    const backends = await detectAvailableBackends();
    return NextResponse.json(backends);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const {
      screenshot,
      snapshot,
      prompt,
      deterministic,
      backend,
      projectPath,
    } = await request.json();
    console.log(`[RecordAI] Received request for backend: ${backend}`, {
      prompt,
      deterministic,
      projectPath,
      hasScreenshot: !!screenshot,
      screenshotSize: screenshot?.length,
      hasSnapshot: !!snapshot,
      snapshotSize: snapshot?.length,
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

    if (!backend) {
      return NextResponse.json({ error: "Backend required" }, { status: 400 });
    }

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot required" }, { status: 400 });
    }

    console.log("[RecordAI] Calling getAIRecommendation...");
    const recommendation = await getAIRecommendation({
      screenshot,
      snapshot,
      prompt,
      deterministic: deterministic ?? false,
      backend,
      projectPath,
    });
    console.log("[RecordAI] Recommendation received:", recommendation);

    return NextResponse.json(recommendation);
  } catch (error: any) {
    console.error("[RecordAI] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
