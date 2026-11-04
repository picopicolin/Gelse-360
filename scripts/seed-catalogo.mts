// Catálogo básico de muebles estándar (propuesta inicial: medidas habituales en cocina, a corregir con Gelse).
// Idempotente: si el código ya existe no lo toca. Uso: npm run db:catalogo
import postgres from "postgres";
import { scriptDbUrl } from "./db-url.mts";

type T = { code: string; family: string; name: string; width: number; height: number; depth: number; notes?: string };

// Supuesto: cuerpo bajo 72 cm de alto (+ patas), fondo 56; altos 70 o 90 de alto, fondo 35; columnas 216 de alto.
const BAJO = { h: 72, d: 56 };
const ALTO = { d: 35 };
const COL = { h: 216, d: 56 };

const rows: T[] = [
  ...[15, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 120].map((w) => ({
    code: `B${w}`, family: "bajo", name: `Bajo ${w} ${w <= 60 ? "1 puerta" : "2 puertas"}`, width: w, height: BAJO.h, depth: BAJO.d,
    notes: w <= 20 ? "Botellero / especiero" : undefined,
  })),
  ...[60, 80, 90, 100, 120].map((w) => ({ code: `BF${w}`, family: "fregadero", name: `Bajo fregadero ${w}`, width: w, height: BAJO.h, depth: BAJO.d })),
  ...[40, 45, 50, 60, 70, 80, 90, 100, 120].map((w) => ({ code: `BC${w}-3`, family: "cajonero", name: `Cajonero ${w} 3 cajones`, width: w, height: BAJO.h, depth: BAJO.d })),
  ...[60, 80, 90, 120].map((w) => ({ code: `BC${w}-2`, family: "cajonero", name: `Cajonero ${w} 2 cajones`, width: w, height: BAJO.h, depth: BAJO.d })),
  ...[60, 80, 90].map((w) => ({ code: `BP${w}`, family: "cajonero", name: `Bajo placa ${w} (cajones)`, width: w, height: BAJO.h, depth: BAJO.d })),
  ...[90, 100, 110, 120].map((w) => ({ code: `BE${w}`, family: "esquina", name: `Bajo rincón ${w}`, width: w, height: BAJO.h, depth: BAJO.d })),
  ...[45, 60].map((w) => ({ code: `LV${w}`, family: "lavavajillas", name: `Frente lavavajillas ${w}`, width: w, height: BAJO.h, depth: 2, notes: "Solo frente, sin cuerpo" })),
  ...[30, 40, 45, 50, 60, 70, 80, 90, 100, 120].map((w) => ({
    code: `A${w}`, family: "alto", name: `Alto ${w} ${w <= 60 ? "1 puerta" : "2 puertas"}`, width: w, height: 70, depth: ALTO.d,
  })),
  ...[40, 60, 80, 90].map((w) => ({ code: `A${w}-90`, family: "alto", name: `Alto ${w} de 90 alto`, width: w, height: 90, depth: ALTO.d })),
  ...[60, 80, 90, 120].map((w) => ({ code: `AB${w}`, family: "abatible", name: `Alto abatible ${w}`, width: w, height: 40, depth: ALTO.d })),
  ...[60, 90].map((w) => ({ code: `AC${w}`, family: "alto", name: `Alto campana ${w}`, width: w, height: 40, depth: ALTO.d })),
  { code: "AE60", family: "esquina", name: "Alto rincón 60×60", width: 60, height: 70, depth: ALTO.d },
  { code: "CH60", family: "columna", name: "Columna horno 60", width: 60, height: COL.h, depth: COL.d },
  { code: "CHM60", family: "columna", name: "Columna horno + microondas 60", width: 60, height: COL.h, depth: COL.d },
  { code: "CN60", family: "columna", name: "Columna nevera integrable 60", width: 60, height: COL.h, depth: COL.d },
  ...[40, 45, 50, 60].map((w) => ({ code: `CD${w}`, family: "columna", name: `Columna despensa ${w}`, width: w, height: COL.h, depth: COL.d })),
  ...[30, 40].map((w) => ({ code: `CE${w}`, family: "columna", name: `Columna escobero ${w}`, width: w, height: COL.h, depth: COL.d })),
];

const sql = postgres(scriptDbUrl(), { prepare: false });
const values = rows.map((r) => ({ ...r, notes: r.notes ?? null }));
const res = await sql`insert into cabinet_types ${sql(values)} on conflict (code) do nothing returning id`;
console.log(`Catálogo: ${res.length} muebles nuevos (de ${rows.length}).`);
await sql.end();
