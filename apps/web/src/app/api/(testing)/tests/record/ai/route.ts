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
    const { screenshot, snapshot, prompt, deterministic, backend } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!backend) {
      return NextResponse.json({ error: "Backend is required" }, { status: 400 });
    }

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot is required" }, { status: 400 });
    }

    const recommendation = await getAIRecommendation({
      screenshot,
      snapshot,
      prompt,
      deterministic: deterministic ?? false,
      backend,
    });

    return NextResponse.json(recommendation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
