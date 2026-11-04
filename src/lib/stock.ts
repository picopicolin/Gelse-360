// Stock: categorías, unidades y el color de cada material según su cantidad.

export const CATEGORIES: Record<string, string> = {
  tableros: "Tableros", cantos: "Cantos", herrajes: "Herrajes", encimeras: "Encimeras",
  electrodomesticos: "Electrodomésticos", iluminacion: "Iluminación", consumibles: "Consumibles", otros: "Otros",
};

export const UNITS = ["ud", "tablero", "m", "m²", "caja", "rollo", "kg", "l"];

/** Verde bien, ámbar bajo el mínimo, rojo agotado (los mismos colores que tendrán las estanterías del 3D). */
export function stockLevel(qty: number, min: number) {
  if (qty <= 0) return { key: "agotado", label: "Agotado", tone: "bg-bad/15 text-bad", dot: "bg-bad" } as const;
  if (qty < min) return { key: "bajo", label: "Bajo mínimo", tone: "bg-warn/15 text-warn", dot: "bg-warn" } as const;
  return { key: "bien", label: "Bien", tone: "bg-ok/15 text-ok", dot: "bg-ok" } as const;
}

/** 12 → «12»; 2.5 → «2,5». */
export const fmtQty = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** «2,5» o «2.5» → 2.5. Vacío o no válido → null. */
export function qtyValue(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
