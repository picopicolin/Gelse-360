// Distribución de las naves para el 3D, en metros. x hacia el este (Ctra. de Ripollet), z hacia el sur (c/ Beat Oriol).
// El origen (0, 0) es la esquina de Beat Oriol con la Ctra. de Ripollet, donde está el showroom.
//
// SUPUESTO (04/11/2026): medidas sacadas a ojo de la vista aérea de Google Maps y distribución interior inventada
// siguiendo el recorrido de una cocina. Cuando lleguen planos o fotos, se corrige aquí y el 3D cambia solo.

export type Rect = { x: number; z: number; w: number; d: number }; // esquina noroeste + ancho (x) + fondo (z)

export const BUILDINGS = {
  showroom: { label: "Showroom", rect: { x: -30, z: -24, w: 30, d: 24 }, height: 7 },
  nave1: { label: "Nave 1", rect: { x: -15, z: -64, w: 15, d: 40 }, height: 8 },
  nave2: { label: "Nave 2", rect: { x: -30, z: -64, w: 15, d: 40 }, height: 8 },
} as const;

// Zonas de la fábrica, en el orden del recorrido: tablero → corte → canteado → mecanizado → lacado → montaje → embalaje → listos.
export const FACTORY_ZONES = [
  { key: "almacen", label: "Almacén", rect: { x: -29, z: -63, w: 13, d: 13 }, color: "#d9d2c5", stock: true },
  { key: "corte", label: "Corte", rect: { x: -29, z: -49, w: 13, d: 7 }, color: "#e8d7b9" },
  { key: "canteado", label: "Canteado", rect: { x: -29, z: -41, w: 13, d: 7 }, color: "#e3cfae" },
  { key: "mecanizado", label: "Mecanizado", rect: { x: -29, z: -33, w: 13, d: 8 }, color: "#ddc7a3" },
  { key: "lacado", label: "Lacado", rect: { x: -14, z: -33, w: 13, d: 8 }, color: "#e9dfe9" },
  { key: "montaje", label: "Montaje de muebles", rect: { x: -14, z: -45, w: 13, d: 11 }, color: "#d8e3d3" },
  { key: "embalaje", label: "Embalaje", rect: { x: -14, z: -53, w: 13, d: 7 }, color: "#d3dde6" },
  { key: "listos", label: "Listos para salir", rect: { x: -14, z: -63, w: 13, d: 9 }, color: "#cfe6d8" },
] as const;

export type FactoryZoneKey = (typeof FACTORY_ZONES)[number]["key"];
// Las zonas donde puede estar una cocina (el almacén es solo de material).
export const KITCHEN_ZONES = FACTORY_ZONES.filter((z) => z.key !== "almacen");
export const isFactoryZone = (k: string): k is FactoryZoneKey => FACTORY_ZONES.some((z) => z.key === k);
export const zoneLabel = (k: string | null | undefined) => FACTORY_ZONES.find((z) => z.key === k)?.label ?? "Sin zona";

// Estanterías del almacén: el material con «Estantería» E3-B va a la E3.
export const SHELVES = Array.from({ length: 8 }, (_, i) => ({
  key: `E${i + 1}`,
  x: -27.5 + (i % 4) * 3.2,
  z: i < 4 ? -61 : -55.5,
}));
export const shelfOf = (location: string | null | undefined) => {
  const m = /^\s*(E\d+)/i.exec(location ?? "");
  return m ? m[1].toUpperCase() : null;
};

// Muelle de carga: en la fachada de la Ctra. de Ripollet, junto a «Listos para salir».
export const DOCK = { label: "Muelle de carga", rect: { x: 0, z: -63, w: 9, d: 9 } };

// Vistas de cámara: posición y punto al que mira. Los botones del 3D vuelan de una a otra.
export const VIEWS = {
  general: { label: "General", pos: [38, 42, 30], target: [-15, 0, -30] },
  fabrica: { label: "Fábrica", pos: [16, 26, -16], target: [-15, 0, -45] },
  almacen: { label: "Almacén", pos: [-8, 13, -38], target: [-23, 1.5, -58] },
  showroom: { label: "Showroom", pos: [14, 9, 16], target: [-14, 1.5, -12] },
  muelle: { label: "Muelle", pos: [24, 8, -46], target: [3, 1, -59] },
} as const satisfies Record<string, { label: string; pos: readonly [number, number, number]; target: readonly [number, number, number] }>;
export type ViewKey = keyof typeof VIEWS;
