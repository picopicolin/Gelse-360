"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { date, money, text } from "@/lib/form";
import { isPhase, phaseLabel } from "@/lib/phases";

/** Crea la cocina (sin id) o guarda los cambios (con id). Vuelve a su ficha. */
export async function saveKitchen(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id")) || null;
  const data = {
    client_id: Number(fd.get("client_id")) || null,
    title: text(fd, "title"),
    ref: text(fd, "ref"),
    address: text(fd, "address"),
    city: text(fd, "city"),
    designer: text(fd, "designer"),
    install_date: date(fd, "install_date"),
    installer_id: Number(fd.get("installer_id")) || null,
    install_days: Math.min(30, Math.max(1, Number(fd.get("install_days")) || 1)),
    amount: money(fd, "amount"),
    notes: text(fd, "notes"),
  };
  if (!data.client_id || !data.title) redirect(id ? `/cocinas/${id}?editar=1&error=datos` : `/cocinas/nueva?error=datos`);
  let kitchenId = id;
  if (id) {
    await sql`update kitchens set ${sql(data)} where id = ${id}`;
    await audit(me, "editar", "cocina", `Datos de «${data.title}»`, { id, href: `/cocinas/${id}` });
  } else {
    const [k] = await sql`insert into kitchens ${sql(data)} returning id, phase`;
    kitchenId = k.id;
    await sql`insert into kitchen_phases (kitchen_id, phase, user_name) values (${k.id}, ${k.phase}, ${me.name})`;
    // La señal que se pone al crearla queda como primer cobro.
    const deposit = money(fd, "deposit");
    if (deposit && deposit > 0) {
      await sql`insert into payments (kitchen_id, amount, kind, user_name) values (${k.id}, ${deposit}, 'senal', ${me.name})`;
    }
    await audit(me, "crear", "cocina", `Nueva cocina «${data.title}»`, { id: k.id, href: `/cocinas/${k.id}` });
  }
  revalidatePath("/cocinas");
  redirect(`/cocinas/${kitchenId}?ok=1`);
}

/** Cambia la fase de una cocina y lo apunta en su historial. */
export async function setPhase(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id"));
  const phase = String(fd.get("phase"));
  if (!isPhase(phase)) return;
  const [k] = await sql`update kitchens set phase = ${phase}, phase_at = now() where id = ${id} and phase <> ${phase} returning title`;
  if (k) {
    await sql`insert into kitchen_phases (kitchen_id, phase, user_name) values (${id}, ${phase}, ${me.name})`;
    await audit(me, "editar", "cocina", `«${k.title}» pasa a ${phaseLabel(phase)}`, { id, href: `/cocinas/${id}` });
  }
  revalidatePath("/cocinas");
  // Se vuelve a la misma pestaña de la ficha desde la que se cambió la fase.
  const tab = String(fd.get("ver") ?? "");
  redirect(`/cocinas/${id}${/^[a-z]+$/.test(tab) ? `?ver=${tab}` : ""}`);
}
