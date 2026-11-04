"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { text } from "@/lib/form";
import { CATEGORIES, fmtQty, qtyValue, UNITS } from "@/lib/stock";

/** Alta (sin id) o cambio (con id) de un material. Solo dirección. */
export async function saveStockItem(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id")) || null;
  const category = String(fd.get("category"));
  const unit = String(fd.get("unit"));
  const data = {
    name: text(fd, "name"),
    category: category in CATEGORIES ? category : "otros",
    unit: UNITS.includes(unit) ? unit : "ud",
    min_qty: qtyValue(fd.get("min_qty")) ?? 0,
    location: text(fd, "location"),
    supplier: text(fd, "supplier"),
    ref: text(fd, "ref"),
    notes: text(fd, "notes"),
  };
  if (!data.name) redirect(id ? `/stock/${id}?editar=1&error=1` : "/stock/nuevo?error=1");
  let itemId = id;
  if (id) {
    await sql`update stock_items set ${sql(data)} where id = ${id}`;
    await audit(me, "editar", "stock", `Datos de «${data.name}»`, { id, href: `/stock/${id}` });
  } else {
    // Al dar de alta se puede poner lo que hay ya en el almacén: queda como primer ajuste.
    const initial = qtyValue(fd.get("qty")) ?? 0;
    const [it] = await sql`insert into stock_items ${sql({ ...data, qty: initial })} returning id`;
    itemId = it.id;
    if (initial !== 0) {
      await sql`insert into stock_moves (item_id, kind, delta, user_name, notes) values (${it.id}, 'ajuste', ${initial}, ${me.name}, 'Cantidad inicial')`;
    }
    await audit(me, "crear", "stock", `Nuevo material «${data.name}» (${fmtQty(initial)} ${data.unit})`, { id: it.id, href: `/stock/${it.id}` });
  }
  revalidatePath("/stock");
  redirect(`/stock/${itemId}?ok=1`);
}

/** Entrada, salida o recuento. Lo puede hacer cualquier usuario (la gente de fábrica, desde la tablet). */
export async function moveStock(fd: FormData) {
  const me = await requireUser();
  const id = Number(fd.get("id"));
  const kind = String(fd.get("kind"));
  const amount = qtyValue(fd.get("amount"));
  const kitchenId = Number(fd.get("kitchen_id")) || null;
  const notes = text(fd, "notes");
  if (!["entrada", "salida", "ajuste"].includes(kind) || amount == null || (kind !== "ajuste" && amount <= 0) || amount < 0) {
    redirect(`/stock/${id}?error=cantidad`);
  }
  const [it] = await sql`select name, unit, qty from stock_items where id = ${id}`;
  if (!it) redirect("/stock");
  // En un recuento se escribe lo que hay: el movimiento guarda la diferencia.
  const delta = kind === "entrada" ? amount : kind === "salida" ? -amount : amount - it.qty;
  if (delta === 0 && kind === "ajuste") redirect(`/stock/${id}?ok=igual`);
  await sql.begin(async (tx) => {
    await tx`insert into stock_moves (item_id, kind, delta, kitchen_id, user_name, notes)
             values (${id}, ${kind}, ${delta}, ${kind === "salida" ? kitchenId : null}, ${me.name}, ${notes})`;
    await tx`update stock_items set qty = qty + ${delta} where id = ${id}`;
  });
  const what = kind === "entrada" ? `Entrada de ${fmtQty(amount)}` : kind === "salida" ? `Salida de ${fmtQty(amount)}` : `Recuento: hay ${fmtQty(amount)}`;
  await audit(me, "editar", "stock", `${what} ${it.unit} de «${it.name}»`, { id, href: `/stock/${id}` });
  revalidatePath("/stock");
  if (kitchenId) revalidatePath(`/cocinas/${kitchenId}`);
  redirect(`/stock/${id}?ok=${kind}`);
}

/** Se desactiva en vez de borrarse, para no perder su historial. */
export async function toggleStockItem(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id"));
  const [it] = await sql`update stock_items set active = not active where id = ${id} returning name, active`;
  if (it) await audit(me, "editar", "stock", `${it.active ? "Reactivado" : "Desactivado"} «${it.name}»`, { id, href: `/stock/${id}` });
  revalidatePath("/stock");
  redirect(`/stock/${id}`);
}
