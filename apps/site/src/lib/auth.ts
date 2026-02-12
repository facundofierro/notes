import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

export interface ApiKey {
  id: string;
  key: string; // SHA-256 hash
  name: string;
  userId: string;
  createdAt: string;
  lastUsedAt?: string;
}

const AGELUM_DIR = path.join(os.homedir(), ".agelum");
const KEYS_FILE = path.join(AGELUM_DIR, "api-keys.json");

export function validateApiKey(rawKey: string): ApiKey | null {
  if (!fs.existsSync(KEYS_FILE)) return null;

  try {
    const keys: ApiKey[] = JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
    
    const keyEntry = keys.find(k => k.key === hashedKey);
    if (keyEntry) {
      // Update lastUsedAt
      keyEntry.lastUsedAt = new Date().toISOString();
      fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
      return keyEntry;
    }
  } catch (error) {
    console.error("Error validating API key:", error);
  }

  return null;
}
