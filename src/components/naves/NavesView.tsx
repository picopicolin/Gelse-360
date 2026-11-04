"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { FACTORY_ZONES } from "@/lib/naves";
import type { NavesData, ZoneKitchen } from "@/lib/naves-data";
import type { Selection } from "./NavesScene";

// El 3D solo en el navegador (no se puede pintar en el servidor).
const NavesScene = dynamic(() => import("./NavesScene"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted">Cargando las naves…</div>,
});

const dmy = (d: string | null) => (d ? d.split("-").reverse().join("/") : "sin fecha");
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const LEVEL = { bien: ["Bien", "bg-ok/15 text-ok"], bajo: ["Bajo mínimo", "bg-warn/15 text-warn"], agotado: ["Agotado", "bg-bad/15 text-bad"] } as const;
const PHASE: Record<string, string> = { contacto: "Contacto", medicion: "Medición", diseno: "Diseño", lista: "Lista", montaje: "Montaje" };

function KitchenRow({ k, linkable }: { k: ZoneKitchen; linkable: boolean }) {
  const body = (
    <>
      <span className="font-medium">{k.title}</span>
      {k.lacado && <span className="ml-2 rounded bg-wood/15 px-1.5 text-xs text-wood">lacado</span>}
      <span className="block text-muted">
        {k.client} · {k.total ? `${k.done}/${k.total} muebles hechos` : "sin hoja de fábrica"}{k.install ? ` · montaje ${dmy(k.install)}` : ""}
      </span>
    </>
  );
  return <li className="py-2">{linkable ? <Link href={`/cocinas/${k.id}`} className="block hover:underline">{body}</Link> : body}</li>;
}

/** Panel con lo que hay en lo que se ha tocado del 3D. */
function Panel({ data, sel, direccion, onClose }: { data: NavesData; sel: NonNullable<Selection>; direccion: boolean; onClose: () => void }) {
  let title = "", content: React.ReactNode = null;
  if (sel.type === "zone") {
    const z = FACTORY_ZONES.find((x) => x.key === sel.key)!;
    title = z.label;
    if (z.key === "almacen") {
      content = <p className="text-muted">Toca una estantería para ver qué material hay en ella.</p>;
    } else {
      const list = data.zones[z.key] ?? [];
      content = list.length
        ? <ul className="divide-y divide-line">{list.map((k) => <KitchenRow key={k.id} k={k} linkable={direccion} />)}</ul>
        : <p className="text-muted">Ninguna cocina en esta zona ahora mismo.</p>;
    }
  } else if (sel.type === "shelf") {
    const items = data.shelves[sel.key] ?? [];
    title = `Estantería ${sel.key}`;
    content = items.length ? (
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 py-2">
            <Link href={`/stock/${i.id}`} className="hover:underline">{i.name}</Link>
            <span className="text-right">
              <span className="font-medium">{fmt(i.qty)} {i.unit}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${LEVEL[i.level][1]}`}>{LEVEL[i.level][0]}</span>
            </span>
          </li>
        ))}
      </ul>
    ) : <p className="text-muted">Sin material apuntado en esta estantería. En Stock, pon «{sel.key}» en el campo Estantería.</p>;
  } else if (sel.type === "dock") {
    title = "Muelle de carga";
    content = data.dock.length ? (
      <ul className="divide-y divide-line">
        {data.dock.map((d) => (
          <li key={d.id} className="py-2">
            {direccion ? <Link href={`/cocinas/${d.id}`} className="font-medium hover:underline">{d.title}</Link> : <span className="font-medium">{d.title}</span>}
            <span className="block text-muted">{d.client} · {PHASE[d.phase] ?? d.phase} · montaje {dmy(d.install)} · {d.installer ?? "sin montador"}</span>
          </li>
        ))}
      </ul>
    ) : <p className="text-muted">No hay entregas en los próximos 7 días.</p>;
  } else {
    title = "Showroom";
    const n = (p: string) => data.showroom.find((s) => s.phase === p)?.n ?? 0;
    content = (
      <ul className="space-y-1">
        {["contacto", "medicion", "diseno"].map((p) => (
          <li key={p} className="flex justify-between">
            {direccion ? <Link href={`/cocinas?fase=${p}`} className="hover:underline">{PHASE[p]}</Link> : PHASE[p]}
            <b>{n(p)}</b>
          </li>
        ))}
        <li className="pt-2 text-muted">Cocinas que aún están en manos de los interioristas.</li>
      </ul>
    );
  }
  return (
    <div className="card max-h-[45vh] overflow-y-auto p-4 text-sm shadow-lg lg:max-h-none">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-base font-semibold">{title}</p>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Cerrar">✕</button>
      </div>
      {content}
    </div>
  );
}

export default function NavesView({ data, direccion }: { data: NavesData; direccion: boolean }) {
  const [sel, setSel] = useState<Selection>(null);
  const kitchensInFactory = Object.values(data.zones).reduce((s, l) => s + l.length, 0);
  return (
    <div className="relative h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden rounded-2xl border border-line lg:h-[calc(100vh-9rem)]">
      <NavesScene data={data} selected={sel} onSelect={setSel} />
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-white/90 px-2 py-1 shadow">{kitchensInFactory} cocinas en fábrica</span>
        {data.unplaced.length > 0 && <span className="rounded-lg bg-warn/90 px-2 py-1 text-white shadow">{data.unplaced.length} sin zona: ponla en Fábrica</span>}
        <span className="rounded-lg bg-white/90 px-2 py-1 shadow">Estanterías: <b className="text-ok">●</b> bien <b className="text-warn">●</b> bajo <b className="text-bad">●</b> agotado</span>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/80 px-2 py-1 text-xs text-muted">
        Arrastra para girar · rueda o dos dedos para acercar · toca una zona, estantería o el muelle
      </p>
      {sel && (
        <div className="absolute inset-x-3 bottom-3 lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-auto lg:w-96">
          <Panel data={data} sel={sel} direccion={direccion} onClose={() => setSel(null)} />
        </div>
      )}
    </div>
  );
}
