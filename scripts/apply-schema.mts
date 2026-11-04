// Aplica db/schema.sql. Uso: npm run db:schema (local) · npm run db:schema -- --nube (Supabase)
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { scriptDbUrl } from "./db-url.mts";

const sql = postgres(scriptDbUrl(), { prepare: false, onnotice: () => {} });
await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log(`Esquema aplicado en ${new URL(scriptDbUrl()).host}`);
await sql.end();
