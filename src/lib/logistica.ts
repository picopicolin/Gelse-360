import "server-only";
import { sql } from "./db";

// Montajes: qué cocinas se montan cuándo, con quién, y qué les falta para poder salir de fábrica.

export type Montaje = {
  id: number; title: string; client: string; phone: string | null; address: string; phase: string;
  install_date: string | null; install_days: number; installer_id: number | null; installer: string | null;
  done: number; total: number; fronts: boolean; amount: number | null; paid: number;
  missing: string[];   // lo que falta para poder salir
  late: boolean;       // la fecha de montaje ya ha pasado y no está montada
};

// Fases en las que una cocina está pendiente de montar.
const OPEN = ["aceptada", "frentes", "fabrica", "lista", "montaje"];

export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Cocinas aceptadas y aún sin montar, con su montaje y lo que les falta. */
export async function loadMontajes(): Promise<Montaje[]> {
  const rows = await sql`
    select k.id, k.title, c.name as client, c.phone, k.phase, k.install_date::text as install_date, k.install_days,
           k.installer_id, i.name as installer, k.fronts_received is not null as fronts, k.amount,
           concat_ws(', ', coalesce(k.address, c.address), coalesce(k.city, c.city)) as address,
           (select coalesce(sum(qty), 0)::int from kitchen_items x where x.kitchen_id = k.id and x.kind = 'mueble' and x.status = 'hecho') as done,
           (select coalesce(sum(qty), 0)::int from kitchen_items x where x.kitchen_id = k.id and x.kind = 'mueble') as total,
           (select coalesce(sum(amount), 0) from payments p where p.kitchen_id = k.id and p.deleted_at is null) as paid
    from kitchens k join clients c on c.id = k.client_id left join installers i on i.id = k.installer_id
    where k.phase in ${sql(OPEN)}
    order by k.install_date nulls last, k.id`;
  const t = today();
  return rows.map((r) => {
    const missing: string[] = [];
    // Una cocina «Lista» o en montaje ya ha salido de fábrica: solo le pueden faltar fecha y montador.
    if (!["lista", "montaje"].includes(r.phase)) {
      const left = r.total - r.done;
      if (r.total === 0) missing.push("hoja de fábrica");
      else if (left > 0) missing.push(`${left} ${left === 1 ? "mueble" : "muebles"} por hacer`);
      if (!r.fronts) missing.push("frentes");
    }
    if (!r.installer_id) missing.push("montador");
    if (!r.install_date) missing.push("fecha");
    const end = r.install_date ? addDays(r.install_date, Math.max(1, r.install_days) - 1) : null;
    return {
      id: r.id, title: r.title, client: r.client, phone: r.phone, address: r.address, phase: r.phase,
      install_date: r.install_date, install_days: r.install_days, installer_id: r.installer_id, installer: r.installer,
      done: r.done, total: r.total, fronts: r.fronts, amount: r.amount, paid: r.paid,
      missing, late: !!end && end < t,
    };
  });
}

/** Cobros pendientes: cocinas con importe y algo por cobrar (las descartadas no cuentan). */
export async function loadPendingPayments() {
  return sql`
    select k.id, k.title, c.name as client, k.phase, k.amount, coalesce(p.paid, 0) as paid, k.amount - coalesce(p.paid, 0) as pending
    from kitchens k join clients c on c.id = k.client_id
    left join (select kitchen_id, sum(amount) as paid from payments where deleted_at is null group by kitchen_id) p on p.kitchen_id = k.id
    where k.amount is not null and k.phase not in ('contacto', 'medicion', 'diseno', 'descartada')
      and k.amount - coalesce(p.paid, 0) > 0.009
    order by (k.phase in ('montada', 'cobrada', 'postventa')) desc, k.amount - coalesce(p.paid, 0) desc`;
}
