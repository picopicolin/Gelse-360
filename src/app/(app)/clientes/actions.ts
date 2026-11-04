"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { text } from "@/lib/form";

/** Crea el cliente (sin id) o guarda los cambios (con id). Vuelve a su ficha. */
export async function saveClient(fd: FormData) {
  const me = await requireDireccion();
  const id = Number(fd.get("id")) || null;
  const data = {
    kind: fd.get("kind") === "profesional" ? "profesional" : "particular",
    name: text(fd, "name"),
    contact: text(fd, "contact"),
    nif: text(fd, "nif")?.toUpperCase() ?? null,
    phone: text(fd, "phone"),
    email: text(fd, "email")?.toLowerCase() ?? null,
    address: text(fd, "address"),
    city: text(fd, "city"),
    postal_code: text(fd, "postal_code"),
    notes: text(fd, "notes"),
  };
  if (!data.name) redirect(id ? `/clientes/${id}?error=nombre` : "/clientes/nuevo?error=nombre");
  let clientId = id;
  if (id) {
    await sql`update clients set ${sql(data)} where id = ${id}`;
    await audit(me, "editar", "cliente", `Datos de ${data.name}`, { id, href: `/clientes/${id}` });
  } else {
    const [c] = await sql`insert into clients ${sql(data)} returning id`;
    clientId = c.id;
    await audit(me, "crear", "cliente", `Alta de ${data.name} (${data.kind})`, { id: c.id, href: `/clientes/${c.id}` });
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${clientId}?ok=1`);
}
