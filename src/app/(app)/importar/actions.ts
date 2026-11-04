"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireDireccion } from "@/lib/auth";
import { commitImport, isImportKind, previewImport, type PreviewRow, TEMPLATES } from "@/lib/importar";

export type ImportResult =
  | { ok: true; mode: "preview"; rows: Omit<PreviewRow, "data">[] }
  | { ok: true; mode: "commit"; saved: number }
  | { ok: false; error: string };

/** Vista previa (no guarda nada) o importación. Al importar se vuelve a leer el Excel aquí: no se fía de lo que manda el navegador. */
export async function importExcel(fd: FormData): Promise<ImportResult> {
  const me = await requireDireccion();
  const kind = String(fd.get("kind"));
  const file = fd.get("file");
  if (!isImportKind(kind)) return { ok: false, error: "Tipo de plantilla desconocido" };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige un Excel" };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, error: "Tiene que ser un Excel .xlsx (si es .xls antiguo, guárdalo como .xlsx)" };
  try {
    const rows = await previewImport(kind, Buffer.from(await file.arrayBuffer()));
    if (fd.get("mode") !== "commit") return { ok: true, mode: "preview", rows: rows.map((r) => ({ line: r.line, label: r.label, status: r.status, notes: r.notes })) };
    const saved = await commitImport(kind, rows, me.name);
    await audit(me, "importar", TEMPLATES[kind].title.toLowerCase(), `${saved} filas desde «${file.name}»`, { href: `/${kind === "stock" ? "stock" : kind}` });
    revalidatePath("/", "layout");
    return { ok: true, mode: "commit", saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se ha podido leer el Excel" };
  }
}
