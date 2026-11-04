import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Almacén de archivos (planos, renders, fotos):
//  - En la nube: Supabase Storage (bucket PRIVADO), si hay SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
//  - En local: carpeta STORAGE_DIR (por defecto ./storage).
// Mismo contenido = misma clave (sha256), así no se duplica nada.
export const BUCKET = process.env.SUPABASE_BUCKET ?? "archivos";
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage");

let client: SupabaseClient | null = null;
function cloud() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const checkKey = (key: string) => {
  if (!/^[a-f0-9]{64}(\.[a-z0-9]{1,6})?$/.test(key)) throw new Error("Clave de archivo no válida");
  return `${key.slice(0, 2)}/${key}`;
};

export function extOf(filename: string) {
  const m = /\.([a-z0-9]{1,6})$/i.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

export const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
  dwg: "application/acad", dxf: "application/dxf", zip: "application/zip",
};
export const isImage = (mime: string) => mime.startsWith("image/") && mime !== "image/heic";

// Fotos de planos: se reducen a 3000 px por lado como máximo, que sigue dejando leer las cotas a mano
// y baja una foto de móvil de 3-5 MB a menos de 1 MB. Si algo falla o no ahorra, se guarda la original.
const SHRINK = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_SIDE = 3000;

async function shrinkImage(buf: Buffer, ext: string): Promise<Buffer> {
  if (!SHRINK.has(ext) || buf.length < 600 * 1024) return buf;
  try {
    const sharp = (await import("sharp")).default;
    const img = sharp(buf, { failOn: "none" }).rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    const out = ext === "png" ? await img.png({ compressionLevel: 9 }).toBuffer()
      : ext === "webp" ? await img.webp({ quality: 82 }).toBuffer()
      : await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return out.length < buf.length ? out : buf;
  } catch {
    return buf;
  }
}

/** Guarda el contenido y devuelve su clave. */
export async function putFile(original: Buffer, filename: string) {
  const ext = extOf(filename);
  const buf = await shrinkImage(original, ext);
  const hash = createHash("sha256").update(buf).digest("hex");
  const key = ext ? `${hash}.${ext}` : hash;
  const rel = checkKey(key);
  const mime = MIME[ext] ?? "application/octet-stream";
  const sb = cloud();
  if (sb) {
    const { error } = await sb.storage.from(BUCKET).upload(rel, buf, { contentType: mime, upsert: true });
    if (error) throw new Error(`No se ha podido guardar el archivo: ${error.message}`);
  } else {
    const full = path.join(ROOT, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf);
  }
  return { key, size: buf.length, mime };
}

export async function getFile(key: string): Promise<Buffer> {
  const rel = checkKey(key);
  const sb = cloud();
  if (sb) {
    const { data, error } = await sb.storage.from(BUCKET).download(rel);
    if (error || !data) throw new Error("Archivo no encontrado");
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(path.join(ROOT, rel));
}
