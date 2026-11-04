"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

// Tras 5 fallos seguidos, el usuario queda bloqueado 15 minutos.
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function login(fd: FormData) {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const [u] = await sql`select id, name, role, password_hash, active, locked_until > now() as locked from users where username = ${username}`;
  if (!u) redirect("/login?error=1");
  if (!u.active) redirect("/login?error=inactivo");
  if (u.locked) redirect("/login?error=bloqueado");
  if (!(await bcrypt.compare(password, u.password_hash))) {
    await sql`update users set failed_logins = failed_logins + 1,
                locked_until = case when failed_logins + 1 >= ${MAX_FAILS} then now() + make_interval(mins => ${LOCK_MINUTES}) end
              where id = ${u.id}`;
    redirect("/login?error=1");
  }
  await sql`update users set failed_logins = 0, locked_until = null where id = ${u.id}`;
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: u.id, name: u.name, role: u.role }), sessionCookieOptions);
  await audit({ uid: u.id, name: u.name }, "entrar", "sesión", "Ha entrado en la web");
  redirect(u.role === "fabrica" ? "/fabrica" : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
