"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDireccion, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { date, text } from "@/lib/form";
import { isFactoryZone, zoneLabel } from "@/lib/naves";
import { cm, isStatus, STATUS } from "@/lib/sheet";

const refresh = (kitchenId: number) => {
  revalidatePath(`/cocinas/${kitchenId}`);
  revalidatePath("/fabrica");
};

const kitchenTitle = async (id: number) => (await sql`select title from kitchens where id = ${id}`)[0]?.title ?? `cocina #${id}`;

// ── Zonas ──────────────────────────────────────────────────────────────

export async function saveZone(fd: FormData) {
  const me = await requireDireccion();
  const kitchenId = Number(fd.get("kitchen_id"));
  const id = Number(fd.get("id")) || null;
  const name = text(fd, "name");
  const finish = text(fd, "finish");
  if (!name) return;
  if (id) {
    await sql`update kitchen_zones set name = ${name}, finish = ${finish} where id = ${id} and kitchen_id = ${kitchenId}`;
  } else {
    await sql`insert into kitchen_zones (kitchen_id, name, finish, sort)
              values (${kitchenId}, ${name}, ${finish}, (select coalesce(max(sort), 0) + 1 from kitchen_zones where kitchen_id = ${kitchenId}))`;
  }
  await audit(me, id ? "editar" : "crear", "hoja de fábrica", `${id ? "Zona cambiada" : "Zona nueva"} «${name}» en ${await kitchenTitle(kitchenId)}`,
    { id: kitchenId, href: `/cocinas/${kitchenId}` });
  refresh(kitchenId);
}

/** Quita una zona con todo lo que tiene dentro (la pantalla pide confirmación antes). */
export async function removeZone(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id"));
  const [z] = await sql`delete from kitchen_zones where id = ${id} returning kitchen_id, name`;
  if (!z) return;
  await audit(me, "borrar", "hoja de fábrica", `Zona «${z.name}» quitada de ${await kitchenTitle(z.kitchen_id)}`,
    { id: z.kitchen_id, href: `/cocinas/${z.kitchen_id}` });
  refresh(z.kitchen_id);
}

// ── Muebles y piezas ───────────────────────────────────────────────────

export async function addItem(fd: FormData) {
  const me = await requireDireccion();
  const zoneId = Number(fd.get("zone_id"));
  const [z] = await sql`select kitchen_id from kitchen_zones where id = ${zoneId}`;
  if (!z) return;
  const kind = fd.get("kind") === "pieza" ? "pieza" : "mueble";
  const typeId = kind === "mueble" ? Number(fd.get("cabinet_type_id")) || null : null;
  const [t] = typeId ? await sql`select name, width, height, depth from cabinet_types where id = ${typeId}` : [];
  const width = cm(fd.get("width")), height = cm(fd.get("height")), depth = cm(fd.get("depth"));
  const name = text(fd, "name") ?? t?.name;
  if (!name) return;
  // A medida: mueble sin catálogo, o con alguna medida distinta de la estándar.
  const custom = kind === "mueble" && (!t || [[width, t.width], [height, t.height], [depth, t.depth]].some(([a, b]) => a != null && a !== b));
  await sql`insert into kitchen_items ${sql({
    kitchen_id: z.kitchen_id, zone_id: zoneId, kind, cabinet_type_id: typeId, name,
    width: width ?? t?.width ?? null, height: height ?? t?.height ?? null, depth: depth ?? t?.depth ?? null,
    custom, qty: Math.max(1, Number(fd.get("qty")) || 1), notes: text(fd, "notes"),
  })}`;
  await audit(me, "crear", "hoja de fábrica", `${kind === "mueble" ? "Mueble" : "Pieza"} «${name}» en ${await kitchenTitle(z.kitchen_id)}`,
    { id: z.kitchen_id, href: `/cocinas/${z.kitchen_id}` });
  refresh(z.kitchen_id);
}

export async function removeItem(fd: FormData) {
  const me = await requireDireccion();
  const [it] = await sql`delete from kitchen_items where id = ${Number(fd.get("id"))} returning kitchen_id, name`;
  if (!it) return;
  await audit(me, "borrar", "hoja de fábrica", `Quitado «${it.name}» de ${await kitchenTitle(it.kitchen_id)}`,
    { id: it.kitchen_id, href: `/cocinas/${it.kitchen_id}` });
  refresh(it.kitchen_id);
}

/** Fábrica: cambiar el estado de un mueble (pendiente → en curso → hecho). Lo puede hacer cualquier usuario. */
export async function setItemStatus(fd: FormData) {
  const me = await requireUser();
  const status = String(fd.get("status"));
  if (!isStatus(status)) return;
  const [it] = await sql`update kitchen_items set status = ${status},
                           done_at = ${status === "hecho" ? sql`now()` : null}, done_by = ${status === "hecho" ? me.name : null}
                         where id = ${Number(fd.get("id"))} returning kitchen_id, name`;
  if (!it) return;
  await audit(me, "editar", "fábrica", `«${it.name}» de ${await kitchenTitle(it.kitchen_id)}: ${STATUS[status].label}`,
    { id: it.kitchen_id, href: `/cocinas/${it.kitchen_id}` });
  refresh(it.kitchen_id);
}

/** Fábrica: Sergio da un mueble a un operario (vacío = sin asignar). */
export async function assignItem(fd: FormData) {
  const me = await requireUser();
  const who = text(fd, "assigned_to");
  const [it] = await sql`update kitchen_items set assigned_to = ${who} where id = ${Number(fd.get("id"))} returning kitchen_id, name`;
  if (!it) return;
  await audit(me, "editar", "fábrica", `«${it.name}» de ${await kitchenTitle(it.kitchen_id)}: ${who ? `para ${who}` : "sin asignar"}`,
    { id: it.kitchen_id, href: `/cocinas/${it.kitchen_id}` });
  refresh(it.kitchen_id);
}

/** Fábrica: en qué zona de la nave está la cocina ahora (para el 3D). Vacío = sin zona. */
export async function setFactoryZone(fd: FormData) {
  const me = await requireUser();
  const id = Number(fd.get("kitchen_id"));
  const zone = String(fd.get("zone") ?? "");
  const value = isFactoryZone(zone) ? zone : null;
  const [k] = await sql`update kitchens set factory_zone = ${value} where id = ${id} returning title`;
  if (!k) return;
  await audit(me, "editar", "fábrica", `«${k.title}» pasa a ${zoneLabel(value)}`, { id, href: `/cocinas/${id}` });
  revalidatePath("/fabrica");
  revalidatePath("/naves");
}

// ── Frentes ────────────────────────────────────────────────────────────

export async function saveFronts(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("kitchen_id"));
  const data = { fronts_supplier: text(fd, "fronts_supplier"), fronts_ordered: date(fd, "fronts_ordered"), fronts_received: date(fd, "fronts_received") };
  await sql`update kitchens set ${sql(data)} where id = ${id}`;
  await audit(me, "editar", "cocina", `Frentes de ${await kitchenTitle(id)}: ${data.fronts_received ? "recibidos" : data.fronts_ordered ? "pedidos" : "sin pedir"}`,
    { id, href: `/cocinas/${id}` });
  refresh(id);
}
