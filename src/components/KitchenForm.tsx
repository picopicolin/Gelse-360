import { saveKitchen } from "@/app/(app)/cocinas/actions";

type Kitchen = {
  id?: number; client_id?: number; title?: string; ref?: string | null; address?: string | null; city?: string | null;
  designer?: string | null; install_date?: string | null; install_days?: number; installer_id?: number | null;
  amount?: number | null; notes?: string | null;
};

const num = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** Formulario de cocina: el mismo para el alta y para editar. Sin cliente fijado, deja elegirlo. */
export default function KitchenForm({ kitchen = {}, clients, designers, installers }: {
  kitchen?: Kitchen; clients: { id: number; name: string }[]; designers: string[]; installers: { id: number; name: string }[];
}) {
  return (
    <form action={saveKitchen} className="card grid gap-4 p-5 sm:grid-cols-2">
      {kitchen.id && <input type="hidden" name="id" value={kitchen.id} />}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="client_id">Cliente *</label>
        <select className="input" id="client_id" name="client_id" defaultValue={kitchen.client_id ?? ""} required>
          <option value="" disabled>Elige un cliente…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="title">Nombre de la cocina *</label>
        <input className="input" id="title" name="title" defaultValue={kitchen.title ?? ""} placeholder="p. ej. Cocina con isla, Sant Cugat" required />
      </div>
      <div>
        <label className="label" htmlFor="ref">Referencia del plano</label>
        <input className="input" id="ref" name="ref" defaultValue={kitchen.ref ?? ""} placeholder="p. ej. PARTI - JOSE RACHE - CUINA" />
      </div>
      <div>
        <label className="label" htmlFor="designer">Interiorista</label>
        <input className="input" id="designer" name="designer" defaultValue={kitchen.designer ?? ""} list="designers" />
        <datalist id="designers">{designers.map((d) => <option key={d} value={d} />)}</datalist>
      </div>
      <div>
        <label className="label" htmlFor="install_date">Montaje previsto</label>
        <input className="input" id="install_date" name="install_date" type="date" defaultValue={kitchen.install_date ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="address">Dirección de la obra (si no es la del cliente)</label>
        <input className="input" id="address" name="address" defaultValue={kitchen.address ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="city">Población</label>
        <input className="input" id="city" name="city" defaultValue={kitchen.city ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="amount">Importe total con IVA (€)</label>
        <input className="input" id="amount" name="amount" inputMode="decimal" defaultValue={num(kitchen.amount)} />
      </div>
      {/* La señal se apunta como cobro. Al crear la cocina se puede poner aquí directamente. */}
      {!kitchen.id && (
        <div>
          <label className="label" htmlFor="deposit">Señal cobrada (€)</label>
          <input className="input" id="deposit" name="deposit" inputMode="decimal" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="installer_id">Montador</label>
        <select className="input" id="installer_id" name="installer_id" defaultValue={kitchen.installer_id ?? ""}>
          <option value="">Sin asignar</option>
          {installers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="install_days">Días de montaje</label>
        <input className="input" id="install_days" name="install_days" type="number" min={1} max={30} defaultValue={kitchen.install_days ?? 1} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notas</label>
        <textarea className="input min-h-24" id="notes" name="notes" defaultValue={kitchen.notes ?? ""} />
      </div>
      <div className="sm:col-span-2"><button className="btn">Guardar cocina</button></div>
    </form>
  );
}
