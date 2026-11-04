"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { BUILDINGS, DOCK, FACTORY_ZONES, type Rect, SHELVES } from "@/lib/naves";
import type { NavesData } from "@/lib/naves-data";

export type Selection = { type: "zone"; key: string } | { type: "shelf"; key: string } | { type: "dock" } | { type: "showroom" } | null;

// Colores de las estanterías: los mismos del stock (verde bien, ámbar bajo, rojo agotado; gris vacía).
const LEVEL_COLOR = { bien: "#2f7d4f", bajo: "#d08a1e", agotado: "#b42318", vacia: "#a8a39b" };

const center = (r: Rect) => [r.x + r.w / 2, r.z + r.d / 2] as const;

/** Cursor de mano al pasar por encima de algo que se puede tocar. */
function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    bind: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; },
      onPointerOut: () => { setHover(false); document.body.style.cursor = ""; },
    },
  };
}

function Label({ position, children, strong }: { position: [number, number, number]; children: React.ReactNode; strong?: boolean }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs shadow ${strong ? "bg-ink font-semibold text-white" : "bg-white/90 text-ink"}`}>{children}</div>
    </Html>
  );
}

/** Nave sin tejado: suelo, zócalo opaco y paredes transparentes para ver lo de dentro. */
function Building({ rect, height, label, glass, onClick, selected }: {
  rect: Rect; height: number; label: string; glass?: boolean; onClick?: () => void; selected?: boolean;
}) {
  const [cx, cz] = center(rect);
  const { hover, bind } = useHover();
  const wall = glass ? "#9cc7dd" : "#e9e4dc";
  const walls: [number, number, number, number][] = [
    [cx, rect.z, rect.w, 0.25], [cx, rect.z + rect.d, rect.w, 0.25], [rect.x, cz, 0.25, rect.d], [rect.x + rect.w, cz, 0.25, rect.d],
  ];
  return (
    <group>
      <mesh position={[cx, 0.05, cz]} receiveShadow onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined} {...(onClick ? bind : {})}>
        <boxGeometry args={[rect.w, 0.1, rect.d]} />
        <meshStandardMaterial color={selected || hover ? "#f3eee6" : glass ? "#f5f2ec" : "#cfc9bf"} />
      </mesh>
      {walls.map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, 0.35, z]} castShadow><boxGeometry args={[w, 0.7, d]} /><meshStandardMaterial color={glass ? "#7d8a92" : "#bdb6aa"} /></mesh>
          <mesh position={[x, height / 2 + 0.35, z]}>
            <boxGeometry args={[w, height - 0.7, d]} />
            <meshStandardMaterial color={wall} transparent opacity={glass ? 0.28 : 0.14} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <Label position={[cx, height + 0.5, rect.z + rect.d]} strong>{label}</Label>
    </group>
  );
}

/** Máquinas de cada zona, solo para reconocerla de un vistazo. */
function Machines({ zone, rect }: { zone: string; rect: Rect }) {
  const [cx] = center(rect);
  const box = (key: string, pos: [number, number, number], size: [number, number, number], color: string, opacity = 1) => (
    <mesh key={key} position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
  const top = rect.z + 1.6;
  switch (zone) {
    case "corte": return <>{box("sierra", [cx - 2, 0.5, top], [8, 0.9, 1.6], "#6b7b8c")}{box("mesa", [cx - 2, 0.45, top + 1.6], [8, 0.8, 1.2], "#a9b4bf")}</>;
    case "canteado": return <>{box("canteadora", [cx - 1.5, 0.7, top], [9, 1.3, 1.2], "#4f6d7a")}</>;
    case "mecanizado": return <>{box("cnc", [cx - 2, 0.6, top + 0.6], [6, 1.1, 2.6], "#38556b")}{box("puente", [cx - 2, 1.9, top + 0.6], [0.6, 1.5, 2.8], "#e0a43a")}</>;
    case "lacado": return <>{box("cabina", [cx - 2.5, 1.6, top + 1.2], [5, 3.2, 3.4], "#c9b6d6", 0.55)}</>;
    case "montaje": return <>{[0, 1, 2].map((i) => box(`mesa${i}`, [rect.x + 2.5 + i * 3.4, 0.45, top + 0.4], [2.6, 0.9, 1.4], "#a5835f"))}</>;
    case "embalaje": return <>{box("mesa", [cx - 2, 0.45, top], [4, 0.9, 1.6], "#8f9aa6")}{box("rollo", [cx + 1, 0.6, top], [0.6, 1.2, 0.6], "#e7eef3")}</>;
    default: return null;
  }
}

/** Una zona de la fábrica: suelo de color, sus máquinas y un palé por cada cocina que hay en ella. */
function Zone({ z, kitchens, selected, onSelect }: {
  z: (typeof FACTORY_ZONES)[number]; kitchens: NavesData["zones"][string]; selected: boolean; onSelect: () => void;
}) {
  const [cx, cz] = center(z.rect);
  const { hover, bind } = useHover();
  const shown = kitchens.slice(0, 8);
  return (
    <group>
      <mesh position={[cx, 0.13, cz]} receiveShadow onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
        <boxGeometry args={[z.rect.w, 0.06, z.rect.d]} />
        <meshStandardMaterial color={z.color} emissive={selected ? "#9a6a3a" : hover ? "#6f6a64" : "#000"} emissiveIntensity={selected ? 0.35 : hover ? 0.15 : 0} />
      </mesh>
      <Machines zone={z.key} rect={z.rect} />
      {shown.map((k, i) => {
        // Palés en dos filas en la parte de abajo de la zona; la altura crece con los muebles de la cocina.
        const h = 0.5 + Math.min(k.total, 20) * 0.08;
        const x = z.rect.x + 1.6 + (i % 4) * 2.9;
        const zz = z.rect.z + z.rect.d - 1.4 - Math.floor(i / 4) * 2.2;
        return (
          <group key={k.id} position={[x, 0.16, zz]}>
            <mesh position={[0, 0.06, 0]} castShadow><boxGeometry args={[2.2, 0.12, 1.6]} /><meshStandardMaterial color="#8a6a48" /></mesh>
            <mesh position={[0, 0.12 + h / 2, 0]} castShadow onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
              <boxGeometry args={[2, h, 1.4]} />
              <meshStandardMaterial color={k.lacado ? "#f2efea" : "#c49a6c"} roughness={k.lacado ? 0.25 : 0.8} />
            </mesh>
          </group>
        );
      })}
      <Label position={[cx, 4, cz]}>
        {z.label}{"stock" in z ? "" : kitchens.length ? <b className="ml-1">· {kitchens.length}</b> : <span className="ml-1 text-muted">· 0</span>}
      </Label>
    </group>
  );
}

function Shelf({ s, items, selected, onSelect }: { s: (typeof SHELVES)[number]; items: NavesData["shelves"][string]; selected: boolean; onSelect: () => void }) {
  const { hover, bind } = useHover();
  const level = !items.length ? "vacia" : items.some((i) => i.level === "agotado") ? "agotado" : items.some((i) => i.level === "bajo") ? "bajo" : "bien";
  return (
    <group position={[s.x, 0, s.z]}>
      {/* Estantería de 4 baldas (4,5 m), toda del color de su stock: se ve de lejos. */}
      {[0.55, 1.65, 2.75, 3.85].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
          <boxGeometry args={[2.8, 0.8, 1.4]} />
          <meshStandardMaterial color={LEVEL_COLOR[level]} emissive={selected || hover ? "#ffffff" : "#000"} emissiveIntensity={selected ? 0.3 : hover ? 0.15 : 0} />
        </mesh>
      ))}
      {[-1.42, 1.42].map((x) => (
        <mesh key={x} position={[x, 2.25, 0]}><boxGeometry args={[0.1, 4.5, 1.45]} /><meshStandardMaterial color="#3c4650" /></mesh>
      ))}
      <Label position={[0, 5.2, 0]} strong={selected}>{s.key}</Label>
    </group>
  );
}

function Van({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0.4]} castShadow><boxGeometry args={[2, 2, 3.6]} /><meshStandardMaterial color="#f7f7f5" /></mesh>
      <mesh position={[0, 0.95, -1.9]} castShadow><boxGeometry args={[2, 1.5, 1.2]} /><meshStandardMaterial color="#f7f7f5" /></mesh>
      <mesh position={[0, 1.25, -2.45]}><boxGeometry args={[1.8, 0.6, 0.05]} /><meshStandardMaterial color="#3b4a57" /></mesh>
      {[[-1, -1.6], [1, -1.6], [-1, 1.4], [1, 1.4]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.35, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, 0.25, 16]} /><meshStandardMaterial color="#222" /></mesh>
      ))}
    </group>
  );
}

function Dock({ count, selected, onSelect }: { count: number; selected: boolean; onSelect: () => void }) {
  const [cx, cz] = center(DOCK.rect);
  const { hover, bind } = useHover();
  return (
    <group>
      <mesh position={[cx, 0.08, cz]} receiveShadow onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
        <boxGeometry args={[DOCK.rect.w, 0.16, DOCK.rect.d]} />
        <meshStandardMaterial color={selected ? "#e9d3b5" : hover ? "#ddd6cb" : "#c9c3b9"} />
      </mesh>
      {/* Franjas amarillas del muelle */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[cx, 0.17, DOCK.rect.z + 1.5 + i * 3]}><boxGeometry args={[DOCK.rect.w - 1, 0.01, 0.2]} /><meshStandardMaterial color="#e0b23a" /></mesh>
      ))}
      {Array.from({ length: Math.min(count, 2) }, (_, i) => <Van key={i} position={[cx - 2 + i * 4, 0.16, cz]} />)}
      <Label position={[cx, 4.2, cz]}>{DOCK.label}{count > 0 && <b className="ml-1">· {count}</b>}</Label>
    </group>
  );
}

/** Showroom: cristal y unas cocinas de exposición, para reconocerlo. */
function ShowroomDecor() {
  const islands: [number, number, number][] = [[-22, -15, 3.6], [-12, -16, 4.2], [-22, -6, 3.2], [-10, -7, 3.8]];
  return (
    <>
      {islands.map(([x, z, w]) => (
        <group key={`${x}${z}`}>
          <mesh position={[x, 0.55, z]} castShadow><boxGeometry args={[w, 0.9, 1.2]} /><meshStandardMaterial color="#efe9df" /></mesh>
          <mesh position={[x, 1.03, z]}><boxGeometry args={[w + 0.1, 0.06, 1.3]} /><meshStandardMaterial color="#6f6a64" /></mesh>
          <mesh position={[x, 1.2, z - 2.2]} castShadow><boxGeometry args={[w + 1.4, 2.3, 0.6]} /><meshStandardMaterial color="#b49470" /></mesh>
        </group>
      ))}
    </>
  );
}

function Streets() {
  const road = "#5d6066";
  return (
    <>
      <mesh position={[-15, -0.02, 8]} receiveShadow><boxGeometry args={[110, 0.02, 9]} /><meshStandardMaterial color={road} /></mesh>
      <mesh position={[14, -0.02, -30]} receiveShadow><boxGeometry args={[9, 0.02, 85]} /><meshStandardMaterial color={road} /></mesh>
      <Label position={[-30, 0.5, 8]}>Carrer del Beat Oriol</Label>
      <Label position={[14, 0.5, -42]}>Ctra. de Ripollet</Label>
    </>
  );
}

const TARGET: [number, number, number] = [-15, 0, -42];

/** En pantallas en vertical (tablet o móvil de pie) la cámara empieza más lejos, para que quepa toda la fábrica. */
function FitCamera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const portrait = size.height > size.width;
    const k = portrait ? Math.min(2, size.height / size.width) * 1.15 : 1;
    camera.position.set(TARGET[0] + 41 * k, 30 * k, TARGET[2] + 26 * k);
    camera.lookAt(...TARGET);
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

export default function NavesScene({ data, selected, onSelect }: { data: NavesData; selected: Selection; onSelect: (s: Selection) => void }) {
  const is = (s: NonNullable<Selection>) => JSON.stringify(selected) === JSON.stringify(s);
  return (
    <Canvas shadows camera={{ position: [26, 30, -16], fov: 45 }} frameloop="demand" dpr={[1, 2]} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={["#eef0ee"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[30, 60, 25]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} />
      <mesh position={[-15, -0.05, -30]} receiveShadow><boxGeometry args={[130, 0.04, 110]} /><meshStandardMaterial color="#d7dbd3" /></mesh>
      <Streets />

      <Building {...BUILDINGS.showroom} glass onClick={() => onSelect({ type: "showroom" })} selected={is({ type: "showroom" })} />
      <ShowroomDecor />
      <Building {...BUILDINGS.nave1} />
      <Building {...BUILDINGS.nave2} />

      {FACTORY_ZONES.map((z) => (
        <Zone key={z.key} z={z} kitchens={data.zones[z.key] ?? []} selected={is({ type: "zone", key: z.key })} onSelect={() => onSelect({ type: "zone", key: z.key })} />
      ))}
      {SHELVES.map((s) => (
        <Shelf key={s.key} s={s} items={data.shelves[s.key] ?? []} selected={is({ type: "shelf", key: s.key })} onSelect={() => onSelect({ type: "shelf", key: s.key })} />
      ))}
      <Dock count={data.dock.length} selected={is({ type: "dock" })} onSelect={() => onSelect({ type: "dock" })} />

      <FitCamera />
      <OrbitControls target={TARGET} maxPolarAngle={1.35} minDistance={12} maxDistance={140} enableDamping />
    </Canvas>
  );
}
