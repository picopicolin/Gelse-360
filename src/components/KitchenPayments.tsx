import { addPayment, removePayment } from "@/app/(app)/cocinas/cobros-actions";
import { sql } from "@/lib/db";
import { dmy, eur } from "@/lib/form";
import { METHODS, PAYMENT_KINDS } from "@/lib/payments";
import ConfirmButton from "./ConfirmButton";

/** Cobros de una cocina: lo cobrado, lo pendiente y el formulario para apuntar un pago. */
export default async function KitchenPayments({ kitchenId, amount }: { kitchenId: number; amount: number | null }) {
  const rows = await sql`select id, date::text, amount, kind, method, notes, user_name from payments
                         where kitchen_id = ${kitchenId} and deleted_at is null order by date, id`;
  const paid = rows.reduce((s, r) => s + r.amount, 0);
  const pending = amount != null ? Math.round((amount - paid) * 100) / 100 : null;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const hasDeposit = rows.some((r) => r.kind === "senal");
  return (
    <div id="cobros" className="card space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">Cobros</p>
        <p className="text-sm">
          Cobrado <b>{eur(paid)}</b>
          {amount != null && <> de {eur(amount)} · {pending! > 0 ? <b className="text-bad">pendiente {eur(pending)}</b> : <b className="text-ok">pagada del todo</b>}</>}
          {amount == null && <span className="text-muted"> · falta poner el importe total</span>}
        </p>
      </div>
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="whitespace-nowrap py-2 pr-3">{dmy(r.date)}</td>
                <td className="py-2 pr-3">{PAYMENT_KINDS[r.kind]}{r.method && <span className="text-muted"> · {r.method}</span>}{r.notes && <span className="block text-muted">{r.notes}</span>}</td>
                <td className="whitespace-nowrap py-2 pr-3 text-right font-medium">{eur(r.amount)}</td>
                <td className="py-2 text-right">
                  <form action={removePayment}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton message={`¿Quitar el cobro de ${eur(r.amount)}?`} className="text-muted hover:text-bad">✕</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={addPayment} className="grid grid-cols-2 gap-2 rounded-xl bg-paper p-3 sm:grid-cols-6">
        <input type="hidden" name="kitchen_id" value={kitchenId} />
        <input name="date" type="date" defaultValue={today} className="input sm:col-span-1" aria-label="Fecha" />
        <select name="kind" defaultValue={hasDeposit ? (pending != null && pending > 0 ? "final" : "parcial") : "senal"} className="input sm:col-span-1" aria-label="Tipo">
          {Object.entries(PAYMENT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input name="amount" inputMode="decimal" placeholder="Importe €" required className="input sm:col-span-1"
          defaultValue={hasDeposit && pending != null && pending > 0 ? String(pending).replace(".", ",") : ""} />
        <select name="method" defaultValue="Transferencia" className="input sm:col-span-1" aria-label="Forma de pago">
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input name="notes" placeholder="Nota" className="input sm:col-span-1" />
        <button className="btn sm:col-span-1">Apuntar cobro</button>
      </form>
    </div>
  );
}
