import Link from "next/link";
import PhaseBadge from "@/components/PhaseBadge";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";
import { DISCARDED, isPhase, PHASES } from "@/lib/phases";

export const metadata = { title: "Cocinas" };

// Sin filtro se ven las que están en marcha (ni cobradas ni descartadas).
export default async function Cocinas({ searchParams }: { searchParams: Promise<{ fase?: string; q?: string }> }) {
  await requireDireccion();
  const { fase = "", q = "" } = await searchParams;
  const phase = isPhase(fase) ? fase : "";
  const like = `%${q.trim().toLowerCase()}%`;
  const [counts, rows] = await Promise.all([
    sql`select phase, count(*)::int as n from kitchens group by phase`,
    sql`select k.id, k.title, k.ref, k.phase, k.designer, k.install_date::text, k.amount, k.phase_at, c.name as client
        from kitchens k join clients c on c.id = k.client_id
        where ${phase === "" ? sql`k.phase not in ('cobrada', 'descartada')` : sql`k.phase = ${phase}`}
          and (${q.trim() === ""} or lower(k.title) like ${like} or lower(c.name) like ${like} or lower(coalesce(k.ref, '')) like ${like})
        order by k.install_date nulls last, k.phase_at desc limit 500`,
  ]);
  const n = (k: string) => counts.find((c) => c.phase === k)?.n ?? 0;
  const active = counts.filter((c) => !["cobrada", "descartada"].includes(c.phase)).reduce((s, c) => s + c.n, 0);
  const chip = (key: string, label: string, count: number) => (
    <Link key={key} href={{ query: { ...(key ? { fase: key } : {}), ...(q ? { q } : {}) } }}
      className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${phase === key ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
      {label} <span className={phase === key ? "text-white/70" : "text-muted"}>{count}</span>
    </Link>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Cocinas</h1>
        <Link href="/cocinas/nueva" className="btn">+ Nueva cocina</Link>
      </div>
      {/* El recorrido de una cocina, con cuántas hay en cada fase. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chip("", "En marcha", active)}
        {PHASES.map((p) => chip(p.key, p.label, n(p.key)))}
        {chip(DISCARDED.key, DISCARDED.label, n(DISCARDED.key))}
      </div>
      <form>
        {phase && <input type="hidden" name="fase" value={phase} />}
        <input className="input" name="q" defaultValue={q} placeholder="Buscar por cocina, cliente o referencia" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr><th className="p-3">Cocina</th><th className="p-3">Cliente</th><th className="p-3">Fase</th><th className="p-3">Interiorista</th><th className="p-3">Montaje</th><th className="p-3 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3">
                  <Link href={`/cocinas/${k.id}`} className="font-medium hover:underline">{k.title}</Link>
                  {k.ref && <span className="block text-muted">{k.ref}</span>}
                </td>
                <td className="p-3">{k.client}</td>
                <td className="p-3"><PhaseBadge phase={k.phase} /></td>
                <td className="p-3">{k.designer ?? "—"}</td>
                <td className="whitespace-nowrap p-3">{dmy(k.install_date)}</td>
                <td className="whitespace-nowrap p-3 text-right">{eur(k.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">No hay cocinas aquí.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
