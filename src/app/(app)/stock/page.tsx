import Link from "next/link";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { CATEGORIES, fmtQty, stockLevel } from "@/lib/stock";

export const metadata = { title: "Stock" };

export default async function Stock({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; ver?: string }> }) {
  await requireUser();
  const me = await getCurrentUser();
  const { q = "", cat = "", ver = "" } = await searchParams;
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = await sql`
    select id, name, category, unit, qty, min_qty, location, active from stock_items
    where (${ver === "inactivos"} or active)
      and (${q.trim() === ""} or lower(name) like ${like} or lower(coalesce(ref, '')) like ${like} or lower(coalesce(location, '')) like ${like})
      and (${cat === ""} or category = ${cat})
      and (${ver !== "bajos"} or qty < min_qty or qty <= 0)
    order by category, lower(name) limit 1000`;
  const [{ low }] = await sql`select count(*)::int as low from stock_items where active and (qty < min_qty or qty <= 0)`;
  const link = (params: Record<string, string>) => ({ query: Object.fromEntries(Object.entries({ q, cat, ver, ...params }).filter(([, v]) => v)) });
  const chip = (active: boolean, href: ReturnType<typeof link>, label: React.ReactNode) => (
    <Link href={href} className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${active ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{label}</Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Stock</h1>
        {me?.role === "direccion" && <Link href="/stock/nuevo" className="btn">+ Nuevo material</Link>}
      </div>
      <form>
        {cat && <input type="hidden" name="cat" value={cat} />}
        {ver && <input type="hidden" name="ver" value={ver} />}
        <input className="input" name="q" defaultValue={q} placeholder="Buscar material, referencia o estantería" />
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chip(ver === "bajos", link({ ver: ver === "bajos" ? "" : "bajos" }),
          <>Bajo mínimo <span className={ver === "bajos" ? "" : low ? "font-semibold text-bad" : "text-muted"}>{low}</span></>)}
        {chip(cat === "", link({ cat: "" }), "Todo")}
        {Object.entries(CATEGORIES).map(([k, l]) => chip(cat === k, link({ cat: k }), l))}
      </div>

      {/* Tarjetas grandes: se tocan con el dedo en la tablet para apuntar entradas y salidas. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const lvl = stockLevel(r.qty, r.min_qty);
          return (
            <Link key={r.id} href={`/stock/${r.id}`} className={`card flex items-center gap-4 p-4 hover:border-ink ${r.active ? "" : "opacity-50"}`}>
              <span className={`h-3 w-3 shrink-0 rounded-full ${lvl.dot}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block text-sm text-muted">{CATEGORIES[r.category] ?? r.category}{r.location ? ` · ${r.location}` : ""}</span>
              </span>
              <span className="text-right">
                <span className="block text-xl font-semibold">{fmtQty(r.qty)}</span>
                <span className="block text-xs text-muted">{r.unit}{r.min_qty > 0 ? ` · mín. ${fmtQty(r.min_qty)}` : ""}</span>
              </span>
            </Link>
          );
        })}
      </div>
      {rows.length === 0 && (
        <div className="card p-6 text-center text-muted">
          {q || cat || ver ? "Ningún material coincide." : "Aún no hay materiales. Se pueden dar de alta uno a uno o cargarlos desde un Excel (próximamente)."}
        </div>
      )}
      {me?.role === "direccion" && ver !== "inactivos" && <Link href={link({ ver: "inactivos" })} className="block text-sm text-muted underline">Ver también los desactivados</Link>}
    </div>
  );
}
