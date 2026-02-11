import { NextResponse } from "next/server";
import { readSettings, saveSettings, UserSettings } from "@/lib/settings";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  try {
    const newSettings = (await request.json()) as UserSettings;
    await saveSettings(newSettings);
    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as
      | { settings?: Partial<UserSettings> }
      | Partial<UserSettings>;
    const partial = "settings" in body && body.settings ? body.settings : body;

    const current = await readSettings();
    const merged: UserSettings = {
      ...current,
      ...partial,
    };
    await saveSettings(merged);

    return NextResponse.json({ settings: merged });
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  // Reset logic is now handled by overwriting with defaults or deleting file
  // For simplicity, let's just write defaults
  const { defaultSettings } = await import("@/lib/settings");
  await saveSettings(defaultSettings);
  return NextResponse.json({ settings: defaultSettings });
}
