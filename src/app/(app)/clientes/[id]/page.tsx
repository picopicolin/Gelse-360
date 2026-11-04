import Link from "next/link";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import PhaseBadge from "@/components/PhaseBadge";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [c] = await sql`select name from clients where id = ${Number((await params).id) || 0}`;
  return { title: c?.name ?? "Cliente" };
}

export default async function FichaCliente({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; editar?: string }>;
}) {
  await requireDireccion();
  const { id } = await params;
  const { ok, editar } = await searchParams;
  const [c] = await sql`select * from clients where id = ${Number(id) || 0}`;
  if (!c) notFound();
  const kitchens = await sql`select id, title, ref, phase, install_date::text, amount from kitchens where client_id = ${c.id} order by created_at desc`;
  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/clientes" className="text-sm text-muted hover:text-ink">← Clientes</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{c.name}</h1>
          <p className="text-muted">{c.kind === "profesional" ? "Profesional" : "Particular"}{c.contact ? ` · ${c.contact}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={editar ? `/clientes/${c.id}` : `/clientes/${c.id}?editar=1`} className="btn-light">{editar ? "Cancelar" : "Editar"}</Link>
          <Link href={`/cocinas/nueva?cliente=${c.id}`} className="btn">+ Nueva cocina</Link>
        </div>
      </div>
      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">Guardado.</p>}

      {editar ? <ClientForm client={c} /> : (
        <div className="card grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
          {[
            ["Teléfono", c.phone && <a href={`tel:${c.phone}`} className="underline">{c.phone}</a>],
            ["Email", c.email && <a href={`mailto:${c.email}`} className="underline">{c.email}</a>],
            ["NIF / CIF", c.nif],
            ["Dirección", [c.address, c.postal_code, c.city].filter(Boolean).join(", ")],
          ].map(([l, v]) => (
            <div key={l as string}><p className="text-muted">{l}</p><p className="font-medium">{v || "—"}</p></div>
          ))}
          {c.notes && <div className="sm:col-span-2"><p className="text-muted">Notas</p><p className="whitespace-pre-wrap">{c.notes}</p></div>}
        </div>
      )}

      <h2 className="text-lg font-semibold">Cocinas</h2>
      <div className="card divide-y divide-line">
        {kitchens.map((k) => (
          <Link key={k.id} href={`/cocinas/${k.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-paper">
            <span><span className="font-medium">{k.title}</span>{k.ref && <span className="ml-2 text-sm text-muted">{k.ref}</span>}</span>
            <span className="flex items-center gap-3 text-sm text-muted">
              {k.install_date && <span>Montaje {dmy(k.install_date)}</span>}
              {k.amount != null && <span>{eur(k.amount)}</span>}
              <PhaseBadge phase={k.phase} />
            </span>
          </Link>
        ))}
        {kitchens.length === 0 && <p className="p-4 text-sm text-muted">Sin cocinas todavía.</p>}
      </div>
    </div>
  );
}
