import "server-only";
import postgres from "postgres";

declare global {
  var __sql: postgres.Sql | undefined;
}

/** Dirección de la base de datos. Si la contraseña va aparte (DB_PASSWORD), se inserta ya codificada. */
export function databaseUrl(url = process.env.DATABASE_URL!, password = process.env.DB_PASSWORD) {
  if (!password) return url;
  const u = new URL(url);
  u.password = encodeURIComponent(password);
  return u.toString();
}

// `numeric` llega como número y `date` como texto 'YYYY-MM-DD' (sin líos de zona horaria).
// prepare:false para funcionar con el pooler de Supabase (modo transacción).
export const sql =
  globalThis.__sql ??
  postgres(databaseUrl(), {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 15,
    onnotice: () => {},
    types: {
      numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  });

if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;
