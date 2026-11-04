import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sql } from "./db";
import { type Role, SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = { uid: number; name: string; username: string; role: Role };

/** Usuario de la sesión, leído de la base de datos en cada petición: un cambio de rol o una baja se aplican al momento. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [u] = await sql`select id, name, username, role, active from users where id = ${s.uid}`;
  if (!u || !u.active) return null;
  return { uid: u.id, name: u.name, username: u.username, role: u.role };
});

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Solo dirección (Pol y José). La gente de fábrica va a su pantalla. */
export async function requireDireccion() {
  const u = await requireUser();
  if (u.role !== "direccion") redirect("/fabrica");
  return u;
}
