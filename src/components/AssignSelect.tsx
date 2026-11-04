"use client";

import { assignItem } from "@/app/(app)/cocinas/hoja-actions";

/** Desplegable de operario: al elegir uno se guarda solo, sin botón. */
export default function AssignSelect({ id, value, people }: { id: number; value: string | null; people: string[] }) {
  return (
    <form action={assignItem}>
      <input type="hidden" name="id" value={id} />
      <select name="assigned_to" defaultValue={value ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input py-2 text-sm" aria-label="Operario">
        <option value="">Sin asignar</option>
        {people.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </form>
  );
}
