import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Vercel's Postgres marketplace integrations (Neon, Supabase, etc.) don't
// all name their injected env var DATABASE_URL — fall back to the common
// alternates so this works regardless of which one gets connected.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING!;

// Serverless functions spin up many short-lived instances, so keep the
// per-instance pool small — Neon/Supabase free tiers cap total connections.
const client = postgres(connectionString, { max: 3 });

export const db = drizzle(client, { schema });
