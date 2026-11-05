"use client";

import { BUILDINGS } from "@/lib/naves";

// Instalaciones de la fábrica: aspiración de serrín con su silo, compresor, luces de nave, cuadros eléctricos,
// mangueras de incendio, pasos de peatones y las máquinas de aire acondicionado del tejado del showroom.
// SUPUESTO: una carpintería de este tamaño siempre tiene aspiración y compresor; la posición es inventada.

type V3 = [number, number, number];
const GALV = { color: "#c4c9ce", metalness: 0.8, roughness: 0.32 } as const; // chapa galvanizada
const HOSE = { color: "#2a2d31", roughness: 0.8 } as const;

/** Tubo recto entre dos puntos (horizontal o vertical). */
function Pipe({ a, b, r, m = GALV }: { a: V3; b: V3; r: number; m?: Record<string, unknown> }) {
  const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // El cilindro va en Y: se gira según el eje en el que va el tubo.
  const rot: V3 = a[0] !== b[0] ? [0, 0, Math.PI / 2] : a[2] !== b[2] ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={mid} rotation={rot} castShadow>
      <cylinderGeometry args={[r, r, len, 16]} />
      <meshStandardMaterial {...m} />
    </mesh>
  );
}

// Aspiración: el colector va a 4 m pegado a la pared entre naves (detrás de las estanterías) y baja a cada máquina.
const DUCT_X = -15.8, DUCT_Y = 4;
const DROPS: { z: number; x: number; bottom: number }[] = [
  { z: -45.8, x: -23.5, bottom: 1.5 }, // seccionadora
  { z: -38.55, x: -21, bottom: 2 }, // canteadora (dos tomas)
  { z: -38.55, x: -25, bottom: 2 },
  { z: -29.5, x: -24.1, bottom: 3.2 }, // CNC: la manguera cuelga sobre el pórtico, que se mueve debajo
];

/** Silo de aspiración con filtro, ventilador y escalera, fuera de la fachada norte, y los tubos hasta las máquinas. */
function DustExtraction({ inside }: { inside: boolean }) {
  const sx = DUCT_X, sz = -65.9, R = 1.3;
  return (
    <group>
      {/* Silo */}
      <group position={[sx, 0, sz]}>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x * 0.85, 1.3, z * 0.85]} castShadow><boxGeometry args={[0.14, 2.6, 0.14]} /><meshStandardMaterial color="#5d6772" metalness={0.6} roughness={0.45} /></mesh>)}
        <mesh position={[0, 2.05, 0]} castShadow><cylinderGeometry args={[R, 0.35, 1.3, 24]} /><meshStandardMaterial {...GALV} /></mesh>
        <mesh position={[0, 5.7, 0]} castShadow receiveShadow><cylinderGeometry args={[R, R, 6, 28]} /><meshStandardMaterial {...GALV} /></mesh>
        {/* Aros de refuerzo */}
        {[3.4, 5, 6.6, 8.2].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[R + 0.02, 0.04, 6, 32]} /><meshStandardMaterial {...GALV} /></mesh>)}
        {/* Tapa con filtro y ventilador */}
        <mesh position={[0, 8.8, 0]} castShadow><coneGeometry args={[R + 0.05, 0.5, 28]} /><meshStandardMaterial {...GALV} /></mesh>
        <mesh position={[0.3, 9.3, 0]} castShadow><cylinderGeometry args={[0.55, 0.55, 0.6, 20]} /><meshStandardMaterial color="#2f6f9f" metalness={0.3} roughness={0.45} /></mesh>
        <mesh position={[0.3, 9.9, 0]} castShadow><cylinderGeometry args={[0.25, 0.25, 0.9, 14]} /><meshStandardMaterial {...GALV} /></mesh>
        {/* Escalera de gato */}
        {[-0.22, 0.22].map((x) => <mesh key={x} position={[x, 5.4, -R - 0.15]}><boxGeometry args={[0.04, 7.2, 0.04]} /><meshStandardMaterial color="#e3b52a" /></mesh>)}
        {Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[0, 2 + i * 0.32, -R - 0.15]}><boxGeometry args={[0.44, 0.03, 0.03]} /><meshStandardMaterial color="#e3b52a" /></mesh>)}
        {/* Descarga de serrín a un contenedor */}
        <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.2, 0.2, 0.5, 12]} /><meshStandardMaterial {...GALV} /></mesh>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[1.5, 0.9, 1.1]} /><meshStandardMaterial color="#3d6fa3" roughness={0.6} /></mesh>
      </group>
      {/* Entrada del colector por la fachada norte */}
      <Pipe a={[sx, DUCT_Y, sz + R]} b={[sx, DUCT_Y, -63.6]} r={0.28} />
      {inside && (
        <group>
          <Pipe a={[sx, DUCT_Y, -63.6]} b={[sx, DUCT_Y, -29.5]} r={0.26} />
          {DROPS.map((d, i) => (
            <group key={i}>
              <Pipe a={[sx, DUCT_Y, d.z]} b={[d.x, DUCT_Y, d.z]} r={0.15} />
              <Pipe a={[d.x, DUCT_Y, d.z]} b={[d.x, d.bottom + 0.6, d.z]} r={0.12} />
              {/* Tramo final de manguera flexible */}
              <Pipe a={[d.x, d.bottom + 0.6, d.z]} b={[d.x, d.bottom, d.z]} r={0.1} m={HOSE} />
            </group>
          ))}
          {/* Soportes colgados del colector */}
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[sx, DUCT_Y + 0.3, -60 + i * 5]}><boxGeometry args={[0.04, 0.4, 0.04]} /><meshStandardMaterial color="#5d6772" /></mesh>)}
        </group>
      )}
    </group>
  );
}

/** Compresor de aire y calderín bajo un tejadillo, fuera de la fachada norte de la nave 1. */
function Compressor() {
  return (
    <group position={[-5, 0, -65.6]}>
      <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[1.6, 1.4, 1]} /><meshStandardMaterial color="#d9dcdf" roughness={0.5} /></mesh>
      <mesh position={[0, 1.15, 0.51]}><planeGeometry args={[1.2, 0.35]} /><meshStandardMaterial color="#2f6f9f" /></mesh>
      {[-0.4, 0, 0.4].map((x) => <mesh key={x} position={[x, 0.5, 0.505]}><planeGeometry args={[0.25, 0.5]} /><meshStandardMaterial color="#6e757c" /></mesh>)}
      <mesh position={[1.6, 1.1, 0]} castShadow><cylinderGeometry args={[0.38, 0.38, 2, 20]} /><meshStandardMaterial color="#c23a2c" roughness={0.4} /></mesh>
      <mesh position={[1.6, 2.15, 0]}><sphereGeometry args={[0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c23a2c" roughness={0.4} /></mesh>
      {/* Tejadillo */}
      <mesh position={[0.6, 2.7, 0]} castShadow><boxGeometry args={[3.4, 0.08, 1.8]} /><meshStandardMaterial color="#9aa1a8" metalness={0.4} /></mesh>
      {[[-1, -0.8], [2.2, -0.8], [-1, 0.8], [2.2, 0.8]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 1.35, z]}><boxGeometry args={[0.06, 2.7, 0.06]} /><meshStandardMaterial color="#5d6772" /></mesh>)}
      {/* Línea de aire que entra a la nave */}
      <Pipe a={[1.6, 3.6, 0]} b={[1.6, 3.6, 1.6]} r={0.04} m={{ color: "#2f6f9f" }} />
      <Pipe a={[1.6, 2.5, 0]} b={[1.6, 3.6, 0]} r={0.04} m={{ color: "#2f6f9f" }} />
    </group>
  );
}

/** Campanas LED colgadas del techo (se ven al quitar el tejado). */
function HighBayLights() {
  const n1 = BUILDINGS.nave1.rect, n2 = BUILDINGS.nave2.rect;
  const spots: [number, number][] = [];
  for (const z of [-60, -52, -44, -36, -28]) spots.push([n1.x + 3.75, z], [n1.x + 11.25, z]);
  // En la nave 2 no se ponen sobre el almacén: las estanterías son más altas.
  for (const z of [-44, -36, -28]) spots.push([n2.x + 3.75, z], [n2.x + 11.25, z]);
  return (
    <group>
      {spots.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 4.15, z]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.012, 0.012, 0.4, 4]} /><meshStandardMaterial color="#333" /></mesh>
          <mesh><cylinderGeometry args={[0.18, 0.34, 0.16, 20]} /><meshStandardMaterial color="#4a5058" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, -0.085, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.3, 20]} /><meshStandardMaterial color="#ffffff" emissive="#fff6e6" emissiveIntensity={2} side={2} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Cuadros eléctricos y mangueras de incendio (BIE) en las paredes. [x, z, giro] con la pieza mirando hacia +x. */
function WallServices() {
  const panels: [number, number, number][] = [[-29.8, -47, 0], [-0.2, -42, Math.PI], [-14.8, -30, 0]];
  const bie: [number, number, number][] = [[-29.8, -35, 0], [-0.2, -55, Math.PI], [-15.2, -46, Math.PI]];
  return (
    <group>
      {panels.map(([x, z, r]) => (
        <group key={`p${x}${z}`} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0.15, 1.3, 0]} castShadow><boxGeometry args={[0.3, 1.8, 1.2]} /><meshStandardMaterial color="#cdd0d3" roughness={0.5} /></mesh>
          <mesh position={[0.31, 1.9, 0]}><planeGeometry args={[0.2, 0.2]} /><meshStandardMaterial color="#f2c230" /></mesh>
          {/* Bandeja de cables que sube */}
          <mesh position={[0.08, 3.3, 0]}><boxGeometry args={[0.1, 2.2, 0.4]} /><meshStandardMaterial color="#9ba2a9" metalness={0.5} /></mesh>
        </group>
      ))}
      {bie.map(([x, z, r]) => (
        <group key={`b${x}${z}`} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0.12, 1.4, 0]} castShadow><boxGeometry args={[0.24, 0.75, 0.75]} /><meshStandardMaterial color="#c8231b" roughness={0.4} /></mesh>
          <mesh position={[0.245, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.55, 0.55]} /><meshStandardMaterial color="#e9eef2" transparent opacity={0.5} roughness={0.05} /></mesh>
          <mesh position={[0.2, 1.4, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.2, 0.05, 8, 20]} /><meshStandardMaterial color="#d23a2e" /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Pasos de peatones verdes en las puertas entre naves (por donde también pasa la carretilla). */
function Crossings() {
  const zs = [-58, -30.5];
  return (
    <group>
      {zs.map((z) => Array.from({ length: 7 }, (_, i) => (
        <mesh key={`${z}${i}`} position={[-15, 0.04, z - 1.8 + i * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.3]} />
          <meshStandardMaterial color={i % 2 ? "#e9e7df" : "#3f8f5a"} roughness={0.6} />
        </mesh>
      )))}
    </group>
  );
}

/** Todo lo de instalaciones de la fábrica. Lo de dentro solo se dibuja sin tejado (con tejado no se ve). */
export function FactoryServices({ roof }: { roof: boolean }) {
  return (
    <group>
      <DustExtraction inside={!roof} />
      <Compressor />
      {!roof && <><HighBayLights /><WallServices /><Crossings /></>}
    </group>
  );
}

/** Máquinas de aire acondicionado y peto en el tejado plano del showroom. */
export function ShowroomRoofUnits() {
  const { rect, height } = BUILDINGS.showroom;
  const y = height + 0.3;
  const units: [number, number][] = [[-25, -19], [-21.5, -19], [-18, -19]];
  const edges: [number, number, number, number][] = [
    [rect.x + rect.w / 2, rect.z + 0.1, rect.w, 0.2], [rect.x + 0.1, rect.z + rect.d / 2, 0.2, rect.d],
  ];
  return (
    <group>
      {edges.map(([x, z, w, d], i) => <mesh key={i} position={[x, y + 0.3, z]} castShadow><boxGeometry args={[w, 0.6, d]} /><meshStandardMaterial color="#d8d3cb" /></mesh>)}
      {units.map(([x, z]) => (
        <group key={x} position={[x, y, z]}>
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[2.6, 1.1, 1.3]} /><meshStandardMaterial color="#e4e6e8" roughness={0.5} /></mesh>
          {[-0.6, 0.6].map((fx) => (
            <group key={fx} position={[fx, 1.11, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.45, 24]} /><meshStandardMaterial color="#2a2d31" /></mesh>
              <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.44, 0.5, 24]} /><meshStandardMaterial color="#9aa1a8" /></mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Conductos que bajan al interior */}
      <mesh position={[-21.5, y + 0.25, -17.4]} castShadow><boxGeometry args={[7, 0.5, 0.6]} /><meshStandardMaterial {...GALV} /></mesh>
    </group>
  );
}
