"use client";

import { useMemo, useRef } from "react";
import type { Group } from "three";
import { useLive } from "./live";
import { asphaltNormal, asphaltTex, grassTex, metalNormal, metalPanelTex, sidewalkTex, stripesTex } from "./textures";
import { Car } from "./Equipment";

// Entorno según la vista aérea: c/ Beat Oriol al sur con mediana arbolada, Ctra. de Ripollet al este,
// rotonda en el cruce y naves vecinas del polígono Foinvasa detrás (al oeste y al norte).
// Delante de la cámara (sur y este) no se pone nada alto, para que no tape las naves de Gelse.

type V3 = [number, number, number];
type Tex = ReturnType<typeof asphaltTex>;

function Plane({ p, s, map, normal, color, rough = 0.92 }: { p: V3; s: [number, number]; map?: Tex; normal?: Tex; color?: string; rough?: number }) {
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial map={map} normalMap={normal} color={color} roughness={rough} />
    </mesh>
  );
}

/** Árbol de calle: tronco y copa de varios volúmenes con verdes distintos. */
function Tree({ p, s = 1, seed = 0 }: { p: V3; s?: number; seed?: number }) {
  const greens = ["#56743c", "#628447", "#4d6a37", "#6e8f4c"];
  const blobs: [number, number, number, number][] = [[0, 3.1, 0, 1.5], [0.7, 3.6, 0.3, 1.05], [-0.6, 3.5, -0.4, 1.1], [0.1, 4.2, -0.2, 0.9]];
  return (
    <group position={p} scale={s} rotation={[0, seed * 1.7, 0]}>
      <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 2.5, 8]} /><meshStandardMaterial color="#6b5440" roughness={0.95} /></mesh>
      {blobs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={greens[(i + seed) % 4]} roughness={0.9} flatShading /></mesh>
      ))}
    </group>
  );
}

/** Nave vecina: chapa con relieve, tejado gris y una franja de ventanas. */
function Neighbor({ p, s, color = "#b9bcbe", roof = "#7e858c" }: { p: V3; s: V3; color?: string; roof?: string }) {
  const rep: [number, number] = [Math.max(1, Math.round(s[0] / 4)), 1];
  return (
    <group position={p}>
      <mesh position={[0, s[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={s} />
        <meshStandardMaterial map={metalPanelTex(rep, color)} normalMap={metalNormal(rep)} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, s[1] + 0.1, 0]} receiveShadow><boxGeometry args={[s[0] + 0.3, 0.2, s[2] + 0.3]} /><meshStandardMaterial color={roof} roughness={0.7} /></mesh>
      <mesh position={[0, s[1] * 0.72, s[2] / 2 + 0.02]}><planeGeometry args={[s[0] * 0.8, 0.9]} /><meshStandardMaterial color="#3b4651" roughness={0.15} metalness={0.4} /></mesh>
    </group>
  );
}

/** Farola de calle. */
function StreetLight({ p, rot = 0 }: { p: V3; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <mesh position={[0, 3.5, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 7, 8]} /><meshStandardMaterial color="#5c636b" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0.7, 6.95, 0]}><boxGeometry args={[1.5, 0.08, 0.08]} /><meshStandardMaterial color="#5c636b" metalness={0.6} /></mesh>
      <mesh position={[1.35, 6.85, 0]}><boxGeometry args={[0.55, 0.12, 0.28]} /><meshStandardMaterial color="#3b4046" /></mesh>
    </group>
  );
}

/** Coche que circula por un carril y vuelve a empezar (sale y entra por donde ya lo tapa la niebla o la rotonda). */
function MovingCar({ from, to, speed, offset, color }: { from: V3; to: V3; speed: number; offset: number; color: string }) {
  const ref = useRef<Group>(null);
  const len = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const rot = Math.atan2(to[0] - from[0], to[2] - from[2]);
  const live = useLive((t) => {
    if (!ref.current) return;
    const k = ((t * speed + offset) % len) / len;
    ref.current.position.set(from[0] + (to[0] - from[0]) * k, 0, from[2] + (to[2] - from[2]) * k);
  });
  if (!live) return null;
  return <group ref={ref}><Car p={[0, 0, 0]} rot={rot} color={color} /></group>;
}

const CAR_COLORS = ["#9aa3ad", "#1f2329", "#f2f2f0", "#7b1f24", "#2f4b6e", "#c8ccd0", "#3d4a3a", "#f2f2f0"];

export function Surroundings() {
  const asphalt = useMemo(() => asphaltTex([24, 2]), []);
  const asphaltN = useMemo(() => asphaltNormal([24, 2]), []);
  const asphaltV = useMemo(() => asphaltTex([2, 20]), []);
  const asphaltVN = useMemo(() => asphaltNormal([2, 20]), []);
  const walk = useMemo(() => sidewalkTex([60, 2]), []);
  const walkV = useMemo(() => sidewalkTex([4, 36]), []);
  const grass = useMemo(() => grassTex([40, 1]), []);
  const grassR = useMemo(() => grassTex([3, 3]), []);
  const zebra = useMemo(() => stripesTex(), []);
  const white = "#f1f1ea";
  return (
    <group>
      {/* Terreno */}
      <Plane p={[-20, -0.06, -30]} s={[320, 260]} color="#9a9886" />
      {/* Aceras: sur (Beat Oriol) y este (Ripollet); al otro lado de la carretera, otra acera con árboles */}
      <Plane p={[-55, 0.0, 1.6]} s={[120, 3.2]} map={walk} />
      <Plane p={[4.6, 0.0, -35]} s={[9.2, 72]} map={walkV} />
      <Plane p={[24.5, 0.0, -42]} s={[7.4, 100]} map={walkV} />
      {/* Bordillos */}
      <mesh position={[-55, 0.08, 3.2]}><boxGeometry args={[120, 0.16, 0.2]} /><meshStandardMaterial color="#9d9a93" /></mesh>
      <mesh position={[9.2, 0.08, -35]}><boxGeometry args={[0.2, 0.16, 72]} /><meshStandardMaterial color="#9d9a93" /></mesh>
      <mesh position={[20.8, 0.08, -42]}><boxGeometry args={[0.2, 0.16, 100]} /><meshStandardMaterial color="#9d9a93" /></mesh>

      {/* c/ Beat Oriol: dos calzadas, mediana de césped con árboles y línea discontinua */}
      <Plane p={[-55, -0.02, 6.5]} s={[130, 6.6]} map={asphalt} normal={asphaltN} />
      <Plane p={[-55, -0.02, 15.5]} s={[130, 6.6]} map={asphalt} normal={asphaltN} />
      <mesh position={[-60, 0.1, 11]} receiveShadow><boxGeometry args={[110, 0.2, 2.4]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
      <mesh position={[-60, 0.12, 9.8]}><boxGeometry args={[110, 0.24, 0.12]} /><meshStandardMaterial color="#b8b4ab" /></mesh>
      <mesh position={[-60, 0.12, 12.2]}><boxGeometry args={[110, 0.24, 0.12]} /><meshStandardMaterial color="#b8b4ab" /></mesh>
      {Array.from({ length: 10 }, (_, i) => <Tree key={i} p={[-110 + i * 11, 0.2, 11]} s={0.85 + (i % 3) * 0.12} seed={i} />)}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={`d${i}`} position={[-115 + i * 10, 0.005, 17.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 0.14]} /><meshStandardMaterial color={white} /></mesh>
      ))}
      {/* Plazas de aparcamiento en batería junto a la acera, con sus coches */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`p${i}`} position={[-94.75 + i * 9.5, 0.005, 4.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 2.6]} /><meshStandardMaterial color={white} /></mesh>
      ))}
      {CAR_COLORS.map((c, i) => <Car key={i} p={[-90 + i * 9.5, 0, 4.6]} rot={Math.PI / 2} color={c} />)}

      {/* Tráfico (solo en calidad alta) */}
      <MovingCar from={[-125, 0, 7.9]} to={[2, 0, 7.9]} speed={9} offset={0} color="#2f4b6e" />
      <MovingCar from={[-125, 0, 7.9]} to={[2, 0, 7.9]} speed={9} offset={70} color="#e9e9e6" />
      <MovingCar from={[2, 0, 15.5]} to={[-125, 0, 15.5]} speed={10} offset={30} color="#7b1f24" />
      <MovingCar from={[12.3, 0, -1]} to={[12.3, 0, -95]} speed={11} offset={10} color="#9aa3ad" />
      <MovingCar from={[17.7, 0, -95]} to={[17.7, 0, -1]} speed={10} offset={55} color="#1f2329" />

      {/* Ctra. de Ripollet: línea central discontinua */}
      <Plane p={[15, -0.02, -40]} s={[11.6, 110]} map={asphaltV} normal={asphaltVN} />
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={`r${i}`} position={[15, 0.005, -90 + i * 8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.14, 4]} /><meshStandardMaterial color={white} /></mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => <Tree key={`t${i}`} p={[25, 0.05, -85 + i * 11]} s={0.8 + (i % 2) * 0.15} seed={i + 3} />)}
      {[-62, -40, -18, 0].map((z) => <StreetLight key={z} p={[8.6, 0, z]} rot={0} />)}

      {/* Rotonda del cruce, con césped y su árbol */}
      <mesh position={[15, -0.015, 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[11, 48]} /><meshStandardMaterial map={asphalt} normalMap={asphaltN} roughness={0.9} /></mesh>
      <mesh position={[15, 0.15, 11]} receiveShadow><cylinderGeometry args={[4.5, 4.7, 0.3, 40]} /><meshStandardMaterial map={grassR} roughness={1} /></mesh>
      <mesh position={[15, 0.16, 11]}><torusGeometry args={[4.6, 0.14, 8, 48]} /><meshStandardMaterial color="#c9c6be" /></mesh>
      <Tree p={[15, 0.3, 11]} s={1.2} seed={2} />
      {/* Pasos de cebra junto a la esquina */}
      <mesh position={[3, 0.01, 6.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 6.4]} /><meshStandardMaterial map={zebra} transparent /></mesh>
      <mesh position={[15, 0.01, -2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[3, 10]} /><meshStandardMaterial map={zebra} transparent /></mesh>

      {/* Calle de la Indústria (al norte) */}
      <Plane p={[-30, -0.02, -72]} s={[110, 9]} map={asphalt} normal={asphaltN} />
      {/* Naves vecinas del polígono: solo detrás (oeste y norte) */}
      <Neighbor p={[-41, 0, -12]} s={[20, 7, 22]} />
      <Neighbor p={[-41, 0, -45]} s={[20, 8, 38]} color="#b3b6b8" />
      <Neighbor p={[-65, 0, -30]} s={[24, 9, 56]} color="#c2c2bd" />
      <Neighbor p={[-25, 0, -90]} s={[40, 9, 24]} />
    </group>
  );
}
