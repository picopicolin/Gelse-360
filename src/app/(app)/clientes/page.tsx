import Link from "next/link";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  await requireDireccion();
  const { q = "", tipo = "" } = await searchParams;
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = await sql`
    select c.id, c.kind, c.name, c.contact, c.phone, c.city,
           count(k.id)::int as kitchens, count(k.id) filter (where k.phase not in ('cobrada', 'descartada'))::int as active
    from clients c left join kitchens k on k.client_id = c.id
    where (${q.trim() === ""} or lower(c.name) like ${like} or lower(coalesce(c.contact, '')) like ${like}
           or coalesce(c.phone, '') like ${like} or lower(coalesce(c.nif, '')) like ${like})
      and (${tipo === ""} or c.kind = ${tipo})
    group by c.id order by lower(c.name) limit 500`;
  const tab = (v: string, l: string) => (
    <Link href={{ query: { ...(q ? { q } : {}), ...(v ? { tipo: v } : {}) } }}
      className={`rounded-xl px-3 py-2 text-sm ${tipo === v ? "bg-ink text-white" : "bg-white border border-line"}`}>{l}</Link>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Clientes</h1>
        <Link href="/clientes/nuevo" className="btn">+ Nuevo cliente</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form className="min-w-56 flex-1">
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <input className="input" name="q" defaultValue={q} placeholder="Buscar por nombre, teléfono o NIF" />
        </form>
        {tab("", "Todos")}{tab("particular", "Particulares")}{tab("profesional", "Profesionales")}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Teléfono</th><th className="p-3">Población</th><th className="p-3 text-right">Cocinas</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3">
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  {c.contact && <span className="block text-muted">{c.contact}</span>}
                </td>
                <td className="p-3">{c.kind === "profesional" ? "Profesional" : "Particular"}</td>
                <td className="whitespace-nowrap p-3">{c.phone ?? "—"}</td>
                <td className="p-3">{c.city ?? "—"}</td>
                <td className="p-3 text-right">{c.kitchens}{c.active > 0 && <span className="text-muted"> ({c.active} en marcha)</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">{q || tipo ? "Ningún cliente coincide." : "Aún no hay clientes."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
