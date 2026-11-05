"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { date, eur, money, text } from "@/lib/form";
import { PAYMENT_KINDS } from "@/lib/payments";

export async function addPayment(fd: FormData) {
  const me = await requireDireccion();
  const kitchenId = Number(fd.get("kitchen_id"));
  const amount = money(fd, "amount");
  const kind = String(fd.get("kind"));
  if (!amount || amount <= 0 || !(kind in PAYMENT_KINDS)) redirect(`/cocinas/${kitchenId}?ver=cobros&error=cobro`);
  const [k] = await sql`select title from kitchens where id = ${kitchenId}`;
  if (!k) redirect("/cocinas");
  await sql`insert into payments ${sql({
    kitchen_id: kitchenId, amount, kind, date: date(fd, "date") ?? new Date().toISOString().slice(0, 10),
    method: text(fd, "method"), notes: text(fd, "notes"), user_name: me.name,
  })}`;
  await audit(me, "crear", "cobro", `${PAYMENT_KINDS[kind]} de ${eur(amount)} en «${k.title}»`, { id: kitchenId, href: `/cocinas/${kitchenId}` });
  revalidatePath(`/cocinas/${kitchenId}`);
  revalidatePath("/");
  redirect(`/cocinas/${kitchenId}?ver=cobros&ok=cobro`);
}

/** Quitar un cobro mal apuntado: deja de contar, pero se guarda (deleted_at). */
export async function removePayment(fd: FormData) {
  const me = await requireDireccion();
  const [p] = await sql`update payments set deleted_at = now(), deleted_by = ${me.name}
                        where id = ${Number(fd.get("id"))} and deleted_at is null returning kitchen_id, amount, kind`;
  if (!p) return;
  await audit(me, "borrar", "cobro", `Quitado: ${PAYMENT_KINDS[p.kind]} de ${eur(p.amount)}`, { id: p.kitchen_id, href: `/cocinas/${p.kitchen_id}` });
  revalidatePath(`/cocinas/${p.kitchen_id}`);
  revalidatePath("/");
}
