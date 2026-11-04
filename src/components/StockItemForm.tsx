import { saveStockItem } from "@/app/(app)/stock/actions";
import { CATEGORIES, UNITS } from "@/lib/stock";

type Item = {
  id?: number; name?: string; category?: string; unit?: string; min_qty?: number; location?: string | null;
  supplier?: string | null; ref?: string | null; notes?: string | null;
};

const num = (n: number | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** Alta o edición de un material. En el alta se puede poner lo que ya hay en el almacén. */
export default function StockItemForm({ item = {} }: { item?: Item }) {
  return (
    <form action={saveStockItem} className="card grid gap-4 p-5 sm:grid-cols-2">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Material *</label>
        <input className="input" id="name" name="name" defaultValue={item.name ?? ""} placeholder="p. ej. Tablero melamina blanco 19 mm" required />
      </div>
      <div>
        <label className="label" htmlFor="category">Categoría</label>
        <select className="input" id="category" name="category" defaultValue={item.category ?? "tableros"}>
          {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="unit">Unidad</label>
        <select className="input" id="unit" name="unit" defaultValue={item.unit ?? "ud"}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {!item.id && (
        <div>
          <label className="label" htmlFor="qty">Cantidad que hay ahora</label>
          <input className="input" id="qty" name="qty" inputMode="decimal" placeholder="0" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="min_qty">Mínimo (avisa por debajo)</label>
        <input className="input" id="min_qty" name="min_qty" inputMode="decimal" defaultValue={num(item.min_qty)} placeholder="0" />
      </div>
      <div>
        <label className="label" htmlFor="location">Estantería / zona</label>
        <input className="input" id="location" name="location" defaultValue={item.location ?? ""} placeholder="p. ej. E3-B" />
      </div>
      <div>
        <label className="label" htmlFor="supplier">Proveedor</label>
        <input className="input" id="supplier" name="supplier" defaultValue={item.supplier ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="ref">Referencia del proveedor</label>
        <input className="input" id="ref" name="ref" defaultValue={item.ref ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notas</label>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={item.notes ?? ""} />
      </div>
      <div className="sm:col-span-2"><button className="btn">Guardar material</button></div>
    </form>
  );
}
