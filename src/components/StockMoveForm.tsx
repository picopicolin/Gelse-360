"use client";

import { useState } from "react";
import { moveStock } from "@/app/(app)/stock/actions";

const KINDS = {
  entrada: { label: "Entrada", hint: "¿Cuánto ha llegado?", tone: "bg-ok" },
  salida: { label: "Salida", hint: "¿Cuánto se ha gastado?", tone: "bg-bad" },
  ajuste: { label: "Recuento", hint: "¿Cuánto hay ahora mismo?", tone: "bg-ink" },
} as const;
type Kind = keyof typeof KINDS;

/** Apuntar en la tablet: elegir entrada, salida o recuento, la cantidad y, si es salida, para qué cocina. */
export default function StockMoveForm({ id, unit, kitchens }: { id: number; unit: string; kitchens: { id: number; label: string }[] }) {
  const [kind, setKind] = useState<Kind>("salida");
  return (
    <form action={moveStock} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`rounded-xl py-4 text-lg font-semibold ${kind === k ? `${KINDS[k].tone} text-white` : "border border-line bg-white text-muted"}`}>
            {KINDS[k].label}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="amount">{KINDS[kind].hint}</label>
        <div className="flex items-center gap-3">
          <input id="amount" name="amount" inputMode="decimal" required autoComplete="off"
            className="input max-w-48 py-4 text-center text-3xl font-semibold" placeholder="0" />
          <span className="text-lg text-muted">{unit}</span>
        </div>
      </div>
      {kind === "salida" && (
        <div>
          <label className="label" htmlFor="kitchen_id">¿Para qué cocina?</label>
          <select id="kitchen_id" name="kitchen_id" className="input" defaultValue="">
            <option value="">Ninguna en concreto</option>
            {kitchens.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
      )}
      <input name="notes" className="input" placeholder="Nota (opcional)" />
      <button className={`w-full rounded-xl py-4 text-lg font-semibold text-white ${KINDS[kind].tone}`}>Apuntar {KINDS[kind].label.toLowerCase()}</button>
    </form>
  );
}
