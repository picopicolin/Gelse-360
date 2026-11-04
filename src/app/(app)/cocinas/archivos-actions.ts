"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { putFile } from "@/lib/storage";

const KINDS = ["plano", "render", "foto", "otro"];
const MAX_BYTES = 20 * 1024 * 1024;

/** Sube uno o varios archivos a una cocina. Devuelve cuántos se han guardado y los que no. */
export async function uploadKitchenFiles(fd: FormData): Promise<{ ok: number; failed: string[] }> {
  const me = await requireDireccion();
  const kitchenId = Number(fd.get("kitchen_id"));
  const kind = KINDS.includes(String(fd.get("kind"))) ? String(fd.get("kind")) : "plano";
  const [k] = await sql`select title from kitchens where id = ${kitchenId}`;
  if (!k) return { ok: 0, failed: ["La cocina no existe"] };
  let ok = 0;
  const failed: string[] = [];
  for (const f of fd.getAll("files")) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > MAX_BYTES) { failed.push(`${f.name} (más de 20 MB)`); continue; }
    try {
      const stored = await putFile(Buffer.from(await f.arrayBuffer()), f.name);
      await sql`insert into kitchen_files ${sql({ kitchen_id: kitchenId, kind, name: f.name, ...stored, uploaded_by: me.name })}`;
      ok++;
    } catch {
      failed.push(f.name);
    }
  }
  if (ok) {
    await audit(me, "crear", "archivo", `${ok} ${ok === 1 ? "archivo" : "archivos"} (${kind}) en «${k.title}»`, { id: kitchenId, href: `/cocinas/${kitchenId}` });
    revalidatePath(`/cocinas/${kitchenId}`);
    revalidatePath("/fabrica");
  }
  return { ok, failed };
}

/** Quitar un archivo: deja de verse, pero se guarda (deleted_at) por si hay que recuperarlo. */
export async function removeKitchenFile(fd: FormData) {
  const me = await requireDireccion();
  const [f] = await sql`update kitchen_files set deleted_at = now(), deleted_by = ${me.name}
                        where id = ${Number(fd.get("id"))} and deleted_at is null returning kitchen_id, name`;
  if (!f) return;
  await audit(me, "borrar", "archivo", `Quitado «${f.name}»`, { id: f.kitchen_id, href: `/cocinas/${f.kitchen_id}` });
  revalidatePath(`/cocinas/${f.kitchen_id}`);
  revalidatePath("/fabrica");
}
