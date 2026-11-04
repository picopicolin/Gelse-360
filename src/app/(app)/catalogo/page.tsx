import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { FAMILIES, fmtCm } from "@/lib/sheet";
import { saveCabinet, toggleCabinet } from "./actions";

export const metadata = { title: "Catálogo" };

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await requireDireccion();
  const { error, ok } = await searchParams;
  const rows = await sql`select id, code, family, name, width, height, depth, notes, active from cabinet_types order by family, width, code`;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="h1">Catálogo de muebles estándar</h1>
        <p className="text-muted">Medidas en cm, sin patas. Al añadir un mueble a una cocina se parte de aquí; si se cambia alguna medida, queda como «a medida».</p>
      </div>
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Faltan datos: código, nombre, familia y las tres medidas.</p>}
      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">Guardado.</p>}

      <form action={saveCabinet} className="card grid grid-cols-2 gap-2 p-4 sm:grid-cols-12 sm:items-end">
        <p className="col-span-2 font-medium sm:col-span-12">Añadir o cambiar (si el código ya existe, se actualiza)</p>
        <input name="code" className="input sm:col-span-2" placeholder="Código (B60)" required />
        <select name="family" className="input sm:col-span-2" defaultValue="bajo">
          {Object.entries(FAMILIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input name="name" className="input col-span-2 sm:col-span-3" placeholder="Nombre" required />
        <input name="width" className="input sm:col-span-1" inputMode="decimal" placeholder="Ancho" required />
        <input name="height" className="input sm:col-span-1" inputMode="decimal" placeholder="Alto" required />
        <input name="depth" className="input sm:col-span-1" inputMode="decimal" placeholder="Fondo" required />
        <button className="btn col-span-2 sm:col-span-2">Guardar</button>
      </form>

      {Object.entries(FAMILIES).map(([fam, label]) => {
        const list = rows.filter((r) => r.family === fam);
        if (!list.length) return null;
        return (
          <section key={fam} className="card overflow-x-auto">
            <p className="border-b border-line p-3 font-medium">{label} <span className="text-muted">{list.length}</span></p>
            <table className="w-full text-sm">
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className={`border-b border-line last:border-0 ${r.active ? "" : "text-muted line-through"}`}>
                    <td className="w-24 p-3 font-mono">{r.code}</td>
                    <td className="p-3">{r.name}{r.notes && <span className="block text-muted no-underline">{r.notes}</span>}</td>
                    <td className="whitespace-nowrap p-3">{fmtCm(r.width)} × {fmtCm(r.height)} × {fmtCm(r.depth)}</td>
                    <td className="p-3 text-right">
                      <form action={toggleCabinet}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-muted underline hover:text-ink">{r.active ? "Desactivar" : "Activar"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
