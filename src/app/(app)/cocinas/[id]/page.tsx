import Link from "next/link";
import { notFound } from "next/navigation";
import FactorySheet from "@/components/FactorySheet";
import KitchenFiles from "@/components/KitchenFiles";
import KitchenForm from "@/components/KitchenForm";
import KitchenMaterials from "@/components/KitchenMaterials";
import KitchenPayments from "@/components/KitchenPayments";
import PhaseBadge from "@/components/PhaseBadge";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";
import { kitchenFormData } from "@/lib/kitchens";
import { addDays, today } from "@/lib/logistica";
import { zoneLabel } from "@/lib/naves";
import { DISCARDED, phaseIndex, phaseLabel, PHASES } from "@/lib/phases";
import { setPhase } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [k] = await sql`select title from kitchens where id = ${Number((await params).id) || 0}`;
  return { title: k?.title ?? "Cocina" };
}

// Ficha de una cocina: cabecera con lo esencial, recorrido de fases y pestañas (resumen, fábrica, cobros, archivos, material).
const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "fabrica", label: "Hoja de fábrica" },
  { key: "cobros", label: "Cobros" },
  { key: "archivos", label: "Planos y archivos" },
  { key: "material", label: "Material" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** Cuántos días faltan (o han pasado) hasta una fecha, en palabras. */
function fromToday(iso: string) {
  const days = Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today()}T12:00:00Z`)) / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

/** Anillo de progreso (0–1) con la cifra en medio. Una sola tinta; el gris es lo que falta. */
function Ring({ value, label, sub, tone = "wood" }: { value: number; label: string; sub: string; tone?: "wood" | "ok" | "bad" }) {
  const r = 22, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  const stroke = { wood: "var(--color-wood)", ok: "var(--color-ok)", bad: "var(--color-bad)" }[tone];
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        {v > 0 && <circle cx="28" cy="28" r={r} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />}
      </svg>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="font-semibold tabular-nums">{Math.round(v * 100)} %</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

export default async function FichaCocina({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; editar?: string; error?: string; ver?: string }>;
}) {
  await requireDireccion();
  const { id } = await params;
  const { ok, editar, error, ver } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === ver) ? (ver as Tab) : "resumen";
  const [k] = await sql`select k.*, k.install_date::text as install_date, c.name as client, c.phone as client_phone, c.email as client_email,
                               coalesce(k.address, c.address) as where_address, coalesce(k.city, c.city) as where_city,
                               i.name as installer, i.phone as installer_phone,
                               (select coalesce(sum(qty), 0)::int from kitchen_items x where x.kitchen_id = k.id and x.kind = 'mueble') as total,
                               (select coalesce(sum(qty), 0)::int from kitchen_items x where x.kitchen_id = k.id and x.kind = 'mueble' and x.status = 'hecho') as done,
                               (select coalesce(sum(amount), 0)::float from payments p where p.kitchen_id = k.id and p.deleted_at is null) as paid,
                               (select count(*)::int from kitchen_files f where f.kitchen_id = k.id and f.deleted_at is null) as files,
                               (select count(*)::int from stock_moves m where m.kitchen_id = k.id) as moves
                        from kitchens k join clients c on c.id = k.client_id left join installers i on i.id = k.installer_id
                        where k.id = ${Number(id) || 0}`;
  if (!k) notFound();
  const history = await sql`select phase, at, user_name from kitchen_phases where kitchen_id = ${k.id} order by at desc`;
  const current = phaseIndex(k.phase);
  const next = current >= 0 ? PHASES[current + 1] : undefined;
  // Fecha en la que entró en cada fase (la última vez), para ponerla bajo cada paso del recorrido.
  const enteredAt: Record<string, Date> = {};
  for (const h of history) if (!enteredAt[h.phase]) enteredAt[h.phase] = new Date(h.at);

  const amount = k.amount != null ? Number(k.amount) : null;
  const paid = Number(k.paid);
  const pending = amount != null ? Math.round((amount - paid) * 100) / 100 : null;
  const address = [k.where_address, k.where_city].filter(Boolean).join(", ");
  const installEnd = k.install_date ? addDays(k.install_date, Math.max(1, k.install_days) - 1) : null;
  const late = !!installEnd && installEnd < today() && current >= 0 && current < phaseIndex("montada");

  const PhaseButton = ({ phase, children, className, title }: { phase: string; children: React.ReactNode; className: string; title?: string }) => (
    <form action={setPhase}>
      <input type="hidden" name="id" value={k.id} />
      <input type="hidden" name="phase" value={phase} />
      <input type="hidden" name="ver" value={tab} />
      <button className={className} title={title}>{children}</button>
    </form>
  );

  const counts: Partial<Record<Tab, number>> = { fabrica: k.total, cobros: undefined, archivos: k.files, material: k.moves };

  return (
    <div className="max-w-6xl space-y-5">
      <Link href="/cocinas" className="text-sm text-muted hover:text-ink">← Cocinas</Link>

      {/* Cabecera: quién, qué, cuándo y cuánto, con los botones para llamar o ir a la obra */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="h1">{k.title}</h1>
              <PhaseBadge phase={k.phase} />
              {late && <span className="rounded-full bg-bad/10 px-2.5 py-0.5 text-xs font-medium text-bad">● Montaje retrasado</span>}
            </div>
            <p className="mt-1 text-muted">
              <Link href={`/clientes/${k.client_id}`} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">{k.client}</Link>
              {k.ref && ` · ${k.ref}`}{k.designer && ` · ${k.designer}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {k.client_phone && <a href={`tel:${k.client_phone}`} className="btn-light">📞 Llamar</a>}
            {address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="btn-light">📍 Cómo llegar</a>}
            <Link href={editar ? `/cocinas/${k.id}?ver=${tab}` : `/cocinas/${k.id}?editar=1&ver=${tab}`} className={editar ? "btn-light" : "btn"}>{editar ? "Cancelar" : "Editar"}</Link>
          </div>
        </div>
        <div className="grid gap-4 border-t border-line bg-paper/50 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted">Montaje</p>
            {k.install_date ? <>
              <p className="font-semibold">{dmy(k.install_date)}{k.install_days > 1 && <span className="font-normal text-muted"> · {k.install_days} días</span>}</p>
              <p className={`text-xs ${late ? "font-medium text-bad" : "text-muted"}`}>{fromToday(k.install_date)}</p>
            </> : <p className="font-medium text-muted">Sin fecha</p>}
          </div>
          <div>
            <p className="text-sm text-muted">Montador</p>
            <p className="font-semibold">{k.installer ?? <span className="font-medium text-muted">Sin asignar</span>}</p>
            {k.installer_phone && <a href={`tel:${k.installer_phone}`} className="text-xs text-muted underline">{k.installer_phone}</a>}
          </div>
          <Ring label="Muebles hechos" value={k.total ? k.done / k.total : 0}
            sub={k.total ? `${k.done} de ${k.total}${k.factory_zone ? ` · ${zoneLabel(k.factory_zone)}` : ""}` : "Sin hoja de fábrica"} tone={k.total && k.done === k.total ? "ok" : "wood"} />
          <Ring label="Cobrado" value={amount ? paid / amount : 0}
            sub={amount == null ? "Falta el importe total" : pending! > 0 ? `${eur(paid)} · faltan ${eur(pending)}` : `${eur(amount)} · pagada`}
            tone={amount != null && pending! <= 0 ? "ok" : late || ["montada", "postventa"].includes(k.phase) ? "bad" : "wood"} />
        </div>
      </div>

      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">{ok === "cobro" ? "Cobro apuntado." : "Guardado."}</p>}
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error === "cobro" ? "El importe del cobro no es válido." : "Faltan el cliente o el nombre de la cocina."}</p>}

      {/* Recorrido: puntos unidos por una línea; hechos con ✓ y su fecha, el actual resaltado. Tocar un paso salta a esa fase. */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Recorrido</p>
          <div className="flex flex-wrap items-center gap-3">
            {k.phase === DISCARDED.key
              ? <PhaseButton phase="contacto" className="text-sm text-muted underline">Recuperar (volver a Contacto)</PhaseButton>
              : current < 3 && <PhaseButton phase={DISCARDED.key} className="text-sm text-muted underline">Marcar como descartada</PhaseButton>}
            {next && <PhaseButton phase={next.key} className="btn">Pasar a «{next.label}» →</PhaseButton>}
          </div>
        </div>
        <ol className="flex overflow-x-auto pb-1">
          {PHASES.map((p, i) => {
            const done = i < current, now = i === current;
            const at = enteredAt[p.key];
            return (
              <li key={p.key} className="relative min-w-[3.5rem] flex-1">
                {/* Tramo de línea hasta el siguiente paso */}
                {i < PHASES.length - 1 && <span className={`absolute left-1/2 top-4 h-0.5 w-full ${i < current ? "bg-ok" : "bg-line"}`} />}
                <PhaseButton phase={p.key} title={p.hint} className="group relative flex w-full flex-col items-center gap-1.5 px-1 text-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition
                    ${now ? "border-ink bg-ink text-white ring-4 ring-ink/10" : done ? "border-ok bg-ok text-white" : "border-line bg-white text-muted group-hover:border-ink group-hover:text-ink"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`text-xs leading-tight ${now ? "font-semibold" : done ? "text-ink" : "text-muted group-hover:text-ink"}`}>{p.label}</span>
                  <span className="h-3 text-[10px] text-muted">{(done || now) && at ? at.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit" }) : ""}</span>
                </PhaseButton>
              </li>
            );
          })}
        </ol>
      </div>

      {editar ? <KitchenForm kitchen={k} {...await kitchenFormData()} /> : (
        <>
          {/* Pestañas: se quedan en la dirección (?ver=), así recargar o volver atrás deja donde estabas */}
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1">
            {TABS.map((t) => (
              <Link key={t.key} href={`/cocinas/${k.id}${t.key === "resumen" ? "" : `?ver=${t.key}`}`} scroll={false}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${tab === t.key ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink"}`}>
                {t.label}
                {t.key === "cobros" && pending != null && pending > 0
                  ? <span className={`rounded-full px-1.5 text-xs ${tab === t.key ? "bg-white/20" : "bg-bad/10 text-bad"}`}>{eur(pending)}</span>
                  : counts[t.key] ? <span className={`rounded-full px-1.5 text-xs ${tab === t.key ? "bg-white/20" : "bg-paper"}`}>{counts[t.key]}</span> : null}
              </Link>
            ))}
          </nav>

          {tab === "resumen" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="card grid content-start gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2 lg:col-span-2">
                {[
                  ["Cliente", <Link key="c" href={`/clientes/${k.client_id}`} className="underline">{k.client}</Link>],
                  ["Teléfono del cliente", k.client_phone && <a href={`tel:${k.client_phone}`} className="underline">{k.client_phone}</a>],
                  ["Dirección de la obra", address],
                  ["Correo", k.client_email && <a href={`mailto:${k.client_email}`} className="underline">{k.client_email}</a>],
                  ["Interiorista", k.designer],
                  ["Referencia", k.ref],
                  ["Importe total", amount != null && eur(amount)],
                  ["Frentes", k.fronts_received ? `Recibidos el ${dmy(k.fronts_received)}` : k.fronts_ordered ? `Pedidos el ${dmy(k.fronts_ordered)}${k.fronts_supplier ? ` a ${k.fronts_supplier}` : ""}` : "Sin pedir"],
                ].map(([l, v]) => (
                  <div key={l as string}><p className="text-muted">{l}</p><p className="mt-0.5 font-medium">{v || "—"}</p></div>
                ))}
                {k.notes && <div className="rounded-xl bg-paper p-3 sm:col-span-2"><p className="text-muted">Notas</p><p className="mt-0.5 whitespace-pre-wrap">{k.notes}</p></div>}
              </div>
              <div className="card p-5 text-sm">
                <p className="mb-3 font-semibold">Historial</p>
                {history.length === 0 && <p className="text-muted">Sin cambios de fase todavía.</p>}
                <ol className="relative space-y-3 border-l border-line pl-4">
                  {history.map((h, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-ink" : "bg-line"}`} />
                      <p className={i === 0 ? "font-medium" : ""}>{phaseLabel(h.phase)}</p>
                      <p className="text-xs text-muted">
                        {new Date(h.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })} · {h.user_name}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {tab === "fabrica" && <FactorySheet kitchen={{ id: k.id, fronts_supplier: k.fronts_supplier, fronts_ordered: k.fronts_ordered, fronts_received: k.fronts_received }} />}
          {tab === "cobros" && <KitchenPayments kitchenId={k.id} amount={k.amount} />}
          {tab === "archivos" && <KitchenFiles kitchenId={k.id} />}
          {tab === "material" && <KitchenMaterials kitchenId={k.id} />}
        </>
      )}
    </div>
  );
}
