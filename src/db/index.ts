import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// A small connection pool is fine for serverless-ish usage; Next.js route
// handlers each get a module-level singleton via this file.
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
