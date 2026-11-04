"use client";

import { useMemo } from "react";
import { BUILDINGS, type Rect } from "@/lib/naves";
import { FactoryServices, ShowroomRoofUnits } from "./Industrial";
import { concreteNormal, concreteTex, metalNormal, metalPanelTex, showroomFloorTex, signTex, woodTex } from "./textures";

// Arquitectura: naves de chapa con tejado de dientes de sierra, pilares de acero, puertas y el showroom de cristal.
// Sin tejado, las paredes se cortan a 4,5 m (como una maqueta seccionada) para ver el interior.

export const CUT_HEIGHT = 4.5;
const T = 0.3; // grosor de pared

type Opening = { from: number; to: number; top: number; kind?: "rollup" | "door" };

/** Una pared recta de a a b (en planta), con zócalo de hormigón, chapa encima y huecos (puertas). */
export function Wall({ a, b, height, openings = [], windows = false }: { a: [number, number]; b: [number, number]; height: number; openings?: Opening[]; windows?: boolean }) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(-dz, dx);
  const plinth = 0.9;
  // Tramos macizos entre huecos
  const holes = [...openings].sort((p, q) => p.from - q.from);
  const solids: [number, number][] = [];
  let cur = 0;
  for (const h of holes) { if (h.from > cur) solids.push([cur, h.from]); cur = Math.max(cur, h.to); }
  if (cur < len) solids.push([cur, len]);
  const panel = metalPanelTex([Math.max(1, Math.round(len / 4)), 1]);
  // Ventana corrida a 2,6–3,6 m (típica de nave): por tramos macizos, con montantes cada 2,5 m.
  const winY = 3.1, winH = 1, showWin = windows && height > winY + winH / 2;
  return (
    <group position={[a[0], 0, a[1]]} rotation={[0, angle, 0]}>
      {showWin && solids.map(([s0, e0]) => {
        const w = e0 - s0 - 1.2;
        if (w < 2) return null;
        const n = Math.max(1, Math.round(w / 2.5));
        return (
          <group key={`w${s0}`} position={[s0 + 0.6 + w / 2, winY, 0]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0, 0, side * (T / 2 + 0.012)]}><planeGeometry args={[w, winH]} /><meshStandardMaterial color="#5f7585" roughness={0.08} metalness={0.6} side={2} /></mesh>
            ))}
            {Array.from({ length: n + 1 }, (_, i) => (
              <mesh key={i} position={[-w / 2 + (i * w) / n, 0, 0]}><boxGeometry args={[0.07, winH, T + 0.06]} /><meshStandardMaterial color="#d9dcdf" metalness={0.4} /></mesh>
            ))}
            <mesh position={[0, -winH / 2, 0]}><boxGeometry args={[w, 0.06, T + 0.12]} /><meshStandardMaterial color="#d9dcdf" /></mesh>
          </group>
        );
      })}
      {solids.map(([s, e]) => {
        const w = e - s;
        const rep: [number, number] = [Math.max(1, Math.round(w / 3)), 1];
        const tex = metalPanelTex(rep);
        return (
          <group key={s} position={[s + w / 2, 0, 0]}>
            <mesh position={[0, plinth / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, plinth, T + 0.06]} />
              <meshStandardMaterial color="#a9a69f" roughness={0.95} />
            </mesh>
            <mesh position={[0, plinth + (height - plinth) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, height - plinth, T]} />
              <meshStandardMaterial map={tex} normalMap={metalNormal(rep)} normalScale={[0.8, 0.8]} roughness={0.5} metalness={0.3} />
            </mesh>
          </group>
        );
      })}
      {holes.map((h) => {
        const w = h.to - h.from;
        const cx = h.from + w / 2;
        return (
          <group key={`h${h.from}`}>
            {h.top < height && (
              <mesh position={[cx, h.top + (height - h.top) / 2, 0]} castShadow>
                <boxGeometry args={[w, height - h.top, T]} />
                <meshStandardMaterial map={panel} roughness={0.55} metalness={0.25} />
              </mesh>
            )}
            {/* Marco de la puerta */}
            {[h.from, h.to].map((x) => (
              <mesh key={x} position={[x, Math.min(h.top, height) / 2, 0]}><boxGeometry args={[0.18, Math.min(h.top, height), T + 0.1]} /><meshStandardMaterial color="#e0a32a" /></mesh>
            ))}
            {/* Puerta enrollable abierta: el tambor arriba */}
            {h.kind === "rollup" && h.top <= height && (
              <mesh position={[cx, h.top - 0.25, 0.25]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.3, 0.3, w, 16]} /><meshStandardMaterial color="#8b9097" metalness={0.5} roughness={0.4} /></mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Pilares de acero (perfil IPE) por dentro de las paredes largas, cada 5 m. */
function Columns({ rect, height }: { rect: Rect; height: number }) {
  const cols: [number, number][] = [];
  for (let z = rect.z + 5; z < rect.z + rect.d - 0.5; z += 5) cols.push([rect.x + 0.35, z], [rect.x + rect.w - 0.35, z]);
  return (
    <>
      {cols.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, height / 2, z]}>
          <mesh castShadow><boxGeometry args={[0.32, height, 0.08]} /><meshStandardMaterial color="#5d6772" metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[0, 0, 0.14]} castShadow><boxGeometry args={[0.32, height, 0.04]} /><meshStandardMaterial color="#5d6772" metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[0, 0, -0.14]} castShadow><boxGeometry args={[0.32, height, 0.04]} /><meshStandardMaterial color="#5d6772" metalness={0.6} roughness={0.45} /></mesh>
        </group>
      ))}
    </>
  );
}

/** Tejado de dientes de sierra (como se ve en la foto aérea): faldón de chapa y lucernario de cristal mirando al norte. */
function SawtoothRoof({ rect, height }: { rect: Rect; height: number }) {
  const step = 5, rise = 2.2;
  const teeth = Math.floor(rect.d / step);
  const slope = Math.hypot(step, rise);
  const angle = Math.atan2(rise, step);
  const tex = metalPanelTex([Math.round(rect.w / 3), 1], "#b9bec4");
  return (
    <group>
      {Array.from({ length: teeth }, (_, i) => {
        const z0 = rect.z + i * step;
        return (
          <group key={i}>
            <mesh position={[rect.x + rect.w / 2, height + rise / 2, z0 + step / 2]} rotation={[angle, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[rect.w + 0.4, 0.12, slope]} />
              <meshStandardMaterial map={tex} normalMap={metalNormal([Math.round(rect.w / 3), 1])} roughness={0.45} metalness={0.4} />
            </mesh>
            <mesh position={[rect.x + rect.w / 2, height + rise / 2, z0]}>
              <boxGeometry args={[rect.w, rise, 0.06]} />
              <meshStandardMaterial color="#a8c4d2" transparent opacity={0.45} roughness={0.05} metalness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Coronación de la pared cortada: una banda oscura que se lee como «sección». */
function CutCap({ rect, height }: { rect: Rect; height: number }) {
  const { x, z, w, d } = rect;
  const caps: [number, number, number, number][] = [[x + w / 2, z, w, T], [x + w / 2, z + d, w, T], [x, z + d / 2, T, d], [x + w, z + d / 2, T, d]];
  return (
    <>
      {caps.map(([cx, cz, cw, cd], i) => (
        <mesh key={i} position={[cx, height + 0.03, cz]}><boxGeometry args={[cw + 0.02, 0.06, cd + 0.02]} /><meshStandardMaterial color="#2c2f33" /></mesh>
      ))}
    </>
  );
}

/** Detalles que dan vida: extintores en las paredes, bolardos en las puertas, contenedor y palés vacíos fuera. */
function FactoryDetails() {
  const ext: [number, number, number][] = [[-0.35, -40, 0], [-29.65, -44, Math.PI], [-14.65, -52, Math.PI], [-15.35, -38, 0], [-8, -63.65, Math.PI / 2], [-22, -63.65, Math.PI / 2]];
  const bollards: [number, number][] = [[0.9, -62.4], [0.9, -56.6], [-25.6, -65], [-21.1, -65]];
  return (
    <group>
      {ext.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 1.65, 0]}><boxGeometry args={[0.04, 0.5, 0.35]} /><meshStandardMaterial color="#d23a2e" /></mesh>
          <mesh position={[-0.12, 0.95, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.55, 14]} /><meshStandardMaterial color="#c8231b" roughness={0.35} /></mesh>
        </group>
      ))}
      {bollards.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 1, 12]} /><meshStandardMaterial color="#f2b632" /></mesh>
          {[0.35, 0.7].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.105, 0.105, 0.08, 12]} /><meshStandardMaterial color="#1d1d1d" /></mesh>)}
        </group>
      ))}
      {/* Contenedor de residuos de madera junto a la entrada de material */}
      <group position={[-10, 0, -65.9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[4, 1.6, 1.8]} /><meshStandardMaterial color="#2f6b46" metalness={0.3} roughness={0.6} /></mesh>
        <mesh position={[0, 1.4, 0]}><boxGeometry args={[3.9, 0.3, 1.7]} /><meshStandardMaterial color="#b98b5c" roughness={0.9} /></mesh>
      </group>
      {/* Palés vacíos apilados fuera del muelle */}
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[6.8, 0.08 + i * 0.15, -66.5]} castShadow><boxGeometry args={[1.2, 0.14, 0.8]} /><meshStandardMaterial color={i % 2 ? "#a07a52" : "#8f6b46"} /></mesh>)}
    </group>
  );
}

/** Las dos naves de la fábrica: suelo de hormigón, paredes con sus puertas, pilares y tejado. */
export function Factory({ roof }: { roof: boolean }) {
  const n1 = BUILDINGS.nave1, n2 = BUILDINGS.nave2;
  const h = roof ? n1.height : CUT_HEIGHT;
  const floor = useMemo(() => concreteTex([6, 8]), []);
  const floorN = useMemo(() => concreteNormal([6, 8]), []);
  const sign = useMemo(() => signTex(), []);
  return (
    <group>
      {/* Suelo continuo de las dos naves */}
      <mesh position={[n2.rect.x + 15, 0.02, n1.rect.z + 20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial map={floor} normalMap={floorN} normalScale={[0.4, 0.4]} roughness={0.32} metalness={0.05} />
      </mesh>
      {/* Fachada este (Ctra. de Ripollet): puerta enrollable del muelle y puerta de paso */}
      <Wall a={[0, -64]} b={[0, -24]} height={h} windows openings={[
        { from: 2, to: 7, top: 4.4, kind: "rollup" },
        { from: 30, to: 31.2, top: 2.2, kind: "door" },
      ]} />
      {/* Fachada oeste */}
      <Wall a={[-30, -24]} b={[-30, -64]} height={h} windows />
      {/* Fachada norte: entrada de material al almacén */}
      <Wall a={[-30, -64]} b={[0, -64]} height={h} windows openings={[{ from: 4, to: 8.5, top: 4.4, kind: "rollup" }]} />
      {/* Pared entre naves, con dos pasos */}
      <Wall a={[-15, -64]} b={[-15, -24]} height={h} openings={[{ from: 4, to: 8, top: 4, kind: "rollup" }, { from: 31, to: 36, top: 4, kind: "rollup" }]} />
      {/* Rótulo «gelse» en la fachada de la Ctra. de Ripollet, sobre el muelle */}
      <mesh position={[0.2, h - 0.9, -50]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3.4, 3.4]} /><meshStandardMaterial map={sign} transparent alphaTest={0.3} /></mesh>
      <FactoryDetails />
      <FactoryServices roof={roof} />
      <Columns rect={n1.rect} height={h} />
      <Columns rect={n2.rect} height={h} />
      {roof ? (<><SawtoothRoof rect={n1.rect} height={n1.height} /><SawtoothRoof rect={n2.rect} height={n2.height} /></>)
        : (<><CutCap rect={n1.rect} height={h} /><CutCap rect={n2.rect} height={h} /></>)}
    </group>
  );
}

// ── Showroom ───────────────────────────────────────────────────────────

const GLASS = { color: "#9fc3d3", transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.3 } as const;

/** Fachada de cristal recta con montantes cada 2,5 m. */
function GlassRun({ a, b, height }: { a: [number, number]; b: [number, number]; height: number }) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(len / 2.5));
  return (
    <group position={[a[0], 0, a[1]]} rotation={[0, Math.atan2(-dz, dx), 0]}>
      <mesh position={[len / 2, height / 2, 0]}><boxGeometry args={[len, height, 0.05]} /><meshStandardMaterial {...GLASS} /></mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[(i * len) / n, height / 2, 0]} castShadow><boxGeometry args={[0.08, height, 0.14]} /><meshStandardMaterial color="#2b2e33" metalness={0.6} roughness={0.35} /></mesh>
      ))}
      <mesh position={[len / 2, 0.05, 0]}><boxGeometry args={[len, 0.1, 0.2]} /><meshStandardMaterial color="#2b2e33" /></mesh>
    </group>
  );
}

/** Cocina de exposición: muebles bajos con encimera, columnas altas y, si toca, isla con taburetes. */
function DisplayKitchen({ x, z, rot = 0, front, top = "#3b3a38", island }: { x: number; z: number; rot?: number; front: string; top?: string; island?: boolean }) {
  const wood = useMemo(() => woodTex(front), [front]);
  const lacado = front.startsWith("#f") || front.startsWith("#e");
  const mat = lacado ? <meshStandardMaterial color={front} roughness={0.25} /> : <meshStandardMaterial map={wood} roughness={0.6} />;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Bancada de bajos */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[4.2, 0.9, 0.62]} />{mat}</mesh>
      <mesh position={[0, 0.93, 0.02]} castShadow><boxGeometry args={[4.3, 0.04, 0.66]} /><meshStandardMaterial color={top} roughness={0.3} /></mesh>
      {/* Columnas altas al fondo */}
      <mesh position={[2.9, 1.1, 0]} castShadow><boxGeometry args={[1.2, 2.2, 0.62]} />{mat}</mesh>
      {/* Altos */}
      <mesh position={[-0.6, 1.95, -0.14]} castShadow><boxGeometry args={[3, 0.7, 0.35]} />{mat}</mesh>
      {island && (
        <group position={[0, 0, 2.3]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 0.9, 1]} />{mat}</mesh>
          <mesh position={[0, 0.93, 0.15]} castShadow><boxGeometry args={[2.8, 0.05, 1.4]} /><meshStandardMaterial color={top} roughness={0.25} /></mesh>
          {[-0.8, 0, 0.8].map((sx) => (
            <group key={sx} position={[sx, 0, 1.2]}>
              <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.75, 8]} /><meshStandardMaterial color="#222" metalness={0.7} /></mesh>
              <mesh position={[0, 0.77, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.05, 20]} /><meshStandardMaterial color="#c9b49a" /></mesh>
            </group>
          ))}
          {/* Lámparas colgantes */}
          {[-0.7, 0.7].map((lx) => (
            <mesh key={lx} position={[lx, 2.3, 0.15]}><sphereGeometry args={[0.16, 20, 12]} /><meshStandardMaterial color="#fff6e5" emissive="#ffd9a0" emissiveIntensity={0.8} /></mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Showroom: nave de esquina con fachadas de cristal a las dos calles, esquina redondeada y rótulo. */
export function Showroom({ roof, selected, hover }: { roof: boolean; selected: boolean; hover: boolean }) {
  const { rect, height } = BUILDINGS.showroom;
  const floor = useMemo(() => showroomFloorTex([8, 7]), []);
  const sign = useMemo(() => signTex(), []);
  const R = 5; // radio de la esquina curva
  const arc = Array.from({ length: 7 }, (_, i) => {
    const t = (i / 6) * (Math.PI / 2);
    return [-R + R * Math.cos(t), -R + R * Math.sin(t)] as [number, number];
  });
  return (
    <group>
      <mesh position={[rect.x + rect.w / 2, 0.03, rect.z + rect.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[rect.w, rect.d]} />
        <meshStandardMaterial map={floor} roughness={0.18} metalness={0.05} color={selected ? "#fff3e0" : hover ? "#fffaf2" : "#ffffff"} />
      </mesh>
      {/* Paredes ciegas: oeste y la que da a la fábrica (con puerta de paso) */}
      <Wall a={[-30, 0]} b={[-30, -24]} height={roof ? height : CUT_HEIGHT} />
      <Wall a={[-30, -24]} b={[0, -24]} height={roof ? height : CUT_HEIGHT} openings={[{ from: 21, to: 23, top: 2.3, kind: "door" }]} />
      {/* Cristal a Beat Oriol (sur) y a la Ctra. de Ripollet (este), con la esquina curva */}
      <GlassRun a={[-30, 0]} b={[-R, 0]} height={height} />
      <GlassRun a={[0, -R]} b={[0, -24]} height={height} />
      {arc.slice(0, -1).map((p, i) => <GlassRun key={i} a={p} b={arc[i + 1]} height={height} />)}
      {/* Banda superior de fachada con el rótulo */}
      <mesh position={[-15 - R / 2, height - 0.6, 0.12]} castShadow><boxGeometry args={[30 - R, 1.2, 0.3]} /><meshStandardMaterial color="#f2efe9" roughness={0.6} /></mesh>
      <mesh position={[-14, height - 0.55, 0.3]}><planeGeometry args={[3.6, 3.6]} /><meshStandardMaterial map={sign} transparent alphaTest={0.3} /></mesh>
      <mesh position={[0.12, height - 0.6, -12 - R / 2]} castShadow><boxGeometry args={[0.3, 1.2, 24 - R]} /><meshStandardMaterial color="#f2efe9" roughness={0.6} /></mesh>
      <mesh position={[0.3, height - 0.55, -13]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3.6, 3.6]} /><meshStandardMaterial map={sign} transparent alphaTest={0.3} /></mesh>
      {roof && <ShowroomRoofUnits />}
      {roof && (
        <mesh position={[rect.x + rect.w / 2, height + 0.15, rect.z + rect.d / 2]} castShadow receiveShadow>
          <boxGeometry args={[rect.w, 0.3, rect.d]} /><meshStandardMaterial color="#cfcac2" />
        </mesh>
      )}
      {/* Cocinas de exposición */}
      <DisplayKitchen x={-23} z={-21} front="#7b5a3c" island />
      <DisplayKitchen x={-12} z={-21} front="#f1eee8" top="#d9d4cc" island />
      <DisplayKitchen x={-27.5} z={-9} rot={Math.PI / 2} front="#a9805a" />
      <DisplayKitchen x={-19} z={-12} front="#e8e2d8" top="#2b2a28" island />
      <DisplayKitchen x={-8} z={-12} front="#5a4632" top="#e6e1d8" />
      {/* Zona de espera con sofá y mesa, y plantas junto al cristal */}
      <group position={[-4, 0, -17]}>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[2.4, 0.45, 0.9]} /><meshStandardMaterial color="#6d6a66" roughness={0.9} /></mesh>
        <mesh position={[0, 0.65, -0.38]} castShadow><boxGeometry args={[2.4, 0.5, 0.18]} /><meshStandardMaterial color="#6d6a66" roughness={0.9} /></mesh>
        <mesh position={[0, 0.22, 1.2]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.04, 24]} /><meshStandardMaterial color="#b49470" /></mesh>
        <mesh position={[0, 0.1, 1.2]}><cylinderGeometry args={[0.05, 0.05, 0.2, 8]} /><meshStandardMaterial color="#222" /></mesh>
      </group>
      {[[-28.5, -1.5], [-16, -1.4], [-1.4, -21], [-2.6, -2.6], [-28.5, -22.5]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.28, 0.22, 0.6, 16]} /><meshStandardMaterial color="#e9e5de" /></mesh>
          <mesh position={[0, 1.1, 0]} castShadow><icosahedronGeometry args={[0.55, 1]} /><meshStandardMaterial color="#4f7a3e" flatShading /></mesh>
          <mesh position={[0.15, 1.6, 0.1]} castShadow><icosahedronGeometry args={[0.35, 1]} /><meshStandardMaterial color="#5e8a48" flatShading /></mesh>
        </group>
      ))}
      {/* Mostrador de recepción junto a la entrada */}
      <mesh position={[-6, 0.55, -4]} castShadow><boxGeometry args={[3, 1.1, 0.8]} /><meshStandardMaterial color="#2b2a28" roughness={0.4} /></mesh>
    </group>
  );
}
