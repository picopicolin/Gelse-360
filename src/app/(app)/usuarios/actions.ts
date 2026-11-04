"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";

const ROLES = ["direccion", "fabrica"] as const;

/** Crea un usuario o, si ya existe, le pone la contraseña nueva y el rol. */
export async function saveUser(fd: FormData) {
  const me = await requireDireccion();
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const role = String(fd.get("role"));
  if (!/^[a-z0-9._-]{3,30}$/.test(username) || !name || !ROLES.includes(role as never)) redirect("/usuarios?error=datos");
  if (password.length < 8) redirect("/usuarios?error=corta");
  const hash = await bcrypt.hash(password, 10);
  const [u] = await sql`insert into users (username, name, password_hash, role) values (${username}, ${name}, ${hash}, ${role})
                        on conflict (username) do update set name = excluded.name, password_hash = excluded.password_hash,
                          role = excluded.role, failed_logins = 0, locked_until = null
                        returning id, (xmax = 0) as created`;
  await audit(me, u.created ? "crear" : "editar", "usuario", `${u.created ? "Alta" : "Cambio"} de ${name} (${username}, ${role})`, { id: u.id, href: "/usuarios" });
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}

/** Activa o desactiva un usuario (no se borra: así se mantiene en el registro). */
export async function toggleUser(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id"));
  if (id === me.uid) redirect("/usuarios?error=propio");
  const [u] = await sql`update users set active = not active where id = ${id} returning name, active`;
  if (u) await audit(me, "editar", "usuario", `${u.active ? "Activado" : "Desactivado"}: ${u.name}`, { id, href: "/usuarios" });
  revalidatePath("/usuarios");
}
