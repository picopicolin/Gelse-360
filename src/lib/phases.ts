// Fases de una cocina, en orden. «descartada» queda fuera del recorrido (presupuesto que no sale).
export const PHASES = [
  { key: "contacto", label: "Contacto", hint: "El cliente ha venido o ha escrito" },
  { key: "medicion", label: "Medición", hint: "El interiorista va a tomar medidas" },
  { key: "diseno", label: "Diseño", hint: "Planos y renders" },
  { key: "aceptada", label: "Aceptada", hint: "Ha pagado la señal" },
  { key: "frentes", label: "Frentes pedidos", hint: "Frentes encargados al proveedor" },
  { key: "fabrica", label: "En fábrica", hint: "Sergio la reparte y se montan los muebles" },
  { key: "lista", label: "Lista", hint: "Embalada, esperando al montador" },
  { key: "montaje", label: "Montaje", hint: "El montador la ha recogido" },
  { key: "montada", label: "Montada", hint: "Instalada en casa del cliente" },
  { key: "cobrada", label: "Cobrada", hint: "Pagada del todo" },
  { key: "postventa", label: "Postventa", hint: "Incidencias o retoques" },
] as const;

export const DISCARDED = { key: "descartada", label: "Descartada", hint: "El presupuesto no ha salido" } as const;

export type PhaseKey = (typeof PHASES)[number]["key"] | typeof DISCARDED.key;

export const ALL_PHASES = [...PHASES, DISCARDED];

export const phaseLabel = (k: string) => ALL_PHASES.find((p) => p.key === k)?.label ?? k;
export const phaseIndex = (k: string) => PHASES.findIndex((p) => p.key === k);
export const isPhase = (k: string): k is PhaseKey => ALL_PHASES.some((p) => p.key === k);

/** Color de la etiqueta: gris antes de aceptar, madera en fábrica, verde al acabar. */
export function phaseTone(k: string) {
  const i = phaseIndex(k);
  if (k === DISCARDED.key) return "bg-line text-muted line-through";
  if (i < 3) return "bg-line text-ink";
  if (i < 7) return "bg-wood/15 text-wood";
  if (k === "postventa") return "bg-warn/15 text-warn";
  return "bg-ok/15 text-ok";
}
