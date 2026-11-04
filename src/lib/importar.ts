import "server-only";
import ExcelJS from "exceljs";
import { sql } from "./db";
import { PHASES } from "./phases";
import { CATEGORIES, UNITS } from "./stock";

// Plantillas Excel para pasar del papel a la web: clientes, stock inicial y cocinas en marcha.
// La misma definición sirve para crear la plantilla y para leerla al importar.

export type ImportKind = "clientes" | "stock" | "cocinas";
type Col = { key: string; header: string; width: number; required?: boolean; options?: string[]; hint?: string };

const PHASE_LABELS = PHASES.map((p) => p.label);
const CATEGORY_LABELS = Object.values(CATEGORIES);

export const TEMPLATES: Record<ImportKind, { title: string; file: string; cols: Col[]; example: Record<string, unknown>; help: string }> = {
  clientes: {
    title: "Clientes", file: "Plantilla clientes Gelse.xlsx",
    help: "Un cliente por fila. Si ya existe uno con el mismo NIF, o con el mismo nombre y teléfono, no se duplica.",
    cols: [
      { key: "kind", header: "Tipo", width: 14, options: ["Particular", "Profesional"], hint: "Particular o Profesional (si se deja vacío, Particular)" },
      { key: "name", header: "Nombre o empresa", width: 32, required: true },
      { key: "contact", header: "Persona de contacto", width: 24, hint: "Si es una empresa" },
      { key: "nif", header: "NIF / CIF", width: 14 },
      { key: "phone", header: "Teléfono", width: 15 },
      { key: "email", header: "Email", width: 28 },
      { key: "address", header: "Dirección", width: 32 },
      { key: "city", header: "Población", width: 18 },
      { key: "postal_code", header: "Código postal", width: 12 },
      { key: "notes", header: "Notas", width: 30 },
    ],
    example: { kind: "Particular", name: "Marta Ejemplo", phone: "600 000 000", city: "Sant Cugat del Vallès", notes: "(fila de ejemplo: bórrala)" },
  },
  stock: {
    title: "Stock inicial", file: "Plantilla stock Gelse.xlsx",
    help: "Un material por fila, con lo que hay ahora en el almacén. Si ya existe un material con el mismo nombre, no se duplica.",
    cols: [
      { key: "name", header: "Material", width: 36, required: true },
      { key: "category", header: "Categoría", width: 18, options: CATEGORY_LABELS },
      { key: "unit", header: "Unidad", width: 10, options: UNITS, hint: "ud, tablero, m, m²…" },
      { key: "qty", header: "Cantidad actual", width: 15 },
      { key: "min_qty", header: "Mínimo", width: 10, hint: "Avisa cuando baje de aquí" },
      { key: "location", header: "Estantería", width: 12 },
      { key: "supplier", header: "Proveedor", width: 20 },
      { key: "ref", header: "Referencia", width: 16 },
      { key: "notes", header: "Notas", width: 30 },
    ],
    example: { name: "Tablero melamina blanco 19 mm", category: "Tableros", unit: "tablero", qty: 25, min_qty: 10, location: "E1-A", notes: "(fila de ejemplo: bórrala)" },
  },
  cocinas: {
    title: "Cocinas en marcha", file: "Plantilla cocinas en marcha Gelse.xlsx",
    help: "Una cocina por fila. Si el cliente no existe todavía, se crea con el nombre y teléfono de la fila.",
    cols: [
      { key: "client", header: "Cliente", width: 28, required: true },
      { key: "client_phone", header: "Teléfono del cliente", width: 16, hint: "Solo hace falta si el cliente es nuevo" },
      { key: "title", header: "Nombre de la cocina", width: 30, required: true },
      { key: "ref", header: "Referencia del plano", width: 28 },
      { key: "designer", header: "Interiorista", width: 16 },
      { key: "phase", header: "Fase", width: 16, required: true, options: PHASE_LABELS },
      { key: "install_date", header: "Montaje previsto", width: 16, hint: "Fecha (dd/mm/aaaa)" },
      { key: "amount", header: "Importe total (€)", width: 16 },
      { key: "deposit", header: "Señal (€)", width: 12, hint: "Señal ya cobrada: queda apuntada como cobro" },
      { key: "notes", header: "Notas", width: 30 },
    ],
    example: { client: "Marta Ejemplo", client_phone: "600 000 000", title: "Cocina con isla", designer: "Laura", phase: "En fábrica", install_date: "15/12/2026", amount: 12500, deposit: 3000, notes: "(fila de ejemplo: bórrala)" },
  },
};

export const isImportKind = (k: string): k is ImportKind => k in TEMPLATES;

// ── Crear la plantilla ─────────────────────────────────────────────────

export async function buildTemplate(kind: ImportKind) {
  const t = TEMPLATES[kind];
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gelse Gestión";
  const ws = wb.addWorksheet(t.title, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = t.cols.map((c) => ({ header: c.required ? `${c.header} *` : c.header, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F1D1B" } };
  head.height = 22;
  t.cols.forEach((c, i) => { if (c.hint) ws.getCell(1, i + 1).note = c.hint; });
  const ex = ws.addRow(t.example);
  ex.font = { italic: true, color: { argb: "FF8A847D" } };
  // Desplegables en las columnas con opciones fijas (hasta la fila 1000).
  t.cols.forEach((c, i) => {
    if (!c.options) return;
    const letter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [`"${c.options.join(",")}"`],
        showErrorMessage: true, errorTitle: "Valor no válido", error: `Elige uno de la lista: ${c.options.join(", ")}`,
      };
    }
  });
  const help = wb.addWorksheet("Cómo rellenarla");
  help.getColumn(1).width = 110;
  [
    `Plantilla de ${t.title.toLowerCase()} · Gelse Gestión`, "",
    t.help,
    "Las columnas con * son obligatorias. Las demás se pueden dejar vacías y completar después en la web.",
    "La fila gris es un ejemplo: bórrala antes de importar (si no, se importará también).",
    "No cambies el nombre ni el orden de las columnas.",
    "Cuando esté rellena, súbela en la web: menú Importar. Antes de guardar nada, la web enseña lo que va a entrar y los errores.",
  ].forEach((line, i) => { const c = help.getCell(i + 1, 1); c.value = line; if (i === 0) c.font = { bold: true, size: 14 }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Leer una plantilla rellena ─────────────────────────────────────────

export type PreviewRow = { line: number; label: string; status: "nuevo" | "existe" | "error"; notes: string[]; data: Record<string, unknown> };

const str = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "text" in v) v = (v as { text: string }).text; // celdas con enlace o formato
  if (typeof v === "object" && v !== null && "result" in v) v = (v as { result: unknown }).result; // fórmulas
  const s = String(v).trim();
  return s === "" ? null : s;
};

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = str(v);
  if (!s) return null;
  const n = Number(s.replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const day = (v: unknown) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = str(v);
  if (!s) return null;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  const iso = m ? `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s;
  // Fecha que exista de verdad (nada de 32/13): al volver a texto tiene que salir la misma.
  const d = new Date(`${iso}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : "invalida";
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Lee el Excel y dice, fila a fila, qué entraría, qué ya existe y qué tiene errores. No guarda nada. */
export async function previewImport(kind: ImportKind, file: Buffer): Promise<PreviewRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("El Excel no tiene hojas");
  const cols = TEMPLATES[kind].cols;
  // Se buscan las columnas por su encabezado (sin el «*»), así da igual si se han movido.
  const headers = new Map<string, number>();
  ws.getRow(1).eachCell((c, i) => headers.set(norm(String(c.value ?? "").replace("*", "")), i));
  const missing = cols.filter((c) => c.required && !headers.has(norm(c.header)));
  if (missing.length) throw new Error(`Faltan columnas: ${missing.map((c) => c.header).join(", ")}. ¿Es la plantilla de ${TEMPLATES[kind].title.toLowerCase()}?`);

  const raw: { line: number; v: Record<string, unknown> }[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const v: Record<string, unknown> = {};
    for (const c of cols) { const i = headers.get(norm(c.header)); v[c.key] = i ? row.getCell(i).value : null; }
    if (Object.values(v).some((x) => str(x) != null)) raw.push({ line: n, v });
  });
  if (kind === "clientes") return previewClients(raw);
  if (kind === "stock") return previewStock(raw);
  return previewKitchens(raw);
}

async function previewClients(raw: { line: number; v: Record<string, unknown> }[]) {
  const existing = await sql`select lower(name) as name, regexp_replace(coalesce(phone, ''), '\\D', '', 'g') as phone, upper(nif) as nif from clients`;
  const seen = new Set<string>();
  return raw.map(({ line, v }): PreviewRow => {
    const kindTxt = norm(str(v.kind) ?? "particular");
    const data = {
      kind: kindTxt.startsWith("prof") ? "profesional" : "particular",
      name: str(v.name), contact: str(v.contact), nif: str(v.nif)?.toUpperCase() ?? null, phone: str(v.phone),
      email: str(v.email)?.toLowerCase() ?? null, address: str(v.address), city: str(v.city), postal_code: str(v.postal_code), notes: str(v.notes),
    };
    const notes: string[] = [];
    if (!data.name) notes.push("Falta el nombre");
    if (kindTxt && !["particular", "profesional"].includes(kindTxt)) notes.push(`Tipo «${str(v.kind)}» no reconocido: se pone Particular`);
    const phone = (data.phone ?? "").replace(/\D/g, "");
    const key = `${data.nif ?? ""}|${data.name?.toLowerCase()}|${phone}`;
    const dup = existing.some((e) => (data.nif && e.nif === data.nif) || (e.name === data.name?.toLowerCase() && e.phone === phone)) || seen.has(key);
    seen.add(key);
    return { line, label: data.name ?? "(sin nombre)", status: !data.name ? "error" : dup ? "existe" : "nuevo", notes: dup ? ["Ya existe: no se importa", ...notes] : notes, data };
  });
}

async function previewStock(raw: { line: number; v: Record<string, unknown> }[]) {
  const existing = new Set((await sql`select lower(name) as name from stock_items`).map((r) => r.name as string));
  const catByLabel = Object.fromEntries(Object.entries(CATEGORIES).map(([k, l]) => [norm(l), k]));
  return raw.map(({ line, v }): PreviewRow => {
    const notes: string[] = [];
    const name = str(v.name);
    const catTxt = str(v.category);
    const category = catTxt ? catByLabel[norm(catTxt)] ?? catByLabel[norm(catTxt) + "s"] : "otros";
    if (catTxt && !category) notes.push(`Categoría «${catTxt}» no reconocida: va a Otros`);
    const unitTxt = str(v.unit)?.toLowerCase() ?? "ud";
    const unit = UNITS.includes(unitTxt) ? unitTxt : "ud";
    if (unitTxt !== unit) notes.push(`Unidad «${unitTxt}» no reconocida: se pone ud`);
    const qty = num(v.qty) ?? 0, min = num(v.min_qty) ?? 0;
    if (Number.isNaN(qty)) notes.push("La cantidad no es un número");
    if (Number.isNaN(min)) notes.push("El mínimo no es un número");
    if (!name) notes.push("Falta el material");
    const bad = !name || Number.isNaN(qty) || Number.isNaN(min);
    const dup = !!name && existing.has(name.toLowerCase());
    if (name) existing.add(name.toLowerCase());
    const data = { name, category: category ?? "otros", unit, qty, min_qty: min, location: str(v.location), supplier: str(v.supplier), ref: str(v.ref), notes: str(v.notes) };
    return { line, label: name ?? "(sin nombre)", status: bad ? "error" : dup ? "existe" : "nuevo", notes: dup ? ["Ya existe un material con ese nombre: no se importa", ...notes] : notes, data };
  });
}

async function previewKitchens(raw: { line: number; v: Record<string, unknown> }[]) {
  const clients = await sql`select id, lower(name) as name from clients`;
  const kitchens = await sql`select client_id, lower(title) as title from kitchens`;
  const phaseByLabel = Object.fromEntries(PHASES.map((p) => [norm(p.label), p.key]));
  return raw.map(({ line, v }): PreviewRow => {
    const notes: string[] = [];
    const client = str(v.client), title = str(v.title), phaseTxt = str(v.phase);
    const phase = phaseTxt ? phaseByLabel[norm(phaseTxt)] : undefined;
    const install = day(v.install_date), amount = num(v.amount), deposit = num(v.deposit);
    if (!client) notes.push("Falta el cliente");
    if (!title) notes.push("Falta el nombre de la cocina");
    if (!phase) notes.push(phaseTxt ? `Fase «${phaseTxt}» no reconocida` : "Falta la fase");
    if (install === "invalida") notes.push("La fecha de montaje no se entiende (dd/mm/aaaa)");
    if (Number.isNaN(amount)) notes.push("El importe no es un número");
    if (Number.isNaN(deposit)) notes.push("La señal no es un número");
    const bad = notes.length > 0;
    const found = client ? clients.find((c) => c.name === client.toLowerCase()) : undefined;
    if (!bad && !found) notes.push("Cliente nuevo: se crea");
    const dup = !!found && !!title && kitchens.some((k) => k.client_id === found.id && k.title === title.toLowerCase());
    const data = {
      client, client_id: found?.id ?? null, client_phone: str(v.client_phone), title, ref: str(v.ref), designer: str(v.designer),
      phase, install_date: install === "invalida" ? null : install, amount, deposit, notes: str(v.notes),
    };
    return { line, label: `${title ?? "(sin nombre)"} · ${client ?? "?"}`, status: bad ? "error" : dup ? "existe" : "nuevo",
      notes: dup ? ["Este cliente ya tiene una cocina con ese nombre: no se importa"] : notes, data };
  });
}

// ── Guardar ────────────────────────────────────────────────────────────

/** Guarda solo las filas «nuevo» de la vista previa. Todo o nada: si algo falla, no entra ninguna. */
export async function commitImport(kind: ImportKind, rows: PreviewRow[], userName: string) {
  const ok = rows.filter((r) => r.status === "nuevo");
  await sql.begin(async (tx) => {
    for (const { data: d } of ok) {
      if (kind === "clientes") {
        await tx`insert into clients ${tx(d as Record<string, string | null>)}`;
      } else if (kind === "stock") {
        const [it] = await tx`insert into stock_items ${tx(d as Record<string, string | number | null>)} returning id`;
        if (d.qty) await tx`insert into stock_moves (item_id, kind, delta, user_name, notes) values (${it.id}, 'ajuste', ${d.qty as number}, ${userName}, 'Cantidad inicial (Excel)')`;
      } else {
        let clientId = d.client_id as number | null;
        if (!clientId) {
          // Puede venir el mismo cliente nuevo en varias filas: se reutiliza el que se acaba de crear.
          const [c] = await tx`select id from clients where lower(name) = lower(${d.client as string})`;
          clientId = c?.id ?? (await tx`insert into clients (name, phone) values (${d.client as string}, ${d.client_phone as string | null}) returning id`)[0].id;
        }
        const [k] = await tx`insert into kitchens ${tx({
          client_id: clientId, title: d.title as string, ref: d.ref as string | null, designer: d.designer as string | null,
          phase: d.phase as string, install_date: d.install_date as string | null, amount: d.amount as number | null,
          notes: d.notes as string | null,
        })} returning id`;
        await tx`insert into kitchen_phases (kitchen_id, phase, user_name) values (${k.id}, ${d.phase as string}, ${userName + " (Excel)"})`;
        // La señal del Excel queda como primer cobro.
        if ((d.deposit as number | null) && (d.deposit as number) > 0) {
          await tx`insert into payments (kitchen_id, amount, kind, user_name, notes) values (${k.id}, ${d.deposit as number}, 'senal', ${userName}, 'Señal (Excel)')`;
        }
      }
    }
  });
  return ok.length;
}
