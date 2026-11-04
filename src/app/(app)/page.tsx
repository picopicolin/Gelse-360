import Link from "next/link";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";
import { addDays, loadMontajes, loadPendingPayments, today } from "@/lib/logistica";
import { phaseLabel } from "@/lib/phases";
import { fmtQty, stockLevel } from "@/lib/stock";

export const metadata = { title: "Panel" };

function Box({ title, href, count, tone, children }: { title: string; href: string; count: string; tone?: "bad" | "ok"; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Link href={href} className={`text-sm ${tone === "bad" ? "font-semibold text-bad" : "text-muted"} hover:underline`}>{count}</Link>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <li className="text-muted">{children}</li>;

// Panel de dirección: lo importante de hoy y de la semana.
export default async function Panel() {
  const user = await requireDireccion();
  const t = today();
  const week = addDays(t, 7);
  const [montajes, pending, low, [{ lowTotal }], phases] = await Promise.all([
    loadMontajes(),
    loadPendingPayments(),
    sql`select id, name, unit, qty, min_qty from stock_items
        where active and (qty < min_qty or qty <= 0) order by (qty <= 0) desc, qty / nullif(min_qty, 0) nulls first limit 6`,
    sql`select count(*)::int as "lowTotal" from stock_items where active and (qty < min_qty or qty <= 0)`,
    sql`select phase, count(*)::int as n from kitchens where phase not in ('cobrada', 'descartada') group by phase`,
  ]);
  // Retrasadas: la fecha ya pasó. En riesgo: se montan esta semana y aún les falta algo.
  const late = montajes.filter((m) => m.late);
  const risk = montajes.filter((m) => !m.late && m.install_date && m.install_date <= week && m.missing.length > 0);
  const next = montajes.filter((m) => m.install_date && m.install_date >= t && m.install_date <= week);
  const pendingTotal = pending.reduce((s, p) => s + p.pending, 0);
  const n = (keys: string[]) => phases.filter((p) => keys.includes(p.phase)).reduce((s, p) => s + p.n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-muted first-letter:uppercase">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" })}</p>
      </div>

      {/* Cuántas cocinas hay en cada tramo del recorrido. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Con interiorista", ["contacto", "medicion", "diseno"], "/cocinas?fase=diseno"],
          ["En fábrica", ["aceptada", "frentes", "fabrica"], "/fabrica"],
          ["Para montar", ["lista", "montaje"], "/montajes"],
          ["Montadas / postventa", ["montada", "postventa"], "/cocinas?fase=montada"],
        ].map(([label, keys, href]) => (
          <Link key={label as string} href={href as string} className="card p-4 hover:border-ink">
            <p className="text-2xl font-semibold">{n(keys as string[])}</p>
            <p className="text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Cocinas retrasadas o en riesgo" href="/montajes" count={late.length + risk.length ? `${late.length} ${late.length === 1 ? "retrasada" : "retrasadas"} · ${risk.length} en riesgo` : "Todo en plazo"} tone={late.length ? "bad" : undefined}>
          {[...late, ...risk].slice(0, 6).map((m) => (
            <li key={m.id}>
              <Link href={`/cocinas/${m.id}`} className="flex items-start gap-2 hover:underline">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.late ? "bg-bad" : "bg-warn"}`} />
                <span className="flex-1">{m.title} <span className="text-muted">· {m.client}</span>
                  <span className="block text-xs text-muted">{m.late ? `Montaje el ${dmy(m.install_date)}, sin montar` : `Montaje el ${dmy(m.install_date)} · falta ${m.missing.join(", ")}`}</span>
                </span>
              </Link>
            </li>
          ))}
          {late.length + risk.length === 0 && <Empty>Ninguna cocina retrasada ni con faltas para esta semana.</Empty>}
        </Box>

        <Box title="Montajes de los próximos 7 días" href="/montajes" count={`${next.length} ${next.length === 1 ? "montaje" : "montajes"}`}>
          {next.slice(0, 6).map((m) => (
            <li key={m.id}>
              <Link href={`/cocinas/${m.id}`} className="flex items-center gap-2 hover:underline">
                <span className="w-12 shrink-0 text-muted">{dmy(m.install_date).slice(0, 5)}</span>
                <span className="flex-1 truncate">{m.title} <span className="text-muted">· {m.installer ?? "sin montador"}</span></span>
                <span className={m.missing.length ? "text-warn" : "text-ok"}>{m.missing.length ? "falta algo" : "✓ listo"}</span>
              </Link>
            </li>
          ))}
          {next.length === 0 && <Empty>Ningún montaje esta semana.</Empty>}
        </Box>

        <Box title="Stock bajo" href="/stock?ver=bajos" count={lowTotal ? `${lowTotal} ${lowTotal === 1 ? "material" : "materiales"}` : "Todo bien"} tone={lowTotal ? "bad" : undefined}>
          {low.map((s) => (
            <li key={s.id}>
              <Link href={`/stock/${s.id}`} className="flex items-center gap-2 hover:underline">
                <span className={`h-2 w-2 shrink-0 rounded-full ${stockLevel(s.qty, s.min_qty).dot}`} />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-muted">{fmtQty(s.qty)} / {fmtQty(s.min_qty)} {s.unit}</span>
              </Link>
            </li>
          ))}
          {low.length === 0 && <Empty>Ningún material por debajo del mínimo.</Empty>}
        </Box>

        <Box title="Cobros pendientes" href="/cocinas" count={pending.length ? eur(pendingTotal) : "Nada pendiente"}>
          {pending.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link href={`/cocinas/${p.id}#cobros`} className="flex items-center gap-2 hover:underline">
                <span className="flex-1 truncate">{p.title} <span className="text-muted">· {p.client} · {phaseLabel(p.phase)}</span></span>
                <span className={["montada", "postventa"].includes(p.phase) ? "font-medium text-bad" : ""}>{eur(p.pending)}</span>
              </Link>
            </li>
          ))}
          {pending.length === 0 && <Empty>Todas las cocinas con importe están cobradas.</Empty>}
        </Box>
      </div>
    </div>
  );
}
