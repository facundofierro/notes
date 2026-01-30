import { NextResponse } from "next/server";
import { readSettings, saveSettings, UserSettings } from "@/lib/settings";

export async function GET() {
  const settings = readSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  try {
    const newSettings = (await request.json()) as UserSettings;
    saveSettings(newSettings);
    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Reset logic is now handled by overwriting with defaults or deleting file
  // For simplicity, let's just write defaults
  const { defaultSettings } = await import("@/lib/settings");
  saveSettings(defaultSettings);
  return NextResponse.json({ settings: defaultSettings });
}
