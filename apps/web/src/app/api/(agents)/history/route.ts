import { NextResponse } from "next/server";
import { readAgentHistory, appendAgentHistory } from "@/lib/agent-history";

export async function GET() {
  const history = await readAgentHistory();
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  try {
    const session = await request.json();
    if (!session.toolName || !session.prompt || !session.contextKey) {
      return NextResponse.json(
        { error: "Missing required fields: toolName, prompt, contextKey" },
        { status: 400 },
      );
    }

    // Add default processId if not provided (though unexpected)
    const newSession = {
      ...session,
      startedAt: session.startedAt || Date.now(),
      processId: session.processId || crypto.randomUUID(),
    };

    await appendAgentHistory(newSession);
    return NextResponse.json({ session: newSession });
  } catch (error) {
    console.error("Failed to append history:", error);
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 },
    );
  }
}
