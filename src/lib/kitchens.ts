import "server-only";
import { sql } from "./db";

/** Datos para el formulario de cocina: clientes, interioristas ya usados (para autocompletar) y montadores. */
export async function kitchenFormData() {
  const [clients, designers, installers] = await Promise.all([
    sql<{ id: number; name: string }[]>`select id, name from clients order by lower(name)`,
    sql`select distinct designer from kitchens where designer is not null order by designer`,
    sql<{ id: number; name: string }[]>`select id, name from installers where active order by name`,
  ]);
  return { clients: [...clients], designers: designers.map((d) => d.designer as string), installers: [...installers] };
}
