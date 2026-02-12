import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const AGELUM_DIR = path.join(os.homedir(), ".agelum");
const KEYS_FILE = path.join(AGELUM_DIR, "api-keys.json");

function getKeys() {
  if (!fs.existsSync(KEYS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveKeys(keys: any[]) {
  if (!fs.existsSync(AGELUM_DIR)) fs.mkdirSync(AGELUM_DIR, { recursive: true });
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

export async function GET() {
  const keys = getKeys();
  // Return keys without the actual hash/secret for the list
  const safeKeys = keys.map(({ key, ...rest }: any) => rest);
  return NextResponse.json(safeKeys);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  const rawKey = `ak_${crypto.randomBytes(24).toString("hex")}`;
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
  
  const newKey = {
    id: crypto.randomUUID(),
    name: name || "Chrome Plugin Key",
    key: hashedKey,
    userId: "default-user",
    createdAt: new Date().toISOString(),
  };

  const keys = getKeys();
  keys.push(newKey);
  saveKeys(keys);

  // Return the raw key ONLY ONCE
  return NextResponse.json({ ...newKey, rawKey });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const keys = getKeys();
  const filteredKeys = keys.filter((k: any) => k.id !== id);
  saveKeys(filteredKeys);
  return NextResponse.json({ success: true });
}
