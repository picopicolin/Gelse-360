import Link from "next/link";
import { notFound } from "next/navigation";
import StockItemForm from "@/components/StockItemForm";
import StockMoveForm from "@/components/StockMoveForm";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { CATEGORIES, fmtQty, stockLevel } from "@/lib/stock";
import { toggleStockItem } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [it] = await sql`select name from stock_items where id = ${Number((await params).id) || 0}`;
  return { title: it?.name ?? "Material" };
}

const OK: Record<string, string> = {
  "1": "Guardado.", entrada: "Entrada apuntada.", salida: "Salida apuntada.", ajuste: "Recuento apuntado.", igual: "El recuento coincide: no hay nada que cambiar.",
};
const KIND_LABEL: Record<string, string> = { entrada: "Entrada", salida: "Salida", ajuste: "Recuento" };

export default async function FichaMaterial({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; editar?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const { ok, error, editar } = await searchParams;
  const [it] = await sql`select * from stock_items where id = ${Number(id) || 0}`;
  if (!it) notFound();
  const [moves, kitchens] = await Promise.all([
    sql`select m.at, m.kind, m.delta, m.user_name, m.notes, m.kitchen_id, k.title as kitchen
        from stock_moves m left join kitchens k on k.id = m.kitchen_id where m.item_id = ${it.id} order by m.at desc limit 100`,
    // Para las salidas: las cocinas que se están fabricando.
    sql`select k.id, k.title || ' · ' || c.name as label from kitchens k join clients c on c.id = k.client_id
        where k.phase in ('aceptada', 'frentes', 'fabrica', 'lista') order by k.install_date nulls last, k.id`,
  ]);
  const lvl = stockLevel(it.qty, it.min_qty);
  const isDir = me.role === "direccion";

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/stock" className="text-sm text-muted hover:text-ink">← Stock</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{it.name}</h1>
          <p className="text-muted">
            {CATEGORIES[it.category] ?? it.category}{it.location ? ` · estantería ${it.location}` : ""}{it.supplier ? ` · ${it.supplier}` : ""}
            {it.ref ? ` · ref. ${it.ref}` : ""}{!it.active && " · desactivado"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold">{fmtQty(it.qty)} <span className="text-lg font-normal text-muted">{it.unit}</span></p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${lvl.tone}`}>
            {lvl.label}{it.min_qty > 0 ? ` · mínimo ${fmtQty(it.min_qty)}` : ""}
          </span>
        </div>
      </div>
      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">{OK[ok] ?? "Guardado."}</p>}
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error === "cantidad" ? "Escribe una cantidad válida (mayor que 0)." : "Falta el nombre."}</p>}

      {editar && isDir ? <StockItemForm item={it} /> : it.active && <StockMoveForm id={it.id} unit={it.unit} kitchens={[...kitchens] as { id: number; label: string }[]} />}

      {it.notes && !editar && <p className="card whitespace-pre-wrap p-4 text-sm">{it.notes}</p>}

      <div className="card overflow-x-auto">
        <p className="border-b border-line p-3 font-medium">Movimientos</p>
        <table className="w-full text-sm">
          <tbody>
            {moves.map((m, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap p-3 text-muted">{new Date(m.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{KIND_LABEL[m.kind]}</td>
                <td className={`whitespace-nowrap p-3 text-right font-medium ${m.delta < 0 ? "text-bad" : "text-ok"}`}>{m.delta > 0 ? "+" : ""}{fmtQty(m.delta)}</td>
                <td className="p-3">
                  {m.kitchen_id && (isDir ? <Link href={`/cocinas/${m.kitchen_id}`} className="underline">{m.kitchen}</Link> : m.kitchen)}
                  {m.notes && <span className="block text-muted">{m.notes}</span>}
                </td>
                <td className="p-3 text-right text-muted">{m.user_name}</td>
              </tr>
            ))}
            {moves.length === 0 && <tr><td className="p-4 text-muted">Sin movimientos todavía.</td></tr>}
          </tbody>
        </table>
      </div>

      {isDir && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={editar ? `/stock/${it.id}` : `/stock/${it.id}?editar=1`} className="btn-light">{editar ? "Cancelar" : "Editar datos"}</Link>
          <form action={toggleStockItem}>
            <input type="hidden" name="id" value={it.id} />
            <button className="btn-light">{it.active ? "Desactivar" : "Reactivar"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
