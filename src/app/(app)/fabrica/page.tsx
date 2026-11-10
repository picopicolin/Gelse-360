import Link from "next/link";
import AssignSelect from "@/components/AssignSelect";
import { setFactoryZone, setItemStatus } from "@/app/(app)/cocinas/hoja-actions";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy } from "@/lib/form";
import { today } from "@/lib/logistica";
import { KITCHEN_ZONES, zoneLabel } from "@/lib/naves";
import { isLacado, sizeLabel, STATUS, type ItemStatus } from "@/lib/sheet";
import { isImage } from "@/lib/storage";

export const metadata = { title: "Fábrica" };

// Pantalla de Sergio y los operarios, pensada para la tablet: cifras del día arriba, filtros por persona y por zona,
// y una tarjeta por cocina (lo lacado primero) con su avance, dónde está en la nave y cada mueble con botones grandes.
// Lo ya hecho se pliega al final de cada cocina para que no estorbe.

type Search = { quien?: string; zona?: string };

/** Días que faltan para el montaje, con color: rojo si es esta semana o ya ha pasado. */
function Countdown({ date }: { date: string }) {
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today()}T12:00:00Z`)) / 86400000);
  const text = days < 0 ? `montaje hace ${-days} d` : days === 0 ? "se monta hoy" : days === 1 ? "se monta mañana" : `montaje en ${days} días`;
  const tone = days <= 3 ? "bg-bad/10 text-bad" : days <= 7 ? "bg-warn/15 text-warn" : "bg-paper text-muted";
  return <span className={`rounded-full px-2.5 py-1 font-medium ${tone}`} title={dmy(date)}>{text}</span>;
}

export default async function Fabrica({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const { quien = "", zona = "" } = await searchParams;
  const t = today();
  const [kitchens, items, people, plans] = await Promise.all([
    sql`select k.id, k.title, k.ref, k.phase, k.install_date::text, k.fronts_received, k.factory_zone, c.name as client,
               exists (select 1 from kitchen_zones z where z.kitchen_id = k.id and z.finish ~* 'lac') as lacado
        from kitchens k join clients c on c.id = k.client_id
        where k.phase in ('aceptada', 'frentes', 'fabrica')
          and (k.phase = 'fabrica' or exists (select 1 from kitchen_items i where i.kitchen_id = k.id))
        order by lacado desc, k.install_date nulls last, k.id`,
    sql`select i.id, i.kitchen_id, i.kind, i.name, i.width, i.height, i.depth, i.custom, i.qty, i.notes, i.status, i.assigned_to,
               (i.done_at at time zone 'Europe/Madrid')::date::text as done_day, z.name as zone, z.finish
        from kitchen_items i join kitchen_zones z on z.id = i.zone_id
        join kitchens k on k.id = i.kitchen_id
        where k.phase in ('aceptada', 'frentes', 'fabrica')
        order by z.sort, z.id, i.kind, i.sort, i.id`,
    sql`select name from users where role = 'fabrica' and active
        union select distinct assigned_to from kitchen_items where assigned_to is not null order by 1`,
    // Los planos de cada cocina, para abrirlos desde la tablet.
    sql`select f.id, f.kitchen_id, f.name, f.mime from kitchen_files f join kitchens k on k.id = f.kitchen_id
        where f.deleted_at is null and f.kind = 'plano' and k.phase in ('aceptada', 'frentes', 'fabrica') order by f.created_at`,
  ]);
  const names = people.map((p) => p.name as string);
  const open = items.filter((i) => i.status !== "hecho");
  const doing = items.filter((i) => i.status === "en_curso");
  const doneToday = items.filter((i) => i.status === "hecho" && i.done_day === t);
  const mine = (n: string) => open.filter((i) => i.assigned_to === n).length;
  const inZone = (z: string) => kitchens.filter((k) => k.factory_zone === z).length;
  const link = (q: Search) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
    return p ? `/fabrica?${p}` : "/fabrica";
  };

  const shownKitchens = kitchens.filter((k) => !zona || k.factory_zone === zona);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Fábrica</h1>
          <p className="text-muted">Lo lacado va primero, luego por fecha de montaje</p>
        </div>
        <Link href="/naves" className="btn-light">Ver en 3D</Link>
      </div>

      {/* Cifras del día, grandes para leerlas de lejos */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Cocinas en fábrica", kitchens.length, ""],
          ["Por hacer", open.length, ""],
          ["En curso ahora", doing.length, "text-warn"],
          ["Hechos hoy", doneToday.length, "text-ok"],
        ].map(([label, n, tone]) => (
          <div key={label as string} className="card p-4">
            <p className={`text-3xl font-semibold tabular-nums ${tone}`}>{n}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Quién: cada uno ve lo suyo, con cuántas cosas tiene pendientes */}
      {names.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["", ...names].map((n) => {
            const on = quien === n;
            return (
              <Link key={n || "todos"} href={link({ quien: n, zona })}
                className={`flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pl-2 pr-4 text-base ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${on ? "bg-white/20" : "bg-paper"}`}>
                  {n ? n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "★"}
                </span>
                <span>{n || "Todos"}</span>
                <span className={`rounded-full px-2 text-sm tabular-nums ${on ? "bg-white/20" : "bg-paper text-muted"}`}>{n ? mine(n) : open.length}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dónde: filtro por zona de la nave */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ key: "", label: "Todas las zonas" }, ...KITCHEN_ZONES].map((z) => {
          const on = zona === z.key, n = z.key ? inZone(z.key) : kitchens.length;
          return (
            <Link key={z.key || "todas"} href={link({ quien, zona: z.key })}
              className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm ${on ? "bg-wood text-white" : n ? "border border-line bg-white" : "border border-line bg-white text-muted"}`}>
              {z.label} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>

      {shownKitchens.length === 0 && (
        <div className="card p-6 text-muted">
          {zona ? `Ninguna cocina en «${zoneLabel(zona)}» ahora mismo.` : "No hay cocinas en fábrica. Aparecen aquí las que están en fábrica, y las aceptadas o esperando frentes que ya tienen hoja."}
        </div>
      )}

      {shownKitchens.map((k) => {
        const own = items.filter((i) => i.kitchen_id === k.id);
        const mineHere = own.filter((i) => !quien || i.assigned_to === quien);
        if (quien && mineHere.length === 0) return null;
        const doneN = own.filter((i) => i.status === "hecho").length;
        const pct = own.length ? Math.round((doneN / own.length) * 100) : 0;
        const todo = mineHere.filter((i) => i.status !== "hecho");
        const finished = mineHere.filter((i) => i.status === "hecho");
        const kPlans = plans.filter((p) => p.kitchen_id === k.id);

        const Row = ({ i }: { i: (typeof items)[number] }) => (
          <li className={`grid gap-3 p-4 xl:grid-cols-[1fr_auto] xl:items-center ${i.status === "en_curso" ? "border-l-4 border-l-warn bg-warn/5" : i.status === "hecho" ? "bg-ok/5" : ""}`}>
            <div className="min-w-0">
              <p className="text-base font-medium">
                {i.qty > 1 && <span className="mr-1 tabular-nums">{i.qty} ×</span>}{i.name}
                {i.custom && <span className="ml-2 rounded bg-wood/15 px-1.5 py-0.5 text-xs text-wood">a medida</span>}
                {isLacado(i.finish) && <span className="ml-2 rounded bg-wood/15 px-1.5 py-0.5 text-xs text-wood">lacado</span>}
              </p>
              <p className="text-sm text-muted">{[sizeLabel(i.width, i.height, i.depth), i.zone, i.finish].filter(Boolean).join(" · ")}</p>
              {i.notes && <p className="mt-1 rounded-lg bg-paper px-2 py-1 text-sm">{i.notes}</p>}
            </div>
            {/* Estado (tres botones grandes para el dedo) y operario, en una fila */}
            <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 rounded-2xl border border-line bg-paper p-1">
              {(Object.keys(STATUS) as ItemStatus[]).map((s) => (
                <form key={s} action={setItemStatus} className="flex-1">
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="status" value={s} />
                  <button className={`w-full min-w-24 rounded-xl px-3 py-3 text-sm font-medium transition ${i.status === s
                    ? s === "hecho" ? "bg-ok text-white shadow-sm" : s === "en_curso" ? "bg-warn text-white shadow-sm" : "bg-ink text-white shadow-sm"
                    : "text-muted hover:bg-white hover:text-ink"}`}>
                    {s === "hecho" && i.status === s ? "✓ " : ""}{STATUS[s].label}
                  </button>
                </form>
              ))}
            </div>
            <div className="w-44"><AssignSelect id={i.id} value={i.assigned_to} people={names} /></div>
            </div>
          </li>
        );

        return (
          <section key={k.id} className={`card overflow-hidden ${k.lacado ? "border-l-4 border-l-wood" : ""}`}>
            <header className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xl font-semibold">{k.title}</p>
                  <p className="text-sm text-muted">{k.client}{k.ref ? ` · ${k.ref}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {k.lacado && <span className="rounded-full bg-wood/15 px-2.5 py-1 font-medium text-wood">Lacado</span>}
                  <span className={`rounded-full px-2.5 py-1 ${k.fronts_received ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
                    {k.fronts_received ? "✓ Frentes" : "Frentes sin llegar"}
                  </span>
                  {k.install_date && <Countdown date={k.install_date} />}
                </div>
              </div>
              {/* Avance de la cocina */}
              {own.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper">
                    <div className={`h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-wood"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="shrink-0 text-sm tabular-nums"><b>{doneN}</b> de {own.length} hechos</p>
                </div>
              ) : <p className="text-sm text-muted">Sin hoja de fábrica todavía.</p>}
            </header>

            {/* Dónde está la cocina en la nave ahora: se ve en el 3D. */}
            <form action={setFactoryZone} className="flex gap-1.5 overflow-x-auto border-y border-line bg-paper/60 p-3">
              <input type="hidden" name="kitchen_id" value={k.id} />
              <span className="shrink-0 self-center whitespace-nowrap pr-1 text-sm text-muted">Está en:</span>
              {KITCHEN_ZONES.map((z) => (
                <button key={z.key} name="zone" value={k.factory_zone === z.key ? "" : z.key}
                  className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm ${k.factory_zone === z.key ? "bg-wood font-medium text-white" : "border border-line bg-white text-muted hover:text-ink"}`}>
                  {z.label}
                </button>
              ))}
            </form>

            {kPlans.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-b border-line p-3">
                {kPlans.map((p) => (
                  <a key={p.id} href={`/api/archivos/${p.id}`} target="_blank" rel="noreferrer"
                    className="shrink-0 overflow-hidden rounded-xl border border-line bg-white hover:border-ink" title={p.name}>
                    {isImage(p.mime)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={`/api/archivos/${p.id}`} alt={p.name} loading="lazy" className="h-24 w-32 object-cover" />
                      : <span className="flex h-24 w-32 flex-col items-center justify-center gap-1 text-muted"><b className="text-lg">PDF</b><span className="max-w-28 truncate text-xs">{p.name}</span></span>}
                  </a>
                ))}
              </div>
            )}

            <ul className="divide-y divide-line">
              {todo.map((i) => <Row key={i.id} i={i} />)}
            </ul>
            {todo.length === 0 && own.length > 0 && <p className="p-4 text-sm font-medium text-ok">✓ {quien ? `${quien} no tiene nada pendiente aquí.` : "Todos los muebles hechos."}</p>}
            {finished.length > 0 && (
              <details className="border-t border-line">
                <summary className="cursor-pointer select-none p-4 text-sm text-muted hover:text-ink">Ver los {finished.length} ya hechos</summary>
                <ul className="divide-y divide-line border-t border-line">
                  {finished.map((i) => <Row key={i.id} i={i} />)}
                </ul>
              </details>
            )}
            {user.role === "direccion" && (
              <footer className="border-t border-line p-3 text-right text-sm">
                <Link href={`/cocinas/${k.id}?ver=fabrica`} className="text-muted underline">Abrir la cocina</Link>
              </footer>
            )}
          </section>
        );
      })}
    </div>
  );
}
