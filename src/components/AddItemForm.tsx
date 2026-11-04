"use client";

import { useState } from "react";
import { addItem } from "@/app/(app)/cocinas/hoja-actions";

export type CatalogItem = { id: number; family: string; name: string; width: number; height: number; depth: number };

const fmt = (n: number) => String(n).replace(".", ",");

/** Añadir a una zona un mueble (del catálogo, con las medidas que se pueden ajustar) o una pieza suelta. */
export default function AddItemForm({ zoneId, catalog, families, partNames }: {
  zoneId: number; catalog: CatalogItem[]; families: Record<string, string>; partNames: string[];
}) {
  const [kind, setKind] = useState<"mueble" | "pieza">("mueble");
  const [size, setSize] = useState({ width: "", height: "", depth: "" });
  const [key, setKey] = useState(0); // para vaciar el formulario después de añadir

  const pick = (id: string) => {
    const t = catalog.find((c) => String(c.id) === id);
    setSize(t ? { width: fmt(t.width), height: fmt(t.height), depth: fmt(t.depth) } : { width: "", height: "", depth: "" });
  };

  return (
    <form key={key} action={async (fd) => { await addItem(fd); setSize({ width: "", height: "", depth: "" }); setKey((k) => k + 1); }}
      className="grid grid-cols-2 gap-2 rounded-xl bg-paper p-3 sm:grid-cols-12">
      <input type="hidden" name="zone_id" value={zoneId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="col-span-2 flex gap-1 sm:col-span-12">
        {(["mueble", "pieza"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-ink text-white" : "bg-white text-muted"}`}>
            {k === "mueble" ? "+ Mueble" : "+ Pieza"}
          </button>
        ))}
      </div>
      {kind === "mueble" ? (
        <>
          <select name="cabinet_type_id" className="input col-span-2 sm:col-span-4" defaultValue="" onChange={(e) => pick(e.target.value)}>
            <option value="">A medida (sin catálogo)</option>
            {Object.entries(families).map(([f, label]) => (
              <optgroup key={f} label={label}>
                {catalog.filter((c) => c.family === f).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
          <input name="name" className="input col-span-2 sm:col-span-3" placeholder="Nombre (si es a medida)" />
        </>
      ) : (
        <>
          <input name="name" className="input col-span-2 sm:col-span-4" placeholder="Pieza: zócalo, gola, lateral…" list="part-names" required />
          <datalist id="part-names">{partNames.map((p) => <option key={p} value={p} />)}</datalist>
          <input name="notes" className="input col-span-2 sm:col-span-3" placeholder="Nota (izquierda, cara buena…)" />
        </>
      )}
      {(["width", "height", "depth"] as const).map((f) => (
        <input key={f} name={f} inputMode="decimal" className="input sm:col-span-1" placeholder={{ width: "Ancho", height: "Alto", depth: "Fondo" }[f]}
          value={size[f]} onChange={(e) => setSize({ ...size, [f]: e.target.value })} />
      ))}
      <input name="qty" type="number" min={1} defaultValue={1} className="input sm:col-span-1" aria-label="Cantidad" />
      <button className="btn col-span-2 sm:col-span-1">Añadir</button>
      {kind === "mueble" && <input name="notes" className="input col-span-2 sm:col-span-12" placeholder="Nota para fábrica (opcional)" />}
    </form>
  );
}
