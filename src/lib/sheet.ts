// Hoja de fábrica: familias del catálogo, piezas habituales, estados y medidas.

export const FAMILIES: Record<string, string> = {
  bajo: "Bajos", fregadero: "Bajos fregadero", cajonero: "Cajoneros", esquina: "Rincones",
  lavavajillas: "Lavavajillas", alto: "Altos", abatible: "Abatibles", columna: "Columnas",
};

// Las piezas que salen en las hojas de ahora.
export const PART_NAMES = ["Zócalo", "Gola", "Tapeta", "Lateral", "Trasera", "Encimera", "Estante", "Panel", "LED", "Tiradores", "Patas"];

export const STATUS = {
  pendiente: { label: "Pendiente", tone: "bg-line text-ink" },
  en_curso: { label: "En curso", tone: "bg-warn/15 text-warn" },
  hecho: { label: "Hecho", tone: "bg-ok/15 text-ok" },
} as const;
export type ItemStatus = keyof typeof STATUS;
export const isStatus = (s: string): s is ItemStatus => s in STATUS;

/** Lo lacado va antes en fábrica (es lo más caro): se reconoce por el acabado de la zona. */
export const isLacado = (finish: string | null | undefined) => !!finish && /lac/i.test(finish);

/** «88'5», «88,5» o «88.5» → 88.5 (cm). Vacío → null. */
export function cm(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim().replace(/['´’,]/g, ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}

/** 88.5 → «88,5»; 60 → «60». */
export const fmtCm = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** «60 × 72 × 56». Las piezas suelen llevar solo dos medidas (zócalo 177,5 × 5,6): las que faltan no se escriben. */
export const sizeLabel = (w?: number | null, h?: number | null, d?: number | null) =>
  [w, h, d].filter((x) => x != null).map((x) => fmtCm(x)).join(" × ");
