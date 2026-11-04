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
import { DISCARDED, phaseIndex, phaseLabel, PHASES } from "@/lib/phases";
import { setPhase } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [k] = await sql`select title from kitchens where id = ${Number((await params).id) || 0}`;
  return { title: k?.title ?? "Cocina" };
}

export default async function FichaCocina({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; editar?: string; error?: string }>;
}) {
  await requireDireccion();
  const { id } = await params;
  const { ok, editar, error } = await searchParams;
  const [k] = await sql`select k.*, k.install_date::text as install_date, c.name as client, c.phone as client_phone,
                               coalesce(k.address, c.address) as where_address, coalesce(k.city, c.city) as where_city,
                               i.name as installer, i.phone as installer_phone
                        from kitchens k join clients c on c.id = k.client_id left join installers i on i.id = k.installer_id
                        where k.id = ${Number(id) || 0}`;
  if (!k) notFound();
  const history = await sql`select phase, at, user_name from kitchen_phases where kitchen_id = ${k.id} order by at desc`;
  const current = phaseIndex(k.phase);
  const next = current >= 0 ? PHASES[current + 1] : undefined;

  const PhaseButton = ({ phase, children, className }: { phase: string; children: React.ReactNode; className: string }) => (
    <form action={setPhase}>
      <input type="hidden" name="id" value={k.id} />
      <input type="hidden" name="phase" value={phase} />
      <button className={className}>{children}</button>
    </form>
  );

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/cocinas" className="text-sm text-muted hover:text-ink">← Cocinas</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{k.title}</h1>
          <p className="text-muted">
            <Link href={`/clientes/${k.client_id}`} className="underline">{k.client}</Link>
            {k.ref && ` · ${k.ref}`}
          </p>
        </div>
        <Link href={editar ? `/cocinas/${k.id}` : `/cocinas/${k.id}?editar=1`} className="btn-light">{editar ? "Cancelar" : "Editar"}</Link>
      </div>
      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">{ok === "cobro" ? "Cobro apuntado." : "Guardado."}</p>}
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error === "cobro" ? "El importe del cobro no es válido." : "Faltan el cliente o el nombre de la cocina."}</p>}

      {/* Recorrido: las fases hechas en verde, la actual resaltada. Se puede saltar a cualquiera tocándola. */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Fase: <PhaseBadge phase={k.phase} /></p>
          {next && (
            <PhaseButton phase={next.key} className="btn">Pasar a «{next.label}» →</PhaseButton>
          )}
        </div>
        <ol className="flex gap-1 overflow-x-auto pb-1">
          {PHASES.map((p, i) => (
            <li key={p.key} className="shrink-0">
              <PhaseButton phase={p.key}
                className={`rounded-lg px-2.5 py-2 text-xs ${i === current ? "bg-ink text-white" : i < current ? "bg-ok/15 text-ok" : "bg-paper text-muted hover:text-ink"}`}>
                {i + 1}. {p.label}
              </PhaseButton>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          {k.phase === DISCARDED.key
            ? <PhaseButton phase="contacto" className="text-sm text-muted underline">Recuperar (volver a Contacto)</PhaseButton>
            : current < 3 && <PhaseButton phase={DISCARDED.key} className="text-sm text-muted underline">Marcar como descartada</PhaseButton>}
        </div>
      </div>

      {editar ? <KitchenForm kitchen={k} {...await kitchenFormData()} /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2 lg:col-span-2">
            {[
              ["Interiorista", k.designer],
              ["Montaje previsto", k.install_date && `${dmy(k.install_date)}${k.install_days > 1 ? ` (${k.install_days} días)` : ""}`],
              ["Montador", k.installer && <>{k.installer}{k.installer_phone && <a href={`tel:${k.installer_phone}`} className="ml-2 underline">{k.installer_phone}</a>}</>],
              ["Dirección de la obra", [k.where_address, k.where_city].filter(Boolean).join(", ")],
              ["Teléfono del cliente", k.client_phone && <a href={`tel:${k.client_phone}`} className="underline">{k.client_phone}</a>],
              ["Importe total", k.amount != null && eur(k.amount)],
            ].map(([l, v]) => (
              <div key={l as string}><p className="text-muted">{l}</p><p className="font-medium">{v || "—"}</p></div>
            ))}
            {k.notes && <div className="sm:col-span-2"><p className="text-muted">Notas</p><p className="whitespace-pre-wrap">{k.notes}</p></div>}
          </div>
          <div className="card p-5 text-sm">
            <p className="mb-3 font-medium">Historial</p>
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{phaseLabel(h.phase)}</span>
                  <span className="text-right text-muted">
                    {new Date(h.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })}
                    <span className="block text-xs">{h.user_name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!editar && <KitchenPayments kitchenId={k.id} amount={k.amount} />}
      <KitchenFiles kitchenId={k.id} />
      <FactorySheet kitchen={{ id: k.id, fronts_supplier: k.fronts_supplier, fronts_ordered: k.fronts_ordered, fronts_received: k.fronts_received }} />
      <KitchenMaterials kitchenId={k.id} />
    </div>
  );
}
