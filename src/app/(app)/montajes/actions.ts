"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { date, dmy, text } from "@/lib/form";

const refresh = () => { revalidatePath("/montajes"); revalidatePath("/"); revalidatePath("/naves"); };

/** Fecha, días y montador de una cocina. */
export async function scheduleKitchen(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("kitchen_id"));
  const data = {
    install_date: date(fd, "install_date"),
    install_days: Math.min(30, Math.max(1, Number(fd.get("install_days")) || 1)),
    installer_id: Number(fd.get("installer_id")) || null,
  };
  const [k] = await sql`update kitchens set ${sql(data)} where id = ${id} returning title`;
  if (!k) return;
  const [i] = data.installer_id ? await sql`select name from installers where id = ${data.installer_id}` : [];
  await audit(me, "editar", "montaje", `«${k.title}»: ${data.install_date ? dmy(data.install_date) : "sin fecha"}, ${i?.name ?? "sin montador"}`,
    { id, href: `/cocinas/${id}` });
  refresh();
  revalidatePath(`/cocinas/${id}`);
}

export async function saveInstaller(fd: FormData) {
  const me = await requireDireccion();
  const name = text(fd, "name");
  if (!name) redirect("/montajes?error=montador#montadores");
  const [i] = await sql`insert into installers (name, phone) values (${name}, ${text(fd, "phone")}) returning id`;
  await audit(me, "crear", "montador", `Nuevo montador: ${name}`, { id: i.id, href: "/montajes" });
  refresh();
  redirect("/montajes#montadores");
}

/** Se desactiva en vez de borrarse: las cocinas que montó lo siguen teniendo. */
export async function toggleInstaller(fd: FormData) {
  const me = await requireDireccion();
  const [i] = await sql`update installers set active = not active where id = ${Number(fd.get("id"))} returning name, active`;
  if (i) await audit(me, "editar", "montador", `${i.active ? "Reactivado" : "Desactivado"}: ${i.name}`, { href: "/montajes" });
  refresh();
}
