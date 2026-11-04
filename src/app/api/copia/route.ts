import ExcelJS from "exceljs";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

// Copia en Excel de todos los datos (una hoja por tabla), para tenerla a mano y poder leerla sin la web.
// No lleva las contraseñas ni los archivos (planos): esos van en la copia completa (npm run backup).
const TABLES: [string, string, string?][] = [
  ["Clientes", "clients"],
  ["Cocinas", "kitchens"],
  ["Fases de cocinas", "kitchen_phases"],
  ["Zonas", "kitchen_zones"],
  ["Muebles y piezas", "kitchen_items"],
  ["Archivos", "kitchen_files"],
  ["Cobros", "payments"],
  ["Montadores", "installers"],
  ["Catálogo", "cabinet_types"],
  ["Stock", "stock_items"],
  ["Movimientos de stock", "stock_moves"],
  ["Usuarios", "users", "id, username, name, role, active, created_at"],
  ["Registro", "activity_log"],
];

export async function GET() {
  const me = await getCurrentUser();
  if (me?.role !== "direccion") return new Response("Sin permiso", { status: 403 });
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gelse Gestión";
  for (const [title, table, cols] of TABLES) {
    const rows = await sql.unsafe(`select ${cols ?? "*"} from ${table} order by 1`);
    const ws = wb.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
    const keys = rows.columns.map((c) => c.name);
    ws.columns = keys.map((k) => ({ header: k, key: k, width: Math.min(40, Math.max(10, k.length + 2)) }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);
  }
  await audit(me, "otro", "copia", "Descarga de la copia en Excel");
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  return new Response(new Uint8Array(await wb.xlsx.writeBuffer()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Gelse copia ${day}.xlsx"`,
    },
  });
}
