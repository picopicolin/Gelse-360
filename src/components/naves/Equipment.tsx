"use client";

import { useMemo } from "react";
import type { Rect } from "@/lib/naves";
import type { ZoneKitchen } from "@/lib/naves-data";
import { woodTex } from "./textures";

// Maquinaria y mobiliario de la fábrica, palés con las cocinas, estanterías del almacén y vehículos.
// Todo con piezas sencillas pero con proporciones y colores de fábrica de verdad.

const STEEL = { color: "#d5d8db", metalness: 0.45, roughness: 0.4 } as const;
const DARK = { color: "#3a3f45", metalness: 0.5, roughness: 0.45 } as const;
const ACCENT = { color: "#2f6f9f", metalness: 0.3, roughness: 0.45 } as const; // azul de máquina
const SAFETY = { color: "#f2b632", roughness: 0.5 } as const;

type V3 = [number, number, number];
const Box = ({ p, s, m, cast = true }: { p: V3; s: V3; m: Record<string, unknown>; cast?: boolean }) => (
  <mesh position={p} castShadow={cast} receiveShadow><boxGeometry args={s} /><meshStandardMaterial {...m} /></mesh>
);

/** Pila de tableros (melamina/MDF) sobre tacos. */
export function BoardStack({ p, n = 12, color = "#efe9df", size = [2.8, 2.07] }: { p: V3; n?: number; color?: string; size?: [number, number] }) {
  return (
    <group position={p}>
      <Box p={[0, 0.06, 0]} s={[size[0] * 0.9, 0.12, size[1] * 0.9]} m={{ color: "#8a6a48" }} />
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} p={[0, 0.13 + i * 0.021, 0]} s={[size[0], 0.019, size[1]]} m={{ color: i % 2 ? color : "#e4ddd1", roughness: 0.7 }} cast={i === n - 1} />
      ))}
    </group>
  );
}

/** Seccionadora: mesa de alimentación con tableros, viga de corte y mesas de salida con rodillos. */
function PanelSaw({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.45, -1.4]} s={[4.4, 0.9, 2.2]} m={STEEL} />
      <BoardStack p={[0, 0.9, -1.4]} n={8} size={[4.1, 2]} />
      {/* Viga de presión y carro de sierra */}
      <Box p={[0, 1.15, 0]} s={[4.8, 0.5, 0.6]} m={ACCENT} />
      <Box p={[2.6, 0.9, 0]} s={[0.5, 1.8, 0.8]} m={DARK} />
      <Box p={[-2.75, 1.1, 0.2]} s={[0.4, 0.6, 0.3]} m={{ color: "#1d2024" }} />
      {/* Mesas de salida (colchón de aire) */}
      {[-1.5, 0, 1.5].map((x) => <Box key={x} p={[x, 0.45, 1.4]} s={[1.3, 0.9, 2]} m={{ color: "#e8eaec", roughness: 0.3 }} />)}
    </group>
  );
}

/** Canteadora: cuerpo largo, cinta de arrastre, carenado de cristal y mesa de entrada. */
function EdgeBander({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.5, 0]} s={[9, 1, 1.1]} m={STEEL} />
      <Box p={[0, 1.05, 0.2]} s={[9, 0.1, 0.6]} m={{ color: "#1f2226" }} />
      <mesh position={[0.4, 1.45, -0.15]}><boxGeometry args={[7.6, 0.8, 0.8]} /><meshStandardMaterial color="#cfe0ea" transparent opacity={0.35} roughness={0.05} /></mesh>
      <Box p={[0.4, 1.9, -0.15]} s={[7.6, 0.06, 0.82]} m={ACCENT} />
      <Box p={[-5.2, 0.45, 0.35]} s={[1.4, 0.9, 1.6]} m={{ color: "#e8eaec" }} />
      <Box p={[4.8, 1.2, -0.7]} s={[0.5, 0.8, 0.15]} m={{ color: "#1d2024" }} />
      {/* Rollo de canto */}
      <mesh position={[-3.6, 1.25, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.35, 0.35, 0.05, 24]} /><meshStandardMaterial color="#f5f1ea" /></mesh>
    </group>
  );
}

/** CNC: mesa de vacío, pórtico con cabezal y topes de seguridad. */
function Cnc({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.4, 0]} s={[6.2, 0.8, 2.4]} m={DARK} />
      <Box p={[0, 0.82, 0]} s={[6, 0.04, 2.2]} m={{ color: "#17191c", roughness: 0.9 }} />
      <Box p={[0.4, 0.86, 0]} s={[2.8, 0.02, 2]} m={{ color: "#efe9df" }} />
      {/* Pórtico */}
      <Box p={[-0.6, 1.5, -1.35]} s={[0.4, 2.2, 0.35]} m={ACCENT} />
      <Box p={[-0.6, 1.5, 1.35]} s={[0.4, 2.2, 0.35]} m={ACCENT} />
      <Box p={[-0.6, 2.5, 0]} s={[0.45, 0.45, 3]} m={ACCENT} />
      <Box p={[-0.6, 1.9, 0.3]} s={[0.6, 0.9, 0.55]} m={STEEL} />
      <mesh position={[-0.6, 1.3, 0.3]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.4, 12]} /><meshStandardMaterial color="#888" metalness={0.8} /></mesh>
      {/* Topes amarillos */}
      <Box p={[0, 0.5, 1.45]} s={[6.4, 0.12, 0.1]} m={SAFETY} />
      <Box p={[0, 0.5, -1.45]} s={[6.4, 0.12, 0.1]} m={SAFETY} />
      {/* Armario eléctrico */}
      <Box p={[3.6, 1, -0.9]} s={[0.6, 2, 0.5]} m={{ color: "#c9ccd0" }} />
    </group>
  );
}

/** Cabina de lacado: recinto abierto por delante, filtros al fondo, luz interior y conducto de extracción. */
function PaintBooth({ p }: { p: V3 }) {
  const W = 5, H = 3.2, D = 3.6;
  return (
    <group position={p}>
      <Box p={[0, H / 2, -D / 2]} s={[W, H, 0.1]} m={{ color: "#bfc4c9" }} />
      {/* Filtros del fondo */}
      {[-1.6, 0, 1.6].map((x) => <Box key={x} p={[x, 1.4, -D / 2 + 0.08]} s={[1.4, 2, 0.05]} m={{ color: "#e9e3cf", roughness: 1 }} cast={false} />)}
      <Box p={[-W / 2, H / 2, 0]} s={[0.1, H, D]} m={{ color: "#f1f2f3" }} />
      <Box p={[W / 2, H / 2, 0]} s={[0.1, H, D]} m={{ color: "#f1f2f3" }} />
      <Box p={[0, H, 0]} s={[W, 0.12, D]} m={{ color: "#f1f2f3" }} />
      <mesh position={[0, H - 0.1, 0]}><boxGeometry args={[W - 0.6, 0.04, 0.4]} /><meshStandardMaterial color="#ffffff" emissive="#f4f8ff" emissiveIntensity={1.4} /></mesh>
      {/* Conducto de extracción hacia el tejado */}
      <mesh position={[1.6, H + 0.9, -1]} castShadow><cylinderGeometry args={[0.35, 0.35, 1.8, 20]} /><meshStandardMaterial color="#c3c8cd" metalness={0.7} roughness={0.3} /></mesh>
      {/* Mueble lacándose dentro, sobre caballetes */}
      <Box p={[0, 0.9, 0]} s={[1.6, 0.05, 0.6]} m={{ color: "#fbfaf7", roughness: 0.15 }} />
      {[-0.6, 0.6].map((x) => <Box key={x} p={[x, 0.45, 0]} s={[0.08, 0.9, 0.5]} m={DARK} />)}
    </group>
  );
}

/** Mesa de trabajo de montaje: tablero de madera sobre patas de acero, con un mueble a medio montar. */
function Workbench({ p, withCabinet = true }: { p: V3; withCabinet?: boolean }) {
  const top = useMemo(() => woodTex("#b48a5e"), []);
  return (
    <group position={p}>
      <mesh position={[0, 0.88, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 0.06, 1.3]} /><meshStandardMaterial map={top} roughness={0.7} /></mesh>
      {[[-1.2, -0.55], [1.2, -0.55], [-1.2, 0.55], [1.2, 0.55]].map(([x, z]) => <Box key={`${x}${z}`} p={[x, 0.43, z]} s={[0.06, 0.86, 0.06]} m={DARK} />)}
      <Box p={[0, 0.25, 0]} s={[2.4, 0.04, 1.1]} m={DARK} />
      {withCabinet && (
        <group position={[0.2, 0.91, 0]}>
          {/* Casco abierto: laterales, fondo y base */}
          <Box p={[-0.3, 0.36, 0]} s={[0.019, 0.72, 0.56]} m={{ color: "#f3efe8" }} />
          <Box p={[0.3, 0.36, 0]} s={[0.019, 0.72, 0.56]} m={{ color: "#f3efe8" }} />
          <Box p={[0, 0.01, 0]} s={[0.6, 0.019, 0.56]} m={{ color: "#f3efe8" }} />
          <Box p={[0, 0.36, -0.27]} s={[0.6, 0.72, 0.01]} m={{ color: "#e6e0d6" }} />
        </group>
      )}
    </group>
  );
}

/** Mesa de embalar con el rollo de film. */
function PackingStation({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.45, 0]} s={[3, 0.9, 1.6]} m={{ color: "#9aa3ac" }} />
      <Box p={[0, 0.92, 0]} s={[3, 0.04, 1.6]} m={{ color: "#5b6168" }} />
      <mesh position={[2, 0.6, 0]} castShadow><cylinderGeometry args={[0.18, 0.18, 1.2, 20]} /><meshStandardMaterial color="#e9f1f5" transparent opacity={0.8} /></mesh>
      <Box p={[2, 0.6, 0]} s={[0.04, 1.2, 0.04]} m={DARK} />
    </group>
  );
}

/** Máquinas y mobiliario de cada zona, colocados dentro de su rectángulo. */
export function ZoneEquipment({ zone, rect }: { zone: string; rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const top = rect.z + 2.6;
  switch (zone) {
    case "corte": return <PanelSaw p={[cx - 1, 0, top + 0.6]} />;
    case "canteado": return <EdgeBander p={[cx, 0, top]} />;
    case "mecanizado": return <Cnc p={[cx - 1, 0, top + 0.6]} />;
    case "lacado": return <PaintBooth p={[cx - 3, 0, top + 0.4]} />;
    case "montaje": return <>{[0, 1, 2].map((i) => <Workbench key={i} p={[rect.x + 2.3 + i * 4.2, 0, top]} withCabinet={i !== 1} />)}</>;
    case "embalaje": return <PackingStation p={[cx - 2, 0, top - 0.6]} />;
    case "almacen": return <><BoardStack p={[rect.x + 3, 0, rect.z + rect.d - 2.2]} n={30} /><BoardStack p={[rect.x + 6.4, 0, rect.z + rect.d - 2.2]} n={18} color="#d8c3a5" /></>;
    default: return null;
  }
}

// ── Cocinas sobre palé ─────────────────────────────────────────────────

/** Una cocina en fábrica: palé con sus muebles apilados. Los hechos van envueltos en film; los pendientes, en casco. */
export function KitchenPallet({ k, p }: { k: ZoneKitchen; p: V3 }) {
  const pallet = useMemo(() => woodTex("#a07850"), []);
  const shown = Math.max(2, Math.min(k.total || 2, 12));
  const done = k.total ? Math.round((k.done / k.total) * shown) : 0;
  const carcass = k.lacado ? { color: "#fbfaf7", roughness: 0.18 } : { color: "#ede5d8", roughness: 0.6 };
  return (
    <group position={p}>
      {/* Palé de 1,2 × 0,8 m (doble, para una cocina) */}
      {[-0.55, 0, 0.55].map((z) => <mesh key={z} position={[0, 0.07, z]} castShadow receiveShadow><boxGeometry args={[2.4, 0.14, 0.16]} /><meshStandardMaterial map={pallet} /></mesh>)}
      {[-1.1, 0, 1.1].map((x) => <mesh key={x} position={[x, 0.15, 0]} castShadow><boxGeometry args={[0.15, 0.04, 1.3]} /><meshStandardMaterial map={pallet} /></mesh>)}
      {Array.from({ length: shown }, (_, i) => {
        // 8 muebles por capa: 4 a lo largo del palé y 2 filas.
        const layer = Math.floor(i / 8), slot = i % 8;
        const x = -0.93 + (slot % 4) * 0.62;
        const z = slot < 4 ? -0.3 : 0.3;
        const wrapped = i < done;
        return (
          <group key={i} position={[x, 0.53 + layer * 0.76, z]}>
            <mesh castShadow><boxGeometry args={[0.6, 0.72, 0.56]} /><meshStandardMaterial {...carcass} /></mesh>
            {wrapped && <mesh><boxGeometry args={[0.63, 0.75, 0.59]} /><meshStandardMaterial color="#eef6fb" transparent opacity={0.55} roughness={0.08} metalness={0.1} /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

// ── Almacén ────────────────────────────────────────────────────────────

/** Estantería de palés: puntales azules, largueros naranjas, 3 alturas, con material y un cartel del color de su stock. */
export function PalletRack({ p, items, color, highlight }: { p: V3; items: number; color: string; highlight: number }) {
  const H = 5.4, W = 2.8, D = 1.1;
  const levels = [0.15, 1.9, 3.65];
  const slots = levels.length * 2;
  const filled = Math.min(slots, items === 0 ? 0 : Math.max(1, Math.round(items * 1.5)));
  return (
    <group position={p}>
      {[[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, H / 2, z]} s={[0.09, H, 0.07]} m={{ color: "#1f4f8f", metalness: 0.4, roughness: 0.5 }} />
      ))}
      {[-W / 2, W / 2].map((x) => [0.9, 2.7, 4.5].map((y) => (
        <Box key={`d${x}${y}`} p={[x, y, 0]} s={[0.04, 0.04, D]} m={{ color: "#1f4f8f" }} cast={false} />
      )))}
      {levels.map((y) => [-D / 2, D / 2].map((z) => (
        <Box key={`b${y}${z}`} p={[0, y + 0.06, z]} s={[W, 0.12, 0.06]} m={{ color: "#e8742a", roughness: 0.5 }} />
      )))}
      {Array.from({ length: filled }, (_, i) => {
        const y = levels[Math.floor(i / 2)] + 0.13;
        const x = i % 2 ? 0.68 : -0.68;
        return (
          <group key={i} position={[x, y, 0]}>
            <Box p={[0, 0.07, 0]} s={[1.2, 0.14, 0.8]} m={{ color: "#9a7652" }} />
            <Box p={[0, 0.55, 0]} s={[1.1, 0.82, 0.75]} m={{ color: i % 3 === 2 ? "#e8e1d4" : "#c9a77a", roughness: 0.9 }} />
          </group>
        );
      })}
      {/* Cartel superior con el color del stock (se ve de lejos) */}
      <mesh position={[0, H + 0.45, 0]} castShadow>
        <boxGeometry args={[W, 0.7, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35 + highlight * 0.5} />
      </mesh>
      {/* Marca en el suelo del mismo color */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W + 0.4, D + 0.4]} /><meshStandardMaterial color={color} transparent opacity={0.25 + highlight * 0.3} /></mesh>
    </group>
  );
}

/** Carretilla elevadora. */
export function Forklift({ p, rot = 0 }: { p: V3; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.65, 0]} s={[1.1, 0.9, 1.9]} m={{ color: "#f0a020", roughness: 0.5 }} />
      <Box p={[0, 1.25, 0.55]} s={[1.05, 0.3, 0.8]} m={{ color: "#2c2f33" }} />
      {/* Cabina de protección */}
      {[[-0.5, -0.1], [0.5, -0.1], [-0.5, 0.75], [0.5, 0.75]].map(([x, z]) => <Box key={`${x}${z}`} p={[x, 1.65, z]} s={[0.06, 1.3, 0.06]} m={{ color: "#2c2f33" }} />)}
      <Box p={[0, 2.3, 0.33]} s={[1.1, 0.06, 1]} m={{ color: "#2c2f33" }} />
      {/* Mástil y horquillas */}
      <Box p={[-0.3, 1.4, -1.05]} s={[0.1, 2.6, 0.12]} m={DARK} />
      <Box p={[0.3, 1.4, -1.05]} s={[0.1, 2.6, 0.12]} m={DARK} />
      {[-0.25, 0.25].map((x) => <Box key={x} p={[x, 0.12, -1.6]} s={[0.12, 0.05, 1.1]} m={DARK} />)}
      {[[-0.55, -0.6], [0.55, -0.6], [-0.55, 0.65], [0.55, 0.65]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.25, 20]} /><meshStandardMaterial color="#1b1b1b" roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

/** Furgoneta de montador (tipo gran volumen). */
export function Van({ p, rot = 0 }: { p: V3; rot?: number }) {
  const white = { color: "#f6f6f4", metalness: 0.25, roughness: 0.35 };
  const glass = { color: "#1f2a33", metalness: 0.6, roughness: 0.1 };
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 1.35, 0.5]} s={[2, 2.1, 4]} m={white} />
      <Box p={[0, 1.05, -2.05]} s={[2, 1.5, 1.2]} m={white} />
      <mesh position={[0, 1.75, -2.25]} rotation={[-0.45, 0, 0]} castShadow><boxGeometry args={[1.98, 0.05, 1.1]} /><meshStandardMaterial {...white} /></mesh>
      <Box p={[0, 1.45, -2.66]} s={[1.85, 0.75, 0.04]} m={glass} cast={false} />
      {[-1.01, 1.01].map((x) => <Box key={x} p={[x, 1.5, -1.95]} s={[0.03, 0.6, 0.9]} m={glass} cast={false} />)}
      <Box p={[0, 0.55, -2.66]} s={[2, 0.3, 0.08]} m={{ color: "#3a3d42" }} />
      {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.85, -2.67]}><boxGeometry args={[0.35, 0.15, 0.03]} /><meshStandardMaterial color="#fffbe6" emissive="#fff3c0" emissiveIntensity={0.6} /></mesh>)}
      {[[-0.95, -1.75], [0.95, -1.75], [-0.95, 1.65], [0.95, 1.65]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.38, 0.38, 0.28, 24]} /><meshStandardMaterial color="#161616" roughness={0.85} /></mesh>
      ))}
    </group>
  );
}

/** Coche aparcado (para dar vida a la calle). */
export function Car({ p, rot = 0, color }: { p: V3; rot?: number; color: string }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.55, 0]} s={[1.8, 0.6, 4.2]} m={{ color, metalness: 0.5, roughness: 0.3 }} />
      <Box p={[0, 1.08, 0.2]} s={[1.6, 0.5, 2.2]} m={{ color: "#20272e", metalness: 0.6, roughness: 0.1 }} />
      {[[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.22, 16]} /><meshStandardMaterial color="#151515" /></mesh>
      ))}
    </group>
  );
}

// ── Operarios ──────────────────────────────────────────────────────────

const SKIN = ["#e0b899", "#c99a77", "#a8775a", "#edc7a8"];

/** Operario de pie trabajando (mira hacia +z): pantalón de trabajo, camiseta, chaleco reflectante y brazos hacia delante.
 *  El de lacado va con mono blanco y mascarilla. */
export function Worker({ p, rot = 0, seed = 0, painter = false }: { p: V3; rot?: number; seed?: number; painter?: boolean }) {
  const skin = SKIN[seed % SKIN.length];
  const legs = painter ? "#eeeeec" : "#2b3442";
  const body = painter ? "#f2f2f0" : seed % 2 ? "#3b4350" : "#4a3f36";
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {[-0.1, 0.1].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.45, 0]} castShadow><capsuleGeometry args={[0.075, 0.68, 4, 10]} /><meshStandardMaterial color={legs} roughness={0.9} /></mesh>
          <mesh position={[x, 0.05, 0.05]} castShadow><boxGeometry args={[0.13, 0.1, 0.28]} /><meshStandardMaterial color="#1d1d1d" /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.17, 0]} castShadow><capsuleGeometry args={[0.18, 0.4, 4, 12]} /><meshStandardMaterial color={body} roughness={0.85} /></mesh>
      {!painter && (
        <group position={[0, 1.15, 0]}>
          <mesh><capsuleGeometry args={[0.19, 0.3, 4, 12]} /><meshStandardMaterial color="#e9d21f" roughness={0.7} /></mesh>
          {[0.02, -0.12].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.195, 0.195, 0.035, 12]} /><meshStandardMaterial color="#d8dde2" metalness={0.5} roughness={0.3} /></mesh>)}
        </group>
      )}
      {/* Brazos hacia delante, como manejando la máquina o la pieza */}
      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, 1.36, 0]} rotation={[-1.1, 0, x > 0 ? -0.15 : 0.15]}>
          <mesh position={[0, -0.24, 0]} castShadow><capsuleGeometry args={[0.055, 0.42, 4, 8]} /><meshStandardMaterial color={body} roughness={0.85} /></mesh>
          <mesh position={[0, -0.5, 0]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={painter ? "#3a6fb0" : skin} /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.055, 0.06, 0.1, 10]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[0, 1.73, 0]} castShadow><sphereGeometry args={[0.115, 16, 12]} /><meshStandardMaterial color={skin} roughness={0.7} /></mesh>
      {/* Pelo, o capucha y mascarilla en el de lacado */}
      <mesh position={[0, 1.77, -0.015]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={painter ? "#f2f2f0" : seed % 3 ? "#2a211b" : "#6b5743"} roughness={0.9} /></mesh>
      {painter && <mesh position={[0, 1.69, 0.09]}><boxGeometry args={[0.13, 0.08, 0.06]} /><meshStandardMaterial color="#5a6066" /></mesh>}
      {/* Cascos de protección auditiva (en las máquinas hace ruido) */}
      {!painter && [-0.12, 0.12].map((x) => <mesh key={x} position={[x, 1.73, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.04, 12]} /><meshStandardMaterial color="#d6402f" /></mesh>)}
    </group>
  );
}

/** Dónde trabaja cada operario, según la máquina de su zona. */
export function ZoneWorkers({ zone, rect }: { zone: string; rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const top = rect.z + 2.6;
  switch (zone) {
    case "corte": return <Worker p={[cx - 1.6, 0, top - 2.3]} seed={0} />;
    case "canteado": return <><Worker p={[cx - 5.2, 0, top + 1.45]} rot={Math.PI} seed={1} /><Worker p={[cx + 3.8, 0, top + 1.3]} rot={Math.PI + 0.4} seed={2} /></>;
    case "mecanizado": return <Worker p={[cx + 1.6, 0, top + 2.4]} rot={Math.PI - 0.3} seed={3} />;
    case "lacado": return <Worker p={[cx - 3, 0, top + 1.5]} rot={Math.PI} seed={1} painter />;
    case "montaje": return <><Worker p={[rect.x + 2.5, 0, top + 1]} rot={Math.PI} seed={2} /><Worker p={[rect.x + 10.7, 0, top + 1]} rot={Math.PI + 0.2} seed={0} /></>;
    case "embalaje": return <Worker p={[cx - 2.4, 0, top + 0.6]} rot={Math.PI} seed={3} />;
    case "almacen": return <Worker p={[rect.x + 9.5, 0, rect.z + rect.d - 4]} rot={-2.2} seed={1} />;
    default: return null;
  }
}
