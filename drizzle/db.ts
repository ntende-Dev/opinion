import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * The database sits behind a gateway that resets connections left idle for a
 * few minutes, which arrived mid-render as "Connection terminated
 * unexpectedly" from a pool client that had gone stale. So the pool retires
 * its own idle clients well before the gateway does, recycles clients that
 * have served a lot of queries, and refuses to wait forever for a fresh one.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30_000,
  maxUses: 7_500,
  connectionTimeoutMillis: 10_000,
});

/**
 * A client the gateway has already reset can still surface its error after
 * the query that borrowed it has moved on. Nobody is awaiting it then, and
 * without a listener that error is unhandled — it took the whole server
 * process down once. It is logged and the client is retired quietly.
 */
pool.on("error", (err) => {
  console.error("idle database client error:", err.message);
});

export const db = drizzle(pool, { schema });
