import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// Use a separate file for usage tracking to avoid modifying the main configuration
const USAGE_FILE = "project-usage.json";

function getSettingsDir() {
  return path.join(os.homedir(), ".agelum");
}

function getUsageFile() {
  return path.join(getSettingsDir(), USAGE_FILE);
}

interface ProjectUsage {
  lastAccessed: number;
}

interface UsageData {
  projects: Record<string, ProjectUsage>;
}

function readUsageData(): UsageData {
  try {
    const file = getUsageFile();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading usage data:", error);
  }
  return { projects: {} };
}

function saveUsageData(data: UsageData) {
  try {
    const dir = getSettingsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = getUsageFile();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving usage data:", error);
  }
}

export async function GET() {
  try {
    const usage = readUsageData();
    return NextResponse.json(usage);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read usage data" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { repoName } = await req.json();

    if (!repoName) {
      return NextResponse.json(
        { error: "Repo name is required" },
        { status: 400 },
      );
    }

    const usage = readUsageData();

    // Update or create entry for the project
    usage.projects[repoName] = {
      ...usage.projects[repoName],
      lastAccessed: Date.now(),
    };

    saveUsageData(usage);

    return NextResponse.json({
      success: true,
      timestamp: usage.projects[repoName].lastAccessed,
    });
  } catch (error) {
    console.error("Error updating project usage:", error);
    return NextResponse.json(
      { error: "Failed to update usage" },
      { status: 500 },
    );
  }
}
