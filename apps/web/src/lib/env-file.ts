import fs from "node:fs";
import path from "node:path";

function dotenvEscape(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function readDotenvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const out: Record<string, string> = {};
  for (const line of lines) {
    if (!line) continue;
    if (/^\s*#/.test(line)) continue;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const value = stripQuotes(match[2] ?? "");
    out[key] = value;
  }
  return out;
}

export function ensureEnvFileMissingOnly(
  dir: string,
  entries: Record<string, string | undefined>,
): void {
  const pairs = Object.entries(entries).filter(
    ([, v]) => typeof v === "string" && v.length > 0,
  ) as Array<[string, string]>;
  if (pairs.length === 0) return;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const envPath = path.join(dir, ".env");
  let lines: string[] = [];
  const indexByKey = new Map<string, number>();
  const hasNonEmptyValue = new Map<string, boolean>();

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (/^\s*#/.test(line)) continue;
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const key = match[1];
      indexByKey.set(key, i);
      const value = stripQuotes(match[2] ?? "");
      hasNonEmptyValue.set(key, value.length > 0);
    }
  }

  for (const [key, value] of pairs) {
    const alreadyHasValue = hasNonEmptyValue.get(key);
    if (alreadyHasValue) continue;
    const nextLine = `${key}=${dotenvEscape(value)}`;
    const idx = indexByKey.get(key);
    if (typeof idx === "number") {
      lines[idx] = nextLine;
    } else {
      lines.push(nextLine);
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, { mode: 0o600 });
}
