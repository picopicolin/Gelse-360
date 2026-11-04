"use client";

import * as THREE from "three";

// Texturas del 3D dibujadas en el navegador (sin descargar imágenes): hormigón, asfalto, chapa, madera y el rótulo.
// Se crean una sola vez y se reutilizan en toda la escena.

const cache = new Map<string, THREE.Texture>();

/** Generador de números aleatorios con semilla: la misma textura siempre sale igual. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Ruido de manchas suaves sobre un color base (hormigón, asfalto). */
function speckle(ctx: CanvasRenderingContext2D, s: number, base: string, dots: [string, number][], seed: number) {
  const r = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // Manchas grandes y difusas (desgaste)
  for (let i = 0; i < 40; i++) {
    const x = r() * s, y = r() * s, rad = 20 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(0,0,0,${0.02 + r() * 0.04})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Grano fino
  for (const [color, n] of dots) {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) ctx.fillRect(r() * s, r() * s, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}

/** Suelo de nave: hormigón pulido con juntas de dilatación cada 5 m (la textura cubre 5 × 5 m). */
export const concreteTex = (repeat: [number, number]) =>
  make(`concrete-${repeat}`, 512, (ctx, s) => {
    speckle(ctx, s, "#bdbab3", [["rgba(255,255,255,0.18)", 5000], ["rgba(60,55,50,0.14)", 5000]], 7);
    ctx.strokeStyle = "rgba(70,65,60,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
  }, repeat);

/** Suelo pulido claro del showroom (gres grande). */
export const showroomFloorTex = (repeat: [number, number]) =>
  make(`tiles-${repeat}`, 512, (ctx, s) => {
    speckle(ctx, s, "#e9e4dc", [["rgba(255,255,255,0.3)", 2500], ["rgba(120,110,100,0.08)", 2500]], 11);
    ctx.strokeStyle = "rgba(150,140,130,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, s / 2, s / 2);
    ctx.strokeRect(s / 2, s / 2, s / 2, s / 2);
    ctx.strokeRect(s / 2, 0, s / 2, s / 2);
    ctx.strokeRect(0, s / 2, s / 2, s / 2);
  }, repeat);

export const asphaltTex = (repeat: [number, number]) =>
  make(`asphalt-${repeat}`, 512, (ctx, s) => {
    speckle(ctx, s, "#4b4e53", [["rgba(255,255,255,0.10)", 9000], ["rgba(0,0,0,0.25)", 9000]], 3);
  }, repeat);

export const sidewalkTex = (repeat: [number, number]) =>
  make(`sidewalk-${repeat}`, 256, (ctx, s) => {
    speckle(ctx, s, "#c9c5bd", [["rgba(255,255,255,0.2)", 1500], ["rgba(0,0,0,0.08)", 1500]], 5);
    ctx.strokeStyle = "rgba(90,85,80,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, (i * s) / 4); ctx.lineTo(s, (i * s) / 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo((i * s) / 4, 0); ctx.lineTo((i * s) / 4, s); ctx.stroke(); }
  }, repeat);

/** Chapa grecada de fachada industrial (ondas verticales con luces y sombras). */
export const metalPanelTex = (repeat: [number, number], tint = "#d9dcdf") =>
  make(`metal-${tint}-${repeat}`, 256, (ctx, s) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, s, s);
    const ribs = 8;
    for (let i = 0; i < ribs; i++) {
      const x = (i * s) / ribs;
      const g = ctx.createLinearGradient(x, 0, x + s / ribs, 0);
      g.addColorStop(0, "rgba(255,255,255,0.35)");
      g.addColorStop(0.35, "rgba(255,255,255,0)");
      g.addColorStop(0.55, "rgba(0,0,0,0.16)");
      g.addColorStop(1, "rgba(0,0,0,0.02)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, s / ribs, s);
    }
    // Suciedad que baja desde arriba
    const dirt = ctx.createLinearGradient(0, 0, 0, s);
    dirt.addColorStop(0, "rgba(80,70,60,0.10)");
    dirt.addColorStop(1, "rgba(80,70,60,0)");
    ctx.fillStyle = dirt;
    ctx.fillRect(0, 0, s, s);
  }, repeat);

/** Veta de madera (nogal, roble) para frentes, mesas y palés. */
export const woodTex = (base: string, repeat: [number, number] = [1, 1]) =>
  make(`wood-${base}-${repeat}`, 256, (ctx, s) => {
    const r = rng(base.length * 97 + 13);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const y = r() * s;
      ctx.strokeStyle = `rgba(${r() < 0.5 ? "40,25,10" : "255,240,220"},${0.05 + r() * 0.12})`;
      ctx.lineWidth = 0.5 + r() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) ctx.lineTo(x, y + Math.sin(x / (20 + r() * 30) + i) * (2 + r() * 4));
      ctx.stroke();
    }
  }, repeat);

/** Rótulo de fachada: «gelse» en letras de tipografía con serifa sobre fondo transparente. */
export const signTex = () =>
  make("sign", 1024, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#1f1d1b";
    ctx.font = `600 ${s * 0.34}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("gelse", s / 2, s * 0.42);
    ctx.font = `${s * 0.075}px Arial, sans-serif`;
    ctx.fillStyle = "#6f6a64";
    ctx.fillText("C O C I N A S", s / 2, s * 0.7);
  });

/** Marcas viales: cebra y líneas discontinuas (blanco sobre transparente). */
export const stripesTex = () =>
  make("stripes", 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "rgba(245,245,240,0.92)";
    ctx.fillRect(0, 0, s / 2, s);
  });

// ── Relieve (normal maps) ──────────────────────────────────────────────
// Se dibuja un mapa de alturas en gris y se convierte en normales: así la luz marca las ondas de la chapa
// y el poro del hormigón aunque la geometría sea plana.

function normalFromHeight(key: string, size: number, drawHeight: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number], strength = 2) {
  const hit = cache.get(key);
  if (hit) return hit;
  const src = document.createElement("canvas");
  src.width = src.height = size;
  const sctx = src.getContext("2d")!;
  drawHeight(sctx, size);
  const h = sctx.getImageData(0, 0, size, size).data;
  const out = sctx.createImageData(size, size);
  const at = (x: number, y: number) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  sctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(src);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Ondas de la chapa grecada (8 ondas por textura, igual que metalPanelTex). */
export const metalNormal = (repeat: [number, number]) =>
  normalFromHeight(`n-metal-${repeat}`, 128, (ctx, s) => {
    for (let x = 0; x < s; x++) {
      const v = Math.round((0.5 + 0.5 * Math.sin((x / s) * Math.PI * 2 * 8)) * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 1, s);
    }
  }, repeat, 3);

/** Poro fino del hormigón y las juntas cada 5 m. */
export const concreteNormal = (repeat: [number, number]) =>
  normalFromHeight(`n-concrete-${repeat}`, 256, (ctx, s) => {
    const r = rng(21);
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) { const v = 100 + r() * 60; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2); }
    ctx.fillStyle = "rgb(40,40,40)";
    ctx.fillRect(0, 0, s, 2);
    ctx.fillRect(0, 0, 2, s);
  }, repeat, 1.5);

/** Asfalto: grano grueso. */
export const asphaltNormal = (repeat: [number, number]) =>
  normalFromHeight(`n-asphalt-${repeat}`, 256, (ctx, s) => {
    const r = rng(9);
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) { const v = 80 + r() * 120; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(r() * s, r() * s, 1 + r() * 2.5, 1 + r() * 2.5); }
  }, repeat, 2.5);

/** Césped: verde con matices (mediana, rotonda, parterres). */
export const grassTex = (repeat: [number, number]) =>
  make(`grass-${repeat}`, 256, (ctx, s) => {
    speckle(ctx, s, "#6f8a4a", [["rgba(150,180,90,0.35)", 7000], ["rgba(40,60,25,0.35)", 7000]], 17);
  }, repeat);
