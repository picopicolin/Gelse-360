"use client";

import { useMemo } from "react";
import { asphaltTex, metalPanelTex, sidewalkTex, stripesTex } from "./textures";
import { Car } from "./Equipment";

// Entorno real según la vista aérea: c/ Beat Oriol al sur con mediana arbolada, Ctra. de Ripollet al este,
// rotonda en el cruce, naves vecinas del polígono Foinvasa y viviendas al otro lado de la carretera.

type V3 = [number, number, number];

function Plane({ p, s, map, color, rot = 0 }: { p: V3; s: [number, number]; map?: ReturnType<typeof asphaltTex>; color?: string; rot?: number }) {
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, rot]} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial map={map} color={color} roughness={0.92} />
    </mesh>
  );
}

function Tree({ p, s = 1 }: { p: V3; s?: number }) {
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.14, 0.2, 2.4, 8]} /><meshStandardMaterial color="#6b5440" roughness={0.9} /></mesh>
      <mesh position={[0, 3, 0]} castShadow><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color="#5f7d45" roughness={0.85} flatShading /></mesh>
      <mesh position={[0.6, 3.6, 0.3]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#6d8c4f" roughness={0.85} flatShading /></mesh>
    </group>
  );
}

/** Nave vecina: caja de chapa con tejado gris. */
function Neighbor({ p, s, color = "#b9bcbe", roof = "#7e858c" }: { p: V3; s: V3; color?: string; roof?: string }) {
  const tex = metalPanelTex([Math.max(1, Math.round(s[0] / 4)), 1], color);
  return (
    <group position={p}>
      <mesh position={[0, s[1] / 2, 0]} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial map={tex} roughness={0.6} metalness={0.2} /></mesh>
      <mesh position={[0, s[1] + 0.1, 0]} receiveShadow><boxGeometry args={[s[0] + 0.3, 0.2, s[2] + 0.3]} /><meshStandardMaterial color={roof} roughness={0.7} /></mesh>
    </group>
  );
}

/** Bloque de viviendas con tejado de teja. */
function Housing({ p, s, color }: { p: V3; s: V3; color: string }) {
  return (
    <group position={p}>
      <mesh position={[0, s[1] / 2, 0]} castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>
      {/* Ventanas como franjas oscuras por planta */}
      {Array.from({ length: Math.floor(s[1] / 3) }, (_, i) => (
        <mesh key={i} position={[-s[0] / 2 - 0.01, 1.6 + i * 3, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[s[2] * 0.85, 1.1]} /><meshStandardMaterial color="#3c4752" roughness={0.3} /></mesh>
      ))}
      <mesh position={[0, s[1] + 0.25, 0]} castShadow><boxGeometry args={[s[0] + 0.4, 0.5, s[2] + 0.4]} /><meshStandardMaterial color="#b4593c" roughness={0.8} /></mesh>
    </group>
  );
}

const CAR_COLORS = ["#9aa3ad", "#1f2329", "#f2f2f0", "#7b1f24", "#2f4b6e", "#c8ccd0", "#3d4a3a", "#f2f2f0"];

export function Surroundings() {
  const asphalt = useMemo(() => asphaltTex([24, 2]), []);
  const asphaltV = useMemo(() => asphaltTex([2, 20]), []);
  const walk = useMemo(() => sidewalkTex([60, 2]), []);
  const walkV = useMemo(() => sidewalkTex([4, 36]), []);
  const zebra = useMemo(() => stripesTex(), []);
  return (
    <group>
      {/* Terreno */}
      <Plane p={[-20, -0.06, -30]} s={[320, 260]} color="#9e9c8a" />
      {/* Acera sur (Beat Oriol) y acera este (Ripollet), con el muelle pavimentado */}
      <Plane p={[-55, 0.0, 1.6]} s={[120, 3.2]} map={walk} />
      <Plane p={[4.6, 0.0, -35]} s={[9.2, 72]} map={walkV} />
      {/* Bordillos */}
      <mesh position={[-55, 0.08, 3.2]}><boxGeometry args={[120, 0.16, 0.2]} /><meshStandardMaterial color="#9d9a93" /></mesh>
      <mesh position={[9.2, 0.08, -35]}><boxGeometry args={[0.2, 0.16, 72]} /><meshStandardMaterial color="#9d9a93" /></mesh>
      {/* c/ Beat Oriol: dos calzadas con mediana arbolada */}
      <Plane p={[-55, -0.02, 6.5]} s={[130, 6.6]} map={asphalt} />
      <Plane p={[-55, -0.02, 15.5]} s={[130, 6.6]} map={asphalt} />
      <mesh position={[-60, 0.1, 11]}><boxGeometry args={[110, 0.2, 2.4]} /><meshStandardMaterial color="#7f8f5a" roughness={1} /></mesh>
      {Array.from({ length: 10 }, (_, i) => <Tree key={i} p={[-110 + i * 11, 0.2, 11]} s={0.9 + (i % 3) * 0.1} />)}
      {/* Ctra. de Ripollet */}
      <Plane p={[15, -0.02, -40]} s={[11.6, 110]} map={asphaltV} />
      <mesh position={[15, 0.0, -45]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.15, 90]} /><meshStandardMaterial color="#f1f1ea" /></mesh>
      {/* Rotonda del cruce */}
      <mesh position={[15, -0.015, 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[11, 48]} /><meshStandardMaterial map={asphalt} roughness={0.9} /></mesh>
      <mesh position={[15, 0.15, 11]} receiveShadow><cylinderGeometry args={[4.5, 4.7, 0.3, 40]} /><meshStandardMaterial color="#86965e" roughness={1} /></mesh>
      <mesh position={[15, 0.1, 11]}><torusGeometry args={[4.6, 0.12, 8, 48]} /><meshStandardMaterial color="#c9c6be" /></mesh>
      <Tree p={[15, 0.3, 11]} s={1.2} />
      {/* Pasos de cebra junto a la esquina */}
      <mesh position={[3, 0.01, 6.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 6.4]} /><meshStandardMaterial map={zebra} transparent /></mesh>
      <mesh position={[15, 0.01, -2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[3, 10]} /><meshStandardMaterial map={zebra} transparent /></mesh>
      {/* Calle de la Indústria (al norte) */}
      <Plane p={[-30, -0.02, -72]} s={[110, 9]} map={asphalt} />
      {/* Naves vecinas del polígono */}
      <Neighbor p={[-41, 0, -12]} s={[20, 7, 22]} />
      <Neighbor p={[-41, 0, -45]} s={[20, 8, 38]} color="#b3b6b8" />
      <Neighbor p={[-65, 0, -30]} s={[24, 9, 56]} color="#c2c2bd" />
      <Neighbor p={[-25, 0, -90]} s={[40, 9, 24]} />
      <Neighbor p={[-70, 0, 34]} s={[40, 8, 26]} color="#bdb8ae" />
      <Neighbor p={[-25, 0, 34]} s={[30, 7, 26]} />
      {/* Viviendas al otro lado de la Ctra. de Ripollet */}
      <Housing p={[30, 0, -10]} s={[12, 12, 14]} color="#e6d8c3" />
      <Housing p={[30, 0, -30]} s={[12, 15, 16]} color="#dccab0" />
      <Housing p={[30, 0, -52]} s={[12, 12, 18]} color="#e9dfcf" />
      <Housing p={[33, 0, 30]} s={[16, 9, 16]} color="#e2d3bd" />
      {/* Coches aparcados en Beat Oriol */}
      {CAR_COLORS.map((c, i) => <Car key={i} p={[-90 + i * 9.5, 0, 4.4]} rot={Math.PI / 2} color={c} />)}
    </group>
  );
}
