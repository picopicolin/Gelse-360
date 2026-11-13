import Link from "next/link";
import PhaseBadge from "@/components/PhaseBadge";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy } from "@/lib/form";
import { addDays, loadMontajes, type Montaje, today } from "@/lib/logistica";
import { saveInstaller, scheduleKitchen, toggleInstaller } from "./actions";

export const metadata = { title: "Montajes" };

// Montajes: cifras, un planning de dos semanas por montador (barras por cocina, choques en rojo)
// y una tarjeta por cocina con lo que le falta para salir, para llamar, ir y cambiar fecha o montador.

type Search = { quien?: string; semana?: string; error?: string };

const DAYS = 14;
const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
/** Lunes de la semana de una fecha. */
const monday = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7));
const diff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
const endOf = (m: Montaje) => addDays(m.install_date!, Math.max(1, m.install_days) - 1);
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const mapsUrl = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

/** Días hasta el montaje, con color: rojo ≤ 3 días o pasado, ámbar ≤ 7. */
function Countdown({ m }: { m: Montaje }) {
  if (!m.install_date) return <span className="rounded-full bg-paper px-2.5 py-1 text-sm text-muted">Sin fecha</span>;
  const d = diff(m.install_date, today()), end = diff(endOf(m), today());
  const text = m.late ? `debía acabar hace ${-end} d` : d <= 0 ? (end > 0 ? `montando · ${end + 1} d más` : "se monta hoy") : d === 1 ? "mañana" : `en ${d} días`;
  const tone = m.late || d <= 3 ? "bg-bad/10 text-bad" : d <= 7 ? "bg-warn/15 text-warn" : "bg-paper text-muted";
  return <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${tone}`} title={dmy(m.install_date)}>{text}</span>;
}

/** Lo que tiene que estar para salir de fábrica, como casillas. */
function Checklist({ m }: { m: Montaje }) {
  const out = ["lista", "montaje"].includes(m.phase);
  const pct = m.total ? m.done / m.total : 0;
  const Item = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${ok ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}>
      <span aria-hidden>{ok ? "✓" : "•"}</span>{children}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {out ? <Item ok>Ha salido de fábrica</Item> : (
        <>
          <span className="inline-flex items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-sm">
            Muebles
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
              <span className={`block h-full rounded-full ${pct >= 1 ? "bg-ok" : "bg-wood"}`} style={{ width: `${pct * 100}%` }} />
            </span>
            <span className="tabular-nums text-muted">{m.total ? `${m.done}/${m.total}` : "sin hoja"}</span>
          </span>
          <Item ok={m.fronts}>Frentes</Item>
        </>
      )}
      <Item ok={!!m.installer_id}>{m.installer ?? "Montador"}</Item>
      <Item ok={!!m.install_date}>{m.install_date ? `${dmy(m.install_date)}${m.install_days > 1 ? ` · ${m.install_days} días` : ""}` : "Fecha"}</Item>
    </div>
  );
}

function Card({ m, installers, clash }: { m: Montaje; installers: { id: number; name: string }[]; clash: boolean }) {
  const ready = m.missing.length === 0;
  return (
    <div className={`card border-l-4 p-4 ${m.late ? "border-l-bad" : ready ? "border-l-ok" : "border-l-warn"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/cocinas/${m.id}`} className="text-lg font-medium hover:underline">{m.title}</Link>
          <p className="text-sm text-muted">{m.client}{m.address && ` · ${m.address}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clash && <span className="rounded-full bg-bad/10 px-2.5 py-1 text-sm font-medium text-bad" title="El montador tiene otra cocina esos días">Choca con otro montaje</span>}
          <Countdown m={m} />
          <PhaseBadge phase={m.phase} />
        </div>
      </div>

      <div className="mt-3"><Checklist m={m} /></div>

      <div className="mt-3 flex flex-wrap gap-2">
        {m.phone && <a href={`tel:${m.phone}`} className="btn-light py-2 text-sm">Llamar · {m.phone}</a>}
        {m.address && <a href={mapsUrl(m.address)} target="_blank" rel="noreferrer" className="btn-light py-2 text-sm">Cómo llegar</a>}
        <Link href={`/cocinas/${m.id}`} className="btn-light py-2 text-sm">Abrir la cocina</Link>
      </div>

      <form action={scheduleKitchen} className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_5.5rem_1fr_auto]">
        <input type="hidden" name="kitchen_id" value={m.id} />
        <label className="text-xs text-muted">Fecha de montaje
          <input name="install_date" type="date" defaultValue={m.install_date ?? ""} className="input mt-0.5 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-muted">Días
          <input name="install_days" type="number" min={1} max={30} defaultValue={m.install_days} className="input mt-0.5 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-muted">Montador
          <select name="installer_id" defaultValue={m.installer_id ?? ""} className="input mt-0.5 py-2 text-sm text-ink">
            <option value="">Sin montador</option>
            {installers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <button className="btn self-end py-2 text-sm">Guardar</button>
      </form>
    </div>
  );
}

/** Planning de dos semanas: una fila por montador, una barra por cocina que ocupa sus días. */
function Planning({ from, rows, clashes, week }: {
  from: string; week: number;
  rows: { key: string; name: string; items: Montaje[] }[];
  clashes: Set<string>;   // "montador|día" con más de una cocina
}) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));
  const t = today();
  // Fines de semana estrechos: casi nunca se monta, y así caben las dos semanas en la tablet.
  const cols = `7rem ${days.map((d) => (dow(d) % 6 === 0 ? "1.4rem" : "minmax(3.2rem, 1fr)")).join(" ")}`;
  const nav = (w: number) => (w ? `/montajes?semana=${w}` : "/montajes");
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="font-medium">Planning · {dmy(from)} – {dmy(addDays(from, DAYS - 1))}</p>
        <div className="flex gap-1.5">
          <Link href={nav(week - 1)} className="btn-light px-3 py-1.5 text-sm" aria-label="Semana anterior">←</Link>
          {week !== 0 && <Link href="/montajes" className="btn-light px-3 py-1.5 text-sm">Hoy</Link>}
          <Link href={nav(week + 1)} className="btn-light px-3 py-1.5 text-sm" aria-label="Semana siguiente">→</Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[42rem]">
          {/* Cabecera de días */}
          <div className="grid border-b border-line text-center text-xs" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((d) => (
              <div key={d} className={`py-1.5 ${d === t ? "bg-wood text-white" : dow(d) % 6 === 0 ? "bg-paper text-muted" : "text-muted"} ${dow(d) === 1 ? "border-l border-line" : ""}`}>
                <div className="capitalize">{new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "short", timeZone: "UTC" }).slice(0, dow(d) % 6 === 0 ? 1 : 2)}</div>
                <div className="font-semibold tabular-nums">{Number(d.slice(8))}</div>
              </div>
            ))}
          </div>
          {rows.map((r) => {
            // Carriles: si dos cocinas del mismo montador se pisan, la segunda baja un carril.
            const lanes: string[] = [];
            const placed = r.items.map((m) => {
              const s = Math.max(0, diff(m.install_date!, from)), e = Math.min(DAYS - 1, diff(endOf(m), from));
              let lane = lanes.findIndex((end) => end < m.install_date!);
              if (lane < 0) { lane = lanes.length; lanes.push(""); }
              lanes[lane] = endOf(m);
              return { m, s, e, lane, cutL: diff(m.install_date!, from) < 0, cutR: diff(endOf(m), from) > DAYS - 1 };
            });
            const n = Math.max(1, lanes.length);
            return (
              <div key={r.key} className="grid border-b border-line last:border-b-0" style={{ gridTemplateColumns: cols }}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm" style={{ gridColumn: 1, gridRow: `1 / span ${n}` }}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-semibold">{r.key ? initials(r.name) : "?"}</span>
                  <span className={`truncate ${r.key ? "" : "text-muted"}`}>{r.name}</span>
                </div>
                {/* Fondo de días (fines de semana, hoy y choques) */}
                {days.map((d, i) => (
                  <div key={d} style={{ gridColumn: i + 2, gridRow: `1 / span ${n}` }}
                    className={`min-h-11 ${clashes.has(`${r.key}|${d}`) ? "bg-bad/10" : d === t ? "bg-wood/10" : dow(d) % 6 === 0 ? "bg-paper" : ""} ${dow(d) === 1 ? "border-l border-line" : ""}`} />
                ))}
                {placed.map(({ m, s, e, lane, cutL, cutR }) => {
                  const tone = m.late ? "border-bad bg-bad/15 text-bad" : m.missing.length ? "border-warn bg-warn/15 text-ink" : "border-wood bg-wood/20 text-ink";
                  return (
                    <Link key={m.id} href={`/cocinas/${m.id}`}
                      title={`${m.title} · ${m.client}\n${dmy(m.install_date!)}${m.install_days > 1 ? ` – ${dmy(endOf(m))}` : ""}${m.missing.length ? `\nFalta: ${m.missing.join(", ")}` : "\nTodo listo"}`}
                      style={{ gridColumn: `${s + 2} / ${e + 3}`, gridRow: lane + 1 }}
                      className={`z-10 my-1 mx-0.5 line-clamp-2 overflow-hidden border-l-4 px-1.5 py-0.5 text-[11px] font-medium leading-tight hyphens-auto hover:brightness-95 ${tone} ${cutL ? "rounded-l-none" : "rounded-l-md"} ${cutR ? "rounded-r-none" : "rounded-r-md"}`}>
                      {cutL && "← "}{m.title}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-wood bg-wood/20" />Lista para salir</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-warn bg-warn/15" />Le falta algo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-bad bg-bad/15" />Retrasada</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-bad/10" />Mismo montador, dos cocinas</span>
      </div>
    </section>
  );
}

export default async function Montajes({ searchParams }: { searchParams: Promise<Search> }) {
  await requireDireccion();
  const { quien = "", semana = "0", error } = await searchParams;
  const week = Math.max(-52, Math.min(52, Number(semana) || 0));
  const [all, installersAll] = await Promise.all([
    loadMontajes(),
    sql`select i.id, i.name, i.phone, i.active,
               (select count(*)::int from kitchens k where k.installer_id = i.id and k.phase in ('aceptada', 'frentes', 'fabrica', 'lista', 'montaje')) as open
        from installers i order by i.active desc, i.name`,
  ]);
  const installers = installersAll.filter((i) => i.active).map((i) => ({ id: i.id as number, name: i.name as string }));
  const t = today();

  // Choques: el mismo montador con dos cocinas el mismo día.
  const perDay = new Map<string, number[]>();
  for (const m of all) {
    if (!m.install_date || !m.installer_id) continue;
    for (let d = m.install_date; d <= endOf(m); d = addDays(d, 1)) {
      const k = `${m.installer_id}|${d}`;
      perDay.set(k, [...(perDay.get(k) ?? []), m.id]);
    }
  }
  const clashes = new Set([...perDay].filter(([, ids]) => ids.length > 1).map(([k]) => k));
  const clashIds = new Set([...perDay].filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids));

  // Cifras
  const thisWeek = all.filter((m) => m.install_date && m.install_date <= addDays(monday(t), 6) && endOf(m) >= monday(t));
  const stats = [
    { label: "Esta semana", n: thisWeek.length, tone: "", sub: "montajes" },
    { label: "Listas para salir", n: all.filter((m) => m.missing.length === 0 && !m.late).length, tone: "text-ok", sub: `de ${all.length}` },
    { label: "Sin fecha o montador", n: all.filter((m) => !m.install_date || !m.installer_id).length, tone: "text-warn", sub: "por organizar" },
    { label: "Retrasadas", n: all.filter((m) => m.late).length, tone: "text-bad", sub: clashIds.size ? `${clashIds.size} cocinas chocan` : "sin choques" },
  ];

  // Planning: una fila por montador activo (o el elegido), y «Sin montador» si hace falta.
  const from = addDays(monday(t), week * 7), to = addDays(from, DAYS - 1);
  const inRange = all.filter((m) => m.install_date && m.install_date <= to && endOf(m) >= from);
  const rows = [
    ...installers.filter((i) => !quien || String(i.id) === quien)
      .map((i) => ({ key: String(i.id), name: i.name, items: inRange.filter((m) => m.installer_id === i.id) })),
    ...(!quien && inRange.some((m) => !m.installer_id) ? [{ key: "", name: "Sin montador", items: inRange.filter((m) => !m.installer_id) }] : []),
  ];

  const list = quien ? all.filter((m) => String(m.installer_id) === quien) : all;
  const late = list.filter((m) => m.late);
  const dated = list.filter((m) => m.install_date && !m.late);
  const undated = list.filter((m) => !m.install_date);

  // Próximos: agrupados por semana y día.
  const weeks = new Map<string, Map<string, Montaje[]>>();
  for (const m of dated) {
    const w = monday(m.install_date!);
    if (!weeks.has(w)) weeks.set(w, new Map());
    const days = weeks.get(w)!;
    days.set(m.install_date!, [...(days.get(m.install_date!) ?? []), m]);
  }
  const weekTitle = (w: string) => (w <= monday(t) ? "Esta semana" : w === addDays(monday(t), 7) ? "La semana que viene" : `Semana del ${dmy(w)}`);
  const card = (m: Montaje) => <Card key={m.id} m={m} installers={installers} clash={clashIds.has(m.id)} />;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Montajes</h1>
          <p className="text-muted">Cuándo se monta cada cocina, quién la monta y qué le falta para salir de fábrica</p>
        </div>
        <a href="#montadores" className="btn-light">Montadores</a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-3xl font-semibold tabular-nums ${s.tone}`}>{s.n}</p>
            <p className="text-sm">{s.label}</p>
            <p className="text-xs text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quién: cada montador con cuántas cocinas tiene por montar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 0, name: "" }, ...installers].map((i) => {
          const on = quien === (i.id ? String(i.id) : "");
          const n = i.id ? all.filter((m) => m.installer_id === i.id).length : all.length;
          return (
            <Link key={i.id || "todos"} href={i.id ? `/montajes?quien=${i.id}${week ? `&semana=${week}` : ""}` : week ? `/montajes?semana=${week}` : "/montajes"}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pl-2 pr-4 ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${on ? "bg-white/20" : "bg-paper"}`}>{i.id ? initials(i.name) : "★"}</span>
              <span>{i.name || "Todos"}</span>
              <span className={`rounded-full px-2 text-sm tabular-nums ${on ? "bg-white/20" : "bg-paper text-muted"}`}>{n}</span>
            </Link>
          );
        })}
      </div>

      {rows.length > 0 && <Planning from={from} rows={rows} clashes={clashes} week={week} />}

      {late.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-bad">Retrasadas · {late.length}</h2>
          <p className="-mt-2 text-sm text-muted">La fecha de montaje ya ha pasado y no están montadas. Pon una fecha nueva o pásalas a «Montada».</p>
          {late.map(card)}
        </section>
      )}

      {[...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, days]) => (
        <section key={w} className="space-y-3">
          <h2 className="text-lg font-semibold">{weekTitle(w)}</h2>
          {[...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, ms]) => (
            <div key={d} className="space-y-2">
              <p className={`text-sm font-medium first-letter:uppercase ${d === t ? "text-wood" : "text-muted"}`}>{d === t ? "Hoy, " : ""}{weekday(d)}</p>
              {ms.map(card)}
            </div>
          ))}
        </section>
      ))}

      {undated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sin fecha de montaje · {undated.length}</h2>
          {undated.map(card)}
        </section>
      )}

      {list.length === 0 && <div className="card p-6 text-muted">No hay montajes pendientes{quien ? " para este montador" : ""}.</div>}

      <section id="montadores" className="card space-y-3 p-5">
        <p className="font-medium">Montadores</p>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Falta el nombre del montador.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {installersAll.map((i) => (
            <li key={i.id} className={`flex items-center gap-3 rounded-xl border border-line p-3 ${i.active ? "" : "opacity-60"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-semibold">{initials(i.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.name}{!i.active && <span className="ml-1 text-xs text-muted">(desactivado)</span>}</span>
                <span className="block text-sm text-muted">
                  {i.phone && <><a href={`tel:${i.phone}`} className="underline">{i.phone}</a> · </>}
                  {i.open} {i.open === 1 ? "cocina" : "cocinas"} por montar
                </span>
              </span>
              <form action={toggleInstaller}>
                <input type="hidden" name="id" value={i.id} />
                <button className="text-sm text-muted underline hover:text-ink">{i.active ? "Desactivar" : "Reactivar"}</button>
              </form>
            </li>
          ))}
          {installersAll.length === 0 && <li className="py-2 text-muted">Aún no hay montadores. Son autónomos con su furgoneta: apunta aquí su nombre y teléfono.</li>}
        </ul>
        <form action={saveInstaller} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Nombre" className="input max-w-56" required />
          <input name="phone" placeholder="Teléfono" type="tel" className="input max-w-44" />
          <button className="btn">+ Añadir montador</button>
        </form>
      </section>
    </div>
  );
}
