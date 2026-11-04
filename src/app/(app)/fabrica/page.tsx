import Link from "next/link";
import AssignSelect from "@/components/AssignSelect";
import { setFactoryZone, setItemStatus } from "@/app/(app)/cocinas/hoja-actions";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy } from "@/lib/form";
import { KITCHEN_ZONES } from "@/lib/naves";
import { isLacado, sizeLabel, STATUS, type ItemStatus } from "@/lib/sheet";
import { isImage } from "@/lib/storage";

export const metadata = { title: "Fábrica" };

// Pantalla de Sergio y los operarios, pensada para la tablet: cocinas en fábrica, lo lacado primero,
// y cada mueble con botones grandes para marcarlo y un desplegable para dárselo a alguien.
export default async function Fabrica({ searchParams }: { searchParams: Promise<{ quien?: string }> }) {
  const user = await requireUser();
  const { quien = "" } = await searchParams;
  const [kitchens, items, people, plans] = await Promise.all([
    sql`select k.id, k.title, k.ref, k.phase, k.install_date::text, k.fronts_received, k.factory_zone, c.name as client,
               exists (select 1 from kitchen_zones z where z.kitchen_id = k.id and z.finish ~* 'lac') as lacado
        from kitchens k join clients c on c.id = k.client_id
        where k.phase in ('aceptada', 'frentes', 'fabrica')
          and (k.phase = 'fabrica' or exists (select 1 from kitchen_items i where i.kitchen_id = k.id))
        order by lacado desc, k.install_date nulls last, k.id`,
    sql`select i.id, i.kitchen_id, i.kind, i.name, i.width, i.height, i.depth, i.custom, i.qty, i.notes, i.status, i.assigned_to,
               z.name as zone, z.finish
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
  const visible = (i: (typeof items)[number]) => !quien || i.assigned_to === quien;
  const pending = items.filter((i) => i.status !== "hecho");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Fábrica</h1>
        <p className="text-muted">{pending.length} cosas por hacer en {kitchens.length} cocinas · lo lacado va primero</p>
      </div>

      {names.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["", ...names].map((n) => (
            <Link key={n || "todos"} href={n ? { query: { quien: n } } : "/fabrica"}
              className={`shrink-0 rounded-xl border px-4 py-2.5 ${quien === n ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
              {n || "Todos"}
            </Link>
          ))}
        </div>
      )}

      {kitchens.length === 0 && (
        <div className="card p-6 text-muted">
          No hay cocinas en fábrica. Aparecen aquí las que están en fábrica, y las aceptadas o esperando frentes que ya tienen hoja.
        </div>
      )}

      {kitchens.map((k) => {
        const own = items.filter((i) => i.kitchen_id === k.id);
        const shown = own.filter(visible);
        if (quien && shown.length === 0) return null;
        const left = own.filter((i) => i.status !== "hecho").length;
        return (
          <section key={k.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white p-4">
              <div>
                <p className="text-lg font-semibold">{k.title}</p>
                <p className="text-sm text-muted">{k.client}{k.ref ? ` · ${k.ref}` : ""}{k.install_date ? ` · montaje ${dmy(k.install_date)}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {k.lacado && <span className="rounded-full bg-wood/15 px-2.5 py-1 font-medium text-wood">Lacado</span>}
                <span className={`rounded-full px-2.5 py-1 ${k.fronts_received ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
                  {k.fronts_received ? "Frentes recibidos" : "Frentes sin llegar"}
                </span>
                {own.length > 0 && <span className={`rounded-full px-2.5 py-1 ${left ? "bg-line" : "bg-ok/15 text-ok"}`}>{left ? `Faltan ${left}` : "Todo hecho"}</span>}
              </div>
            </header>
            {/* Dónde está la cocina en la nave ahora: se ve en el 3D. */}
            <form action={setFactoryZone} className="flex gap-1.5 overflow-x-auto border-b border-line p-3">
              <input type="hidden" name="kitchen_id" value={k.id} />
              <span className="self-center pr-1 text-sm text-muted">Está en:</span>
              {KITCHEN_ZONES.map((z) => (
                <button key={z.key} name="zone" value={k.factory_zone === z.key ? "" : z.key}
                  className={`shrink-0 rounded-xl px-3 py-2.5 text-sm ${k.factory_zone === z.key ? "bg-wood text-white" : "border border-line bg-white text-muted"}`}>
                  {z.label}
                </button>
              ))}
            </form>
            {plans.some((p) => p.kitchen_id === k.id) && (
              <div className="flex gap-2 overflow-x-auto border-b border-line bg-paper p-3">
                {plans.filter((p) => p.kitchen_id === k.id).map((p) => (
                  <a key={p.id} href={`/api/archivos/${p.id}`} target="_blank" rel="noreferrer"
                    className="shrink-0 overflow-hidden rounded-lg border border-line bg-white" title={p.name}>
                    {isImage(p.mime)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={`/api/archivos/${p.id}`} alt={p.name} loading="lazy" className="h-20 w-28 object-cover" />
                      : <span className="flex h-20 w-28 items-center justify-center font-semibold text-muted">PDF</span>}
                  </a>
                ))}
              </div>
            )}
            {own.length === 0 && <p className="p-4 text-sm text-muted">Sin hoja de fábrica todavía.</p>}
            <ul className="divide-y divide-line">
              {shown.map((i) => (
                <li key={i.id} className={`grid gap-3 p-4 md:grid-cols-[1fr_auto_12rem] md:items-center ${i.status === "hecho" ? "bg-ok/5" : ""}`}>
                  <div>
                    <p className="text-base font-medium">
                      {i.qty > 1 && <span className="mr-1">{i.qty} ×</span>}{i.name}
                      {i.custom && <span className="ml-2 rounded bg-wood/15 px-1.5 py-0.5 text-xs text-wood">a medida</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {[sizeLabel(i.width, i.height, i.depth), i.zone, i.finish].filter(Boolean).join(" · ")}
                      {isLacado(i.finish) && " ★"}
                    </p>
                    {i.notes && <p className="text-sm">{i.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    {(Object.keys(STATUS) as ItemStatus[]).map((s) => (
                      <form key={s} action={setItemStatus}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className={`min-w-24 rounded-xl px-3 py-3 text-sm font-medium ${i.status === s
                          ? s === "hecho" ? "bg-ok text-white" : s === "en_curso" ? "bg-warn text-white" : "bg-ink text-white"
                          : "border border-line bg-white text-muted"}`}>
                          {STATUS[s].label}
                        </button>
                      </form>
                    ))}
                  </div>
                  <AssignSelect id={i.id} value={i.assigned_to} people={names} />
                </li>
              ))}
            </ul>
            {user.role === "direccion" && (
              <footer className="border-t border-line p-3 text-right text-sm">
                <Link href={`/cocinas/${k.id}`} className="text-muted underline">Abrir la cocina</Link>
              </footer>
            )}
          </section>
        );
      })}
    </div>
  );
}
