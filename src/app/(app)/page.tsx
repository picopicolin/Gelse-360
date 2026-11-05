import Link from "next/link";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";
import { addDays, loadMontajes, loadPendingPayments, type Montaje, today } from "@/lib/logistica";
import { KITCHEN_ZONES } from "@/lib/naves";
import { PHASES, phaseLabel } from "@/lib/phases";
import { fmtQty, stockLevel } from "@/lib/stock";

export const metadata = { title: "Panel" };

// Panel de dirección: lo importante de hoy, la semana y el mes, de un vistazo.

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Tramos del recorrido de una cocina: qué fases van en cada uno.
const STAGES = [
  { label: "Con interiorista", keys: ["contacto", "medicion", "diseno"] },
  { label: "En fábrica", keys: ["aceptada", "frentes", "fabrica"] },
  { label: "Para montar", keys: ["lista", "montaje"] },
  { label: "Acabadas", keys: ["montada", "postventa"] },
] as const;

/** Cifra grande de cabecera. */
function Stat({ label, value, sub, href, alert }: { label: string; value: string; sub: string; href: string; alert?: boolean }) {
  return (
    <Link href={href} className="card group flex flex-col justify-between p-4 transition hover:border-ink sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-semibold tracking-tight tabular-nums ${value.length > 8 ? "text-2xl" : "text-3xl"}`}>{value}</p>
      <p className={`mt-1 text-xs ${alert ? "font-medium text-bad" : "text-muted"}`}>{alert && "● "}{sub}</p>
    </Link>
  );
}

function Section({ title, action, href, children, className = "" }: { title: string; action?: string; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action && href && <Link href={href} className="text-sm text-muted hover:text-ink hover:underline">{action} →</Link>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-2 text-sm text-muted">{children}</p>;

/** Recorrido: una barra por fase, agrupadas por tramo. Una sola tinta (madera): lo que importa es cuántas hay. */
function Pipeline({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((s) => {
        const total = s.keys.reduce((a, k) => a + (counts[k] ?? 0), 0);
        return (
          <div key={s.label}>
            <div className="mb-2 flex items-baseline justify-between border-b border-line pb-1.5">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-sm tabular-nums text-muted">{total}</p>
            </div>
            <ul className="space-y-1.5">
              {s.keys.map((k) => {
                const n = counts[k] ?? 0;
                return (
                  <li key={k}>
                    <Link href={`/cocinas?fase=${k}`} className="group grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-2 rounded-lg py-0.5 text-sm hover:bg-paper">
                      <span className="truncate text-muted group-hover:text-ink">{phaseLabel(k)}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-paper">
                        <span className="block h-full rounded-full bg-wood transition-all group-hover:bg-ink" style={{ width: n ? `${Math.max(6, (n / max) * 100)}%` : 0 }} />
                      </span>
                      <span className="text-right tabular-nums">{n}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Cobrado por mes (últimos 6). Barras finas con la cifra al pasar el dedo o el ratón; la del mes en curso, más oscura. */
function CashChart({ months }: { months: { key: string; label: string; total: number; current: boolean }[] }) {
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <div>
      <div className="relative flex h-40 items-end gap-2 border-b border-line sm:gap-3">
        {/* Línea guía a la mitad */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        {months.map((m) => (
          <div key={m.key} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
            <div className={`w-full max-w-10 rounded-t-[4px] ${m.current ? "bg-ink" : "bg-wood/70"} group-hover:bg-ink group-focus:bg-ink`}
              style={{ height: m.total ? `${Math.max(3, (m.total / max) * 100)}%` : "2px" }} />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block">
              {m.label}: {eur(m.total)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-3">
        {months.map((m) => <p key={m.key} className={`flex-1 text-center text-xs ${m.current ? "font-medium" : "text-muted"}`}>{m.label}</p>)}
      </div>
    </div>
  );
}

/** Agenda de montajes de las próximas 2 semanas: un cuadro por día, con las cocinas que se montan. */
function Agenda({ days, byDay }: { days: string[]; byDay: Record<string, Montaje[]> }) {
  const t = today();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {days.map((d) => {
        const date = new Date(`${d}T12:00:00Z`);
        const wd = date.getUTCDay();
        const items = byDay[d] ?? [];
        const weekend = wd === 0 || wd === 6;
        return (
          <div key={d} className={`min-h-24 rounded-xl border p-2 ${d === t ? "border-ink bg-white" : weekend ? "border-transparent bg-paper/60" : "border-line bg-paper/40"}`}>
            <p className={`text-xs ${d === t ? "font-semibold" : "text-muted"}`}>
              <span className="capitalize">{WEEKDAYS[wd]}</span> {date.getUTCDate()}{d === t && " · hoy"}
            </p>
            <ul className="mt-1.5 space-y-1">
              {items.map((m) => (
                <li key={m.id}>
                  <Link href={`/cocinas/${m.id}`} className={`block rounded-lg px-1.5 py-1 text-xs leading-tight hover:ring-1 hover:ring-ink ${m.missing.length ? "bg-warn/15" : "bg-ok/15"}`}>
                    <span className="block truncate font-medium">{m.title}</span>
                    <span className="block truncate text-muted">{m.installer ?? "sin montador"}</span>
                    {m.missing.length > 0 && <span className="block truncate text-warn">falta {m.missing[0]}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default async function Panel() {
  const user = await requireDireccion();
  const t = today();
  const week = addDays(t, 7);
  const since = `${t.slice(0, 7)}-01`;
  const sixAgo = (() => { const d = new Date(`${since}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 5); return d.toISOString().slice(0, 10); })();

  const [montajes, pending, low, [{ lowTotal }], phases, cash, zones, [{ newThisMonth }]] = await Promise.all([
    loadMontajes(),
    loadPendingPayments(),
    sql`select id, name, unit, qty, min_qty from stock_items
        where active and (qty < min_qty or qty <= 0) order by (qty <= 0) desc, qty / nullif(min_qty, 0) nulls first limit 5`,
    sql`select count(*)::int as "lowTotal" from stock_items where active and (qty < min_qty or qty <= 0)`,
    sql`select phase, count(*)::int as n from kitchens where phase not in ('cobrada', 'descartada') group by phase`,
    sql`select to_char(date, 'YYYY-MM') as m, sum(amount)::float as total from payments
        where deleted_at is null and date >= ${sixAgo} group by 1`,
    sql`select factory_zone as zone, count(*)::int as n from kitchens where phase = 'fabrica' and factory_zone is not null group by 1`,
    sql`select count(*)::int as "newThisMonth" from kitchens where created_at >= ${since}`,
  ]);

  // Retrasadas: la fecha ya pasó. En riesgo: se montan esta semana y aún les falta algo.
  const late = montajes.filter((m) => m.late);
  const risk = montajes.filter((m) => !m.late && m.install_date && m.install_date <= week && m.missing.length > 0);
  const next = montajes.filter((m) => m.install_date && m.install_date >= t && m.install_date <= week);
  const pendingTotal = pending.reduce((s, p) => s + Number(p.pending), 0);
  const overdue = pending.filter((p) => ["montada", "postventa"].includes(p.phase));
  const counts: Record<string, number> = Object.fromEntries(phases.map((p) => [p.phase, p.n]));
  const sum = (keys: readonly string[]) => keys.reduce((a, k) => a + (counts[k] ?? 0), 0);
  const active = PHASES.reduce((a, p) => a + (counts[p.key] ?? 0), 0);

  const cashBy = Object.fromEntries(cash.map((c) => [c.m, Number(c.total)]));
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${sixAgo}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i);
    const key = d.toISOString().slice(0, 7);
    return { key, label: MONTHS[d.getUTCMonth()], total: cashBy[key] ?? 0, current: key === t.slice(0, 7) };
  });
  const thisMonth = months[5].total, lastMonth = months[4].total;

  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i));
  const byDay: Record<string, Montaje[]> = {};
  for (const m of montajes) {
    if (!m.install_date) continue;
    // Un montaje de varios días sale en cada uno de sus días.
    for (let i = 0; i < Math.max(1, m.install_days); i++) (byDay[addDays(m.install_date, i)] ??= []).push(m);
  }
  const zoneCount: Record<string, number> = Object.fromEntries(zones.map((z) => [z.zone, z.n]));
  const zoneMax = Math.max(1, ...zones.map((z) => z.n));
  const alerts = [...late, ...risk];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Hola, {user.name.split(" ")[0]}</h1>
          <p className="text-muted first-letter:uppercase">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cocinas/nueva" className="btn">+ Nueva cocina</Link>
          <Link href="/fabrica" className="btn-light">Fábrica</Link>
          <Link href="/naves" className="btn-light">Naves 3D</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cocinas en marcha" value={String(active)} href="/cocinas" sub={newThisMonth ? `${newThisMonth} nuevas este mes` : "Ninguna nueva este mes"} />
        <Stat label="En fábrica" value={String(sum(STAGES[1].keys))} href="/fabrica" sub={`${counts.fabrica ?? 0} fabricándose ahora`} />
        <Stat label="Montajes en 7 días" value={String(next.length)} href="/montajes"
          sub={late.length ? `${late.length} ${late.length === 1 ? "retrasado" : "retrasados"}` : risk.length ? `${risk.length} con algo pendiente` : "Todo en plazo"} alert={late.length > 0} />
        <Stat label="Pendiente de cobro" value={eur(pendingTotal)} href="/cocinas"
          sub={overdue.length ? `${overdue.length} ya ${overdue.length === 1 ? "montada" : "montadas"} sin cobrar` : `${pending.length} ${pending.length === 1 ? "cocina" : "cocinas"}`} alert={overdue.length > 0} />
      </div>

      <Section title="Recorrido de las cocinas" action="Ver todas" href="/cocinas">
        <Pipeline counts={counts} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Cobrado por mes" className="lg:col-span-1">
          <div className="mb-3 flex items-baseline gap-2">
            <p className="text-2xl font-semibold tabular-nums">{eur(thisMonth)}</p>
            <p className="text-sm text-muted">este mes{lastMonth ? ` · ${eur(lastMonth)} el anterior` : ""}</p>
          </div>
          <CashChart months={months} />
        </Section>

        <Section title="Necesita atención" action="Montajes" href="/montajes" className="lg:col-span-2">
          {alerts.length === 0 && overdue.length === 0 && low.length === 0 && <Empty>Todo en orden: nada retrasado, nada sin cobrar y stock por encima del mínimo.</Empty>}
          <ul className="divide-y divide-line">
            {alerts.slice(0, 4).map((m) => (
              <li key={`m${m.id}`}>
                <Link href={`/cocinas/${m.id}`} className="flex items-start gap-3 py-2.5 hover:bg-paper">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${m.late ? "bg-bad/10 text-bad" : "bg-warn/15 text-warn"}`}>{m.late ? "Retrasada" : "En riesgo"}</span>
                  <span className="flex-1 text-sm">{m.title} <span className="text-muted">· {m.client}</span>
                    <span className="block text-xs text-muted">{m.late ? `Montaje el ${dmy(m.install_date)}, sin montar` : `Montaje el ${dmy(m.install_date)} · falta ${m.missing.join(", ")}`}</span>
                  </span>
                </Link>
              </li>
            ))}
            {overdue.slice(0, 3).map((p) => (
              <li key={`p${p.id}`}>
                <Link href={`/cocinas/${p.id}#cobros`} className="flex items-start gap-3 py-2.5 hover:bg-paper">
                  <span className="mt-0.5 rounded-full bg-bad/10 px-2 py-0.5 text-xs font-medium text-bad">Sin cobrar</span>
                  <span className="flex-1 text-sm">{p.title} <span className="text-muted">· {p.client} · {phaseLabel(p.phase)}</span></span>
                  <span className="text-sm font-medium tabular-nums">{eur(Number(p.pending))}</span>
                </Link>
              </li>
            ))}
            {low.map((s) => (
              <li key={`s${s.id}`}>
                <Link href={`/stock/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-paper">
                  <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">{Number(s.qty) <= 0 ? "Agotado" : "Stock bajo"}</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stockLevel(s.qty, s.min_qty).dot}`} />
                  <span className="flex-1 truncate text-sm">{s.name}</span>
                  <span className="text-sm tabular-nums text-muted">{fmtQty(s.qty)} / {fmtQty(s.min_qty)} {s.unit}</span>
                </Link>
              </li>
            ))}
          </ul>
          {lowTotal > low.length && <Link href="/stock?ver=bajos" className="mt-2 block text-sm text-muted hover:underline">Y {lowTotal - low.length} materiales más con stock bajo →</Link>}
        </Section>
      </div>

      <Section title="Montajes de las próximas 2 semanas" action="Calendario" href="/montajes">
        <Agenda days={days} byDay={byDay} />
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-ok/30" /> Listo para salir</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-warn/30" /> Le falta algo</span>
        </p>
      </Section>

      <Section title="Fábrica ahora, por zonas" action="Ver en 3D" href="/naves">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {KITCHEN_ZONES.map((z) => {
            const n = zoneCount[z.key] ?? 0;
            return (
              <li key={z.key} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-sm">
                <span className="truncate">{z.label}</span>
                <span className="tabular-nums text-muted">{n}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-paper">
                  <span className="block h-full rounded-full bg-wood" style={{ width: n ? `${(n / zoneMax) * 100}%` : 0 }} />
                </span>
              </li>
            );
          })}
        </ul>
        {(counts.fabrica ?? 0) > zones.reduce((a, z) => a + z.n, 0) && (
          <p className="mt-3 text-xs text-muted">{(counts.fabrica ?? 0) - zones.reduce((a, z) => a + z.n, 0)} en fábrica sin zona asignada.</p>
        )}
      </Section>
    </div>
  );
}
