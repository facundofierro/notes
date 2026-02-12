import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { createTask } from "@/lib/task-creator";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { 
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyEntry = validateApiKey(apiKey);

  if (!keyEntry) {
    return NextResponse.json({ error: "Invalid API Key" }, { 
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const body = await req.json();
    const result = await createTask(body);
    
    return NextResponse.json(result, {
      status: 201,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
}
