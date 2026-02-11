import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveProjectPath } from "@/lib/settings";

interface UsersConfig {
  users: string[];
}

async function ensureUsersConfig(
  repo: string,
): Promise<{ filePath: string; data: UsersConfig }> {
  const repoPath = await resolveProjectPath(repo);

  if (!repoPath) {
    // If repo not found, return empty users
    return { filePath: "", data: { users: [] } };
  }

  const agelumDir = path.join(repoPath, ".agelum");
  const configDir = path.join(agelumDir, "config");
  const filePath = path.join(configDir, "users.json");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const initial: UsersConfig = { users: [] };
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2));
    return { filePath, data: initial };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as UsersConfig;
    if (!Array.isArray(data.users)) {
      return { filePath, data: { users: [] } };
    }
    return { filePath, data };
  } catch {
    return { filePath, data: { users: [] } };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ users: [] });
  }

  const { data } = await ensureUsersConfig(repo);
  return NextResponse.json({ users: data.users });
}
