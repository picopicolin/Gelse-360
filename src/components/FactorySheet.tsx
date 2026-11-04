import { removeItem, removeZone, saveFronts, saveZone } from "@/app/(app)/cocinas/hoja-actions";
import { sql } from "@/lib/db";
import { dmy } from "@/lib/form";
import { FAMILIES, isLacado, PART_NAMES, sizeLabel, STATUS, type ItemStatus } from "@/lib/sheet";
import AddItemForm, { type CatalogItem } from "./AddItemForm";
import ConfirmButton from "./ConfirmButton";

type Kitchen = { id: number; fronts_supplier: string | null; fronts_ordered: string | null; fronts_received: string | null };

/** Hoja de fábrica de una cocina: frentes, zonas con su acabado y lo que hay que fabricar de cada una. */
export default async function FactorySheet({ kitchen }: { kitchen: Kitchen }) {
  const [zones, items, catalog, finishes, suppliers] = await Promise.all([
    sql`select id, name, finish from kitchen_zones where kitchen_id = ${kitchen.id} order by sort, id`,
    sql`select id, zone_id, kind, name, width, height, depth, custom, qty, notes, status, assigned_to
        from kitchen_items where kitchen_id = ${kitchen.id} order by kind, sort, id`,
    sql<CatalogItem[]>`select id, family, name, width, height, depth from cabinet_types where active order by family, width, name`,
    sql`select distinct finish from kitchen_zones where finish is not null order by finish`,
    sql`select distinct fronts_supplier from kitchens where fronts_supplier is not null order by fronts_supplier`,
  ]);
  const muebles = items.filter((i) => i.kind === "mueble");
  const done = muebles.filter((i) => i.status === "hecho").reduce((s, i) => s + i.qty, 0);
  const total = muebles.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">Hoja de fábrica</h2>
        {total > 0 && <p className="text-sm text-muted">{done} de {total} muebles hechos</p>}
      </div>

      {/* Frentes: se compran fuera. */}
      <form action={saveFronts} className="card grid gap-3 p-4 sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="kitchen_id" value={kitchen.id} />
        <p className="font-medium sm:col-span-4">
          Frentes{" "}
          <span className="text-sm font-normal text-muted">
            {kitchen.fronts_received ? `· recibidos el ${dmy(kitchen.fronts_received)}` : kitchen.fronts_ordered ? `· pedidos el ${dmy(kitchen.fronts_ordered)}, sin recibir` : "· sin pedir"}
          </span>
        </p>
        <div>
          <label className="label" htmlFor="fronts_supplier">Proveedor</label>
          <input className="input" id="fronts_supplier" name="fronts_supplier" defaultValue={kitchen.fronts_supplier ?? ""} list="suppliers" />
          <datalist id="suppliers">{suppliers.map((s) => <option key={s.fronts_supplier} value={s.fronts_supplier} />)}</datalist>
        </div>
        <div><label className="label" htmlFor="fronts_ordered">Pedidos el</label><input className="input" id="fronts_ordered" name="fronts_ordered" type="date" defaultValue={kitchen.fronts_ordered ?? ""} /></div>
        <div><label className="label" htmlFor="fronts_received">Recibidos el</label><input className="input" id="fronts_received" name="fronts_received" type="date" defaultValue={kitchen.fronts_received ?? ""} /></div>
        <button className="btn-light">Guardar frentes</button>
      </form>

      <datalist id="finishes">{finishes.map((f) => <option key={f.finish} value={f.finish} />)}</datalist>

      {zones.map((z) => {
        const zoneItems = items.filter((i) => i.zone_id === z.id);
        return (
          <section key={z.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <form action={saveZone} className="flex flex-1 flex-wrap gap-2">
                <input type="hidden" name="kitchen_id" value={kitchen.id} />
                <input type="hidden" name="id" value={z.id} />
                <input name="name" defaultValue={z.name} className="input max-w-56 font-semibold" aria-label="Zona" required />
                <input name="finish" defaultValue={z.finish ?? ""} className="input max-w-72" placeholder="Acabado" list="finishes" aria-label="Acabado" />
                <button className="btn-light text-sm">Guardar</button>
              </form>
              <div className="flex items-center gap-2">
                {isLacado(z.finish) && <span className="rounded-full bg-wood/15 px-2.5 py-1 text-xs font-medium text-wood">Lacado: va primero</span>}
                <form action={removeZone}>
                  <input type="hidden" name="id" value={z.id} />
                  <ConfirmButton message={`¿Quitar la zona «${z.name}» con todo lo que tiene?`} className="text-sm text-muted underline hover:text-bad">Quitar zona</ConfirmButton>
                </form>
              </div>
            </div>

            {zoneItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr><th className="py-2 pr-3">Qué</th><th className="py-2 pr-3">Ancho × alto × fondo</th><th className="py-2 pr-3">Uds.</th><th className="py-2 pr-3">Fábrica</th><th /></tr>
                  </thead>
                  <tbody>
                    {zoneItems.map((i) => (
                      <tr key={i.id} className="border-t border-line">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{i.name}</span>
                          {i.kind === "pieza" && <span className="ml-2 text-xs text-muted">pieza</span>}
                          {i.custom && <span className="ml-2 rounded bg-wood/15 px-1.5 py-0.5 text-xs text-wood">a medida</span>}
                          {i.notes && <span className="block text-muted">{i.notes}</span>}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3">{sizeLabel(i.width, i.height, i.depth) || "—"}</td>
                        <td className="py-2 pr-3">{i.qty}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[i.status as ItemStatus].tone}`}>{STATUS[i.status as ItemStatus].label}</span>
                          {i.assigned_to && <span className="ml-2 text-muted">{i.assigned_to}</span>}
                        </td>
                        <td className="py-2 text-right">
                          <form action={removeItem}>
                            <input type="hidden" name="id" value={i.id} />
                            <ConfirmButton message={`¿Quitar «${i.name}»?`} className="text-muted hover:text-bad" >✕</ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AddItemForm zoneId={z.id} catalog={[...catalog]} families={FAMILIES} partNames={PART_NAMES} />
          </section>
        );
      })}

      <form action={saveZone} className="card flex flex-wrap items-end gap-2 border-dashed p-4">
        <input type="hidden" name="kitchen_id" value={kitchen.id} />
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="new-zone">{zones.length ? "Otra zona" : "Primera zona"}</label>
          <input id="new-zone" name="name" className="input" placeholder="p. ej. Bloque desayuno, isla, escritorio" required />
        </div>
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="new-finish">Acabado</label>
          <input id="new-finish" name="finish" className="input" placeholder="p. ej. ONL - Lacado texturado" list="finishes" />
        </div>
        <button className="btn">+ Añadir zona</button>
      </form>
    </div>
  );
}
