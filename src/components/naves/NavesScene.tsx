"use client";

import { CameraControls, Environment, Html, Lightformer, Sky } from "@react-three/drei";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DOCK, FACTORY_ZONES, type Rect, SHELVES, VIEWS, type ViewKey } from "@/lib/naves";
import type { NavesData } from "@/lib/naves-data";
import { Factory, Showroom } from "./Architecture";
import { Forklift, KitchenPallet, PalletRack, Van, ZoneEquipment, ZoneWorkers } from "./Equipment";
import { Surroundings } from "./Surroundings";

export type Selection = { type: "zone"; key: string } | { type: "shelf"; key: string } | { type: "dock" } | { type: "showroom" } | null;
export type Quality = "alta" | "baja";

// Colores del stock: los mismos de toda la web (verde bien, ámbar bajo, rojo agotado; gris vacía).
const LEVEL_COLOR = { bien: "#2f9a5c", bajo: "#e09a1e", agotado: "#d0352a", vacia: "#9b968e" };
const SUN: [number, number, number] = [70, 80, 45];

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

/** Etiqueta flotante. Siempre montada y solo se oculta: montarla y desmontarla al pasar el ratón da avisos y tirones. */
function Label({ position, children, strong, show = true }: { position: [number, number, number]; children: React.ReactNode; strong?: boolean; show?: boolean }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: "none", opacity: show ? 1 : 0, transition: "opacity .15s" }}>
      <div className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur ${strong ? "bg-ink/90 text-white" : "bg-white/85 text-ink"}`}>{children}</div>
    </Html>
  );
}

/** Líneas amarillas de seguridad alrededor de una zona, pintadas en el suelo. */
function FloorLines({ rect }: { rect: Rect }) {
  const t = 0.12, y = 0.035;
  const lines: [number, number, number, number][] = [
    [rect.x + rect.w / 2, rect.z, rect.w, t], [rect.x + rect.w / 2, rect.z + rect.d, rect.w, t],
    [rect.x, rect.z + rect.d / 2, t, rect.d], [rect.x + rect.w, rect.z + rect.d / 2, t, rect.d],
  ];
  return <>{lines.map(([x, z, w, d], i) => <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshStandardMaterial color="#e8b420" roughness={0.6} /></mesh>)}</>;
}

/** Zona de fábrica: suelo pintado, líneas, su maquinaria y un palé por cocina. Todo es clicable. */
function Zone({ z, kitchens, selected, onSelect, labels }: {
  z: (typeof FACTORY_ZONES)[number]; kitchens: NavesData["zones"][string]; selected: boolean; onSelect: () => void; labels: boolean;
}) {
  const [cx, cz] = center(z.rect);
  const { hover, bind } = useHover();
  const shown = kitchens.slice(0, 6);
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
      <mesh position={[cx, 0.03, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[z.rect.w, z.rect.d]} />
        <meshStandardMaterial color={selected ? "#c98a47" : hover ? "#d7b48a" : z.color} transparent opacity={selected ? 0.55 : hover ? 0.45 : 0.32} roughness={0.5} />
      </mesh>
      <FloorLines rect={z.rect} />
      <ZoneEquipment zone={z.key} rect={z.rect} />
      <ZoneWorkers zone={z.key} rect={z.rect} />
      {shown.map((k, i) => (
        // Palés en la franja de abajo de la zona, en fila.
        <KitchenPallet key={k.id} k={k} p={[z.rect.x + 1.8 + (i % 4) * 3, 0, z.rect.z + z.rect.d - 1.3 - Math.floor(i / 4) * 1.9]} />
      ))}
      <Label position={[cx, 5.2, cz]} show={labels || hover || selected} strong={selected}>
        {z.label}{"stock" in z ? "" : <span className="ml-1 opacity-70">· {kitchens.length}</span>}
      </Label>
    </group>
  );
}

function Rack({ s, items, selected, onSelect, labels }: { s: (typeof SHELVES)[number]; items: NavesData["shelves"][string]; selected: boolean; onSelect: () => void; labels: boolean }) {
  // labels aquí solo es true en la vista Almacén: de lejos, las 8 etiquetas se amontonan.
  const { hover, bind } = useHover();
  const level = !items.length ? "vacia" : items.some((i) => i.level === "agotado") ? "agotado" : items.some((i) => i.level === "bajo") ? "bajo" : "bien";
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
      <PalletRack p={[s.x, 0, s.z]} items={items.length} color={LEVEL_COLOR[level]} highlight={selected ? 1 : hover ? 0.5 : 0} />
      <Label position={[s.x, 6.6, s.z]} show={labels || hover || selected} strong={selected}>{s.key}</Label>
    </group>
  );
}

function Dock({ count, selected, onSelect, labels }: { count: number; selected: boolean; onSelect: () => void; labels: boolean }) {
  const [cx, cz] = center(DOCK.rect);
  const { hover, bind } = useHover();
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
      <mesh position={[cx - 0.3, 0.04, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[DOCK.rect.w - 0.6, DOCK.rect.d]} />
        <meshStandardMaterial color={selected ? "#d9b88f" : hover ? "#cfc7ba" : "#b9b4ab"} roughness={0.9} />
      </mesh>
      {/* Plazas de carga pintadas */}
      {[0, 1, 2].map((i) => <mesh key={i} position={[cx, 0.05, DOCK.rect.z + 0.6 + i * 3.9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[DOCK.rect.w - 1, 0.15]} /><meshStandardMaterial color="#e8b420" /></mesh>)}
      {Array.from({ length: Math.min(count, 2) }, (_, i) => <Van key={i} p={[cx + 0.5, 0, DOCK.rect.z + 2.6 + i * 3.9]} rot={-Math.PI / 2} />)}
      <Label position={[cx, 4.6, cz]} show={labels || hover || selected} strong={selected}>{DOCK.label}{count > 0 && <span className="ml-1 opacity-70">· {count}</span>}</Label>
    </group>
  );
}

function ShowroomPick({ roof, selected, onSelect, labels }: { roof: boolean; selected: boolean; onSelect: () => void; labels: boolean }) {
  const { hover, bind } = useHover();
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(); }} {...bind}>
      <Showroom roof={roof} selected={selected} hover={hover} />
      <Label position={[-15, 9, -12]} show={labels || hover || selected} strong>Showroom</Label>
    </group>
  );
}

/** Mueve la cámara a la vista elegida, con un vuelo suave. En pantallas en vertical se aleja un poco para que quepa. */
function CameraRig({ view }: { view: ViewKey }) {
  const ref = useRef<CameraControls>(null);
  const { size, invalidate } = useThree();
  const first = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const v = VIEWS[view];
    const k = size.height > size.width ? Math.min(1.9, size.height / size.width) : 1;
    const [tx, ty, tz] = v.target;
    const pos = v.pos.map((p, i) => v.target[i] + (p - v.target[i]) * k) as [number, number, number];
    if (first.current) {
      // Entrada: se empieza más arriba y lejos, y se baja volando hasta la vista.
      c.setLookAt(pos[0] * 1.8, pos[1] * 2.2, pos[2] * 1.8, tx, ty, tz, false);
      first.current = false;
    }
    c.setLookAt(pos[0], pos[1], pos[2], tx, ty, tz, true);
    invalidate();
  }, [view, size.width, size.height, invalidate]);
  return <CameraControls ref={ref} minDistance={5} maxDistance={190} maxPolarAngle={Math.PI / 2 - 0.08} smoothTime={0.6} />;
}

export default function NavesScene({ data, selected, onSelect, view, roof, labels, quality }: {
  data: NavesData; selected: Selection; onSelect: (s: Selection) => void; view: ViewKey; roof: boolean; labels: boolean; quality: Quality;
}) {
  const is = (s: NonNullable<Selection>) => JSON.stringify(selected) === JSON.stringify(s);
  const high = quality === "alta";
  // Las etiquetas se ven a través de las paredes: en cada vista solo salen las de lo que se está mirando.
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={high ? [1, 2] : 1}
      frameloop="demand"
      camera={{ position: [80, 90, 70], fov: 40, near: 0.5, far: 900 }}
      gl={{ antialias: !high, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
      onPointerMissed={() => onSelect(null)}
    >
      <Sky sunPosition={SUN} turbidity={5} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <fog attach="fog" args={["#dfe5ea", 140, 360]} />
      <hemisphereLight args={["#eaf2ff", "#b9ad96", 0.55]} />
      <directionalLight position={SUN} intensity={2.4} color="#fff3e2" castShadow
        shadow-mapSize={high ? [4096, 4096] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={75} shadow-camera-bottom={-75} shadow-camera-far={300} />
      {/* Reflejos en cristal y metal: un «estudio» de luces hecho aquí mismo, sin descargar nada */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-30, 5, 0]} rotation-y={Math.PI / 2} scale={[30, 8, 1]} color="#dfe8f2" />
        <Lightformer intensity={1.2} position={[30, 5, 0]} rotation-y={-Math.PI / 2} scale={[30, 8, 1]} color="#fff1dc" />
      </Environment>

      <Surroundings />
      <ShowroomPick roof={roof} selected={is({ type: "showroom" })} onSelect={() => onSelect({ type: "showroom" })} labels={labels} />
      <Factory roof={roof} />
      {FACTORY_ZONES.map((z) => (
        <Zone key={z.key} z={z} kitchens={data.zones[z.key] ?? []} labels={labels && (view === "general" || view === "fabrica")}
          selected={is({ type: "zone", key: z.key })} onSelect={() => onSelect({ type: "zone", key: z.key })} />
      ))}
      {SHELVES.map((s) => (
        <Rack key={s.key} s={s} items={data.shelves[s.key] ?? []} labels={labels && view === "almacen"}
          selected={is({ type: "shelf", key: s.key })} onSelect={() => onSelect({ type: "shelf", key: s.key })} />
      ))}
      <Forklift p={[-18.5, 0, -51]} rot={0.6} />
      <Dock count={data.dock.length} labels={labels && view !== "showroom" && view !== "almacen"} selected={is({ type: "dock" })} onSelect={() => onSelect({ type: "dock" })} />

      <CameraRig view={view} />
      {high && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={1.6} intensity={2.2} distanceFalloff={0.8} halfRes />
          <SMAA />
        </EffectComposer>
      )}
    </Canvas>
  );
}
