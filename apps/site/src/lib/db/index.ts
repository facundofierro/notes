import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections in development (Next.js hot reload)
declare global {
  // eslint-disable-next-line no-var
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return postgres(process.env.DATABASE_URL, { max: 10 });
}

const client =
  process.env.NODE_ENV === "development"
    ? (globalThis.__postgresClient ??= createClient())
    : createClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, { schema });
