import "server-only";
import { sql } from "./db";
import { FACTORY_ZONES, isFactoryZone, SHELVES, shelfOf } from "./naves";
import { stockLevel } from "./stock";

export type ZoneKitchen = { id: number; title: string; client: string; lacado: boolean; done: number; total: number; install: string | null };
export type ShelfItem = { id: number; name: string; qty: number; min: number; unit: string; level: "bien" | "bajo" | "agotado" };
export type NavesData = {
  zones: Record<string, ZoneKitchen[]>;
  unplaced: ZoneKitchen[];               // en fábrica pero sin zona asignada
  shelves: Record<string, ShelfItem[]>;
  unshelved: number;                     // materiales sin estantería
  dock: { id: number; title: string; client: string; install: string | null; phase: string; installer: string | null }[];
  showroom: { phase: string; n: number }[];
};

/** Lo que pinta el 3D: dónde está cada cocina, cómo está cada estantería y qué sale por el muelle. */
export async function loadNavesData(): Promise<NavesData> {
  const [kitchens, stock, dock, showroom] = await Promise.all([
    sql`select k.id, k.title, c.name as client, k.phase, k.factory_zone, k.install_date::text as install,
               exists (select 1 from kitchen_zones z where z.kitchen_id = k.id and z.finish ~* 'lac') as lacado,
               (select coalesce(sum(qty), 0)::int from kitchen_items i where i.kitchen_id = k.id and i.kind = 'mueble' and i.status = 'hecho') as done,
               (select coalesce(sum(qty), 0)::int from kitchen_items i where i.kitchen_id = k.id and i.kind = 'mueble') as total
        from kitchens k join clients c on c.id = k.client_id
        where k.phase in ('aceptada', 'frentes', 'fabrica', 'lista')
        order by k.install_date nulls last, k.id`,
    sql`select id, name, qty, min_qty, unit, location from stock_items where active order by name`,
    // Entregas de los próximos 7 días (y las listas sin fecha).
    sql`select k.id, k.title, c.name as client, k.install_date::text as install, k.phase, i.name as installer
        from kitchens k join clients c on c.id = k.client_id left join installers i on i.id = k.installer_id
        where k.phase in ('lista', 'montaje') and (k.install_date is null or k.install_date <= current_date + 7)
        order by k.install_date nulls last`,
    sql`select phase, count(*)::int as n from kitchens where phase in ('contacto', 'medicion', 'diseno') group by phase`,
  ]);

  const zones: Record<string, ZoneKitchen[]> = Object.fromEntries(FACTORY_ZONES.map((z) => [z.key, []]));
  const unplaced: ZoneKitchen[] = [];
  for (const k of kitchens) {
    const item: ZoneKitchen = { id: k.id, title: k.title, client: k.client, lacado: k.lacado, done: k.done, total: k.total, install: k.install };
    // Una cocina «Lista» está en su zona aunque nadie la haya movido.
    const zone = k.phase === "lista" ? "listos" : k.factory_zone;
    if (zone && isFactoryZone(zone)) zones[zone].push(item);
    // Aceptada o esperando frentes sin zona: aún no ha entrado en la nave. En fábrica sin zona: falta decir dónde está.
    else if (k.phase === "fabrica") unplaced.push(item);
  }

  const shelves: Record<string, ShelfItem[]> = Object.fromEntries(SHELVES.map((s) => [s.key, []]));
  let unshelved = 0;
  for (const s of stock) {
    const shelf = shelfOf(s.location);
    if (!shelf || !shelves[shelf]) { unshelved++; continue; }
    shelves[shelf].push({ id: s.id, name: s.name, qty: s.qty, min: s.min_qty, unit: s.unit, level: stockLevel(s.qty, s.min_qty).key });
  }

  return {
    zones, unplaced, shelves, unshelved,
    dock: dock.map((d) => ({ id: d.id, title: d.title, client: d.client, install: d.install, phase: d.phase, installer: d.installer })),
    showroom: showroom.map((s) => ({ phase: s.phase, n: s.n })),
  };
}
