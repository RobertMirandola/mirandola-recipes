import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Cached on globalThis so development hot reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { __recipesDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add the Neon connection string to the Vercel project's environment variables.",
    );
  }

  // Local development without Neon: a Postgres-compatible database stored in
  // .data/, with migrations applied on startup.
  const { mkdir } = await import("node:fs/promises");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await mkdir(".data", { recursive: true });
  const db = drizzle(new PGlite(".data/pglite"), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  globalForDb.__recipesDb ??= connect().catch((error) => {
    globalForDb.__recipesDb = undefined;
    throw error;
  });
  return globalForDb.__recipesDb;
}
