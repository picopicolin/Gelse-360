import Link from "next/link";
import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Registro" };

export default async function Registro() {
  await requireDireccion();
  const rows = await sql`select id, at, user_name, action, entity, summary, href from activity_log order by at desc limit 300`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">Registro de cambios</h1>
          <p className="text-muted">Quién ha cambiado qué. Últimos 300 movimientos.</p>
        </div>
        <a href="/api/copia" className="btn-light text-sm" title="Todos los datos en un Excel, una hoja por tabla">Descargar copia en Excel</a>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr><th className="p-3">Cuándo</th><th className="p-3">Quién</th><th className="p-3">Qué</th><th className="p-3">Detalle</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap p-3">{new Date(r.at).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{r.user_name}</td>
                <td className="p-3">{r.action} · {r.entity}</td>
                <td className="p-3">{r.href ? <Link href={r.href} className="underline">{r.summary}</Link> : r.summary}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted">Aún no hay movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
