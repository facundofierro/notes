import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SETTINGS_DIR = path.join(
  os.homedir(),
  ".agelum"
);
const SETTINGS_FILE = path.join(
  SETTINGS_DIR,
  "user-settings.json"
);

// Default settings
const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  notifications: true,
  autoSave: true,
  defaultView: "epics",
  sidebarCollapsed: false,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  showLineNumbers: true,
  wordWrap: true,
  aiModel: "default",
  aiProvider: "auto",
};

export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: boolean;
  autoSave: boolean;
  defaultView:
    | "ideas"
    | "docs"
    | "plan"
    | "epics"
    | "kanban"
    | "tests"
    | "commands"
    | "cli-tools";
  sidebarCollapsed: boolean;
  editorFontSize: number;
  editorFontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  aiModel: string;
  aiProvider: string;
}

function ensureSettingsDir(): void {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, {
      recursive: true,
    });
  }
}

function readSettings(): UserSettings {
  try {
    ensureSettingsDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      // Create default settings file if it doesn't exist
      fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(
          defaultSettings,
          null,
          2
        )
      );
      return defaultSettings;
    }
    const content = fs.readFileSync(
      SETTINGS_FILE,
      "utf-8"
    );
    const parsed = JSON.parse(
      content
    ) as Partial<UserSettings>;
    // Merge with defaults to ensure all fields exist
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch (error) {
    console.error(
      "Error reading settings:",
      error
    );
    return defaultSettings;
  }
}

function writeSettings(
  settings: UserSettings
): void {
  try {
    ensureSettingsDir();
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2)
    );
  } catch (error) {
    console.error(
      "Error writing settings:",
      error
    );
    throw error;
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const settings = readSettings();
    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error(
      "Error in GET /api/settings:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to read settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body =
      (await request.json()) as {
        settings: Partial<UserSettings>;
      };
    const currentSettings =
      readSettings();
    const newSettings = {
      ...currentSettings,
      ...body.settings,
    };
    writeSettings(newSettings);
    return NextResponse.json({
      settings: newSettings,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/settings:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to save settings",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body =
      (await request.json()) as {
        settings: Partial<UserSettings>;
      };
    const currentSettings =
      readSettings();
    const newSettings = {
      ...currentSettings,
      ...body.settings,
    };
    writeSettings(newSettings);
    return NextResponse.json({
      settings: newSettings,
    });
  } catch (error) {
    console.error(
      "Error in PATCH /api/settings:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to update settings",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      fs.unlinkSync(SETTINGS_FILE);
    }
    return NextResponse.json({
      settings: defaultSettings,
    });
  } catch (error) {
    console.error(
      "Error in DELETE /api/settings:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to reset settings",
      },
      { status: 500 }
    );
  }
}
