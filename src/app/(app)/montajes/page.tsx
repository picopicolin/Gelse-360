import Link from "next/link";
import PhaseBadge from "@/components/PhaseBadge";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy } from "@/lib/form";
import { addDays, loadMontajes, type Montaje, today } from "@/lib/logistica";
import { saveInstaller, scheduleKitchen, toggleInstaller } from "./actions";

export const metadata = { title: "Montajes" };

const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
/** Lunes de la semana de una fecha. */
const monday = (iso: string) => addDays(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));

function Card({ m, installers }: { m: Montaje; installers: { id: number; name: string }[] }) {
  const ready = m.missing.length === 0;
  return (
    <div className={`card p-4 ${m.late ? "border-bad/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/cocinas/${m.id}`} className="font-medium hover:underline">{m.title}</Link>
          <p className="text-sm text-muted">
            {m.client}{m.phone && <> · <a href={`tel:${m.phone}`} className="underline">{m.phone}</a></>}{m.address && ` · ${m.address}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {m.late && <span className="rounded-full bg-bad/15 px-2.5 py-0.5 text-xs font-medium text-bad">Retrasada</span>}
          <PhaseBadge phase={m.phase} />
        </div>
      </div>
      {/* Qué falta para poder salir de fábrica. */}
      <p className="mt-2 text-sm">
        {ready
          ? <span className="text-ok">✓ Todo listo para salir</span>
          : <span className="text-warn">Falta: {m.missing.join(" · ")}</span>}
        {m.total > 0 && <span className="text-muted"> · {m.done}/{m.total} muebles · frentes {m.fronts ? "✓" : "✗"}</span>}
      </p>
      <form action={scheduleKitchen} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_1fr_auto]">
        <input type="hidden" name="kitchen_id" value={m.id} />
        <input name="install_date" type="date" defaultValue={m.install_date ?? ""} className="input py-2 text-sm" aria-label="Fecha de montaje" />
        <input name="install_days" type="number" min={1} max={30} defaultValue={m.install_days} className="input py-2 text-sm" aria-label="Días" title="Días de montaje" />
        <select name="installer_id" defaultValue={m.installer_id ?? ""} className="input py-2 text-sm" aria-label="Montador">
          <option value="">Sin montador</option>
          {installers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <button className="btn-light py-2 text-sm">Guardar</button>
      </form>
    </div>
  );
}

export default async function Montajes({ searchParams }: { searchParams: Promise<{ quien?: string; error?: string }> }) {
  await requireDireccion();
  const { quien = "", error } = await searchParams;
  const [all, installersAll] = await Promise.all([
    loadMontajes(),
    sql`select i.id, i.name, i.phone, i.active,
               (select count(*)::int from kitchens k where k.installer_id = i.id and k.phase in ('aceptada', 'frentes', 'fabrica', 'lista', 'montaje')) as open
        from installers i order by i.active desc, i.name`,
  ]);
  const installers = installersAll.filter((i) => i.active).map((i) => ({ id: i.id as number, name: i.name as string }));
  const list = quien ? all.filter((m) => String(m.installer_id) === quien) : all;
  const late = list.filter((m) => m.late);
  const dated = list.filter((m) => m.install_date && !m.late);
  const undated = list.filter((m) => !m.install_date);

  // Agenda: agrupada por semana y por día.
  const weeks = new Map<string, Map<string, Montaje[]>>();
  for (const m of dated) {
    const w = monday(m.install_date!);
    if (!weeks.has(w)) weeks.set(w, new Map());
    const days = weeks.get(w)!;
    days.set(m.install_date!, [...(days.get(m.install_date!) ?? []), m]);
  }
  const t = today();
  const weekTitle = (w: string) => (w === monday(t) ? "Esta semana" : w === addDays(monday(t), 7) ? "La semana que viene" : `Semana del ${dmy(w)}`);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="h1">Montajes</h1>
        <p className="text-muted">Cocinas aceptadas y aún sin montar: cuándo se montan, quién las monta y qué les falta para poder salir.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: "", name: "Todos" }, ...installers].map((i) => (
          <Link key={i.id || "todos"} href={i.id ? { query: { quien: i.id } } : "/montajes"}
            className={`shrink-0 rounded-xl border px-4 py-2.5 ${quien === String(i.id) ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{i.name}</Link>
        ))}
      </div>

      {late.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-bad">Retrasadas · {late.length}</h2>
          <p className="-mt-2 text-sm text-muted">La fecha de montaje ya ha pasado y no están montadas. Pon una fecha nueva o pásalas a «Montada».</p>
          {late.map((m) => <Card key={m.id} m={m} installers={installers} />)}
        </section>
      )}

      {[...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, days]) => (
        <section key={w} className="space-y-3">
          <h2 className="text-lg font-semibold">{weekTitle(w)}</h2>
          {[...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, ms]) => (
            <div key={d} className="space-y-2">
              <p className={`text-sm font-medium first-letter:uppercase ${d === t ? "text-wood" : "text-muted"}`}>{d === t ? "Hoy, " : ""}{weekday(d)}</p>
              {ms.map((m) => <Card key={m.id} m={m} installers={installers} />)}
            </div>
          ))}
        </section>
      ))}

      {undated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sin fecha de montaje · {undated.length}</h2>
          {undated.map((m) => <Card key={m.id} m={m} installers={installers} />)}
        </section>
      )}

      {list.length === 0 && <div className="card p-6 text-muted">No hay montajes pendientes{quien ? " para este montador" : ""}.</div>}

      <section id="montadores" className="card space-y-3 p-5">
        <p className="font-medium">Montadores</p>
        {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Falta el nombre del montador.</p>}
        <ul className="divide-y divide-line text-sm">
          {installersAll.map((i) => (
            <li key={i.id} className={`flex items-center justify-between gap-2 py-2 ${i.active ? "" : "text-muted"}`}>
              <span>
                <span className="font-medium">{i.name}</span>
                {i.phone && <a href={`tel:${i.phone}`} className="ml-2 underline">{i.phone}</a>}
                <span className="ml-2 text-muted">{i.open} {i.open === 1 ? "cocina" : "cocinas"} por montar</span>
              </span>
              <form action={toggleInstaller}>
                <input type="hidden" name="id" value={i.id} />
                <button className="text-muted underline hover:text-ink">{i.active ? "Desactivar" : "Reactivar"}</button>
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
