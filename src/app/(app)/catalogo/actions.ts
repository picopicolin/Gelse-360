"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { text } from "@/lib/form";
import { cm, FAMILIES } from "@/lib/sheet";

/** Nuevo mueble estándar, o cambio de uno que ya existe (mismo código). */
export async function saveCabinet(fd: FormData) {
  const me = await requireDireccion();
  const data = {
    code: text(fd, "code")?.toUpperCase() ?? null,
    family: String(fd.get("family")),
    name: text(fd, "name"),
    width: cm(fd.get("width")), height: cm(fd.get("height")), depth: cm(fd.get("depth")),
    notes: text(fd, "notes"),
  };
  if (!data.code || !data.name || !(data.family in FAMILIES) || data.width == null || data.height == null || data.depth == null) {
    redirect("/catalogo?error=1");
  }
  await sql`insert into cabinet_types ${sql(data)}
            on conflict (code) do update set family = excluded.family, name = excluded.name, width = excluded.width,
              height = excluded.height, depth = excluded.depth, notes = excluded.notes`;
  await audit(me, "editar", "catálogo", `${data.code} · ${data.name}`, { href: "/catalogo" });
  revalidatePath("/catalogo");
  redirect("/catalogo?ok=1");
}

/** Se desactivan en vez de borrarse: las cocinas que ya lo usan lo siguen teniendo. */
export async function toggleCabinet(fd: FormData) {
  const me = await requireDireccion();
  const [c] = await sql`update cabinet_types set active = not active where id = ${Number(fd.get("id"))} returning code, name, active`;
  if (c) await audit(me, "editar", "catálogo", `${c.active ? "Activado" : "Desactivado"} ${c.code} · ${c.name}`, { href: "/catalogo" });
  revalidatePath("/catalogo");
}
