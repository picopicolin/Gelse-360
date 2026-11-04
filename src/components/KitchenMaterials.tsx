import Link from "next/link";
import { sql } from "@/lib/db";
import { fmtQty } from "@/lib/stock";

/** Material gastado en una cocina: las salidas de stock apuntadas para ella, sumadas por material. */
export default async function KitchenMaterials({ kitchenId }: { kitchenId: number }) {
  const rows = await sql`select s.id, s.name, s.unit, -sum(m.delta) as used, count(*)::int as moves
                         from stock_moves m join stock_items s on s.id = m.item_id
                         where m.kitchen_id = ${kitchenId} group by s.id order by s.name`;
  if (!rows.length) return null;
  return (
    <div className="card overflow-x-auto">
      <p className="border-b border-line p-3 font-medium">Material gastado</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="p-3"><Link href={`/stock/${r.id}`} className="underline">{r.name}</Link></td>
              <td className="whitespace-nowrap p-3 text-right font-medium">{fmtQty(r.used)} {r.unit}</td>
              <td className="p-3 text-right text-muted">{r.moves} {r.moves === 1 ? "salida" : "salidas"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
