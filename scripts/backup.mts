// Copia de seguridad: la base de datos entera (pg_dump) y los archivos (planos, fotos).
// Uso:  npm run backup            → base local
//       npm run backup -- --nube  → base de Supabase (SUPABASE_DB_URL + SUPABASE_DB_PASSWORD) y su almacén
// Se guarda en BACKUP_DIR (por defecto OneDrive\Copias de seguridad\Gelse, que ya se sube a la nube de Microsoft).
// No borra copias antiguas: cada una ocupa poco y así se puede volver a cualquier día.
import { execFileSync } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const cloud = process.argv.includes("--nube");
const OUT = process.env.BACKUP_DIR ?? "C:/Users/polga/OneDrive/Copias de seguridad/Gelse";
const PG_BIN = process.env.PG_BIN ?? "C:/Program Files/PostgreSQL/17/bin";

const rawUrl = cloud ? process.env.SUPABASE_DB_URL : process.env.DATABASE_URL;
const password = cloud ? process.env.SUPABASE_DB_PASSWORD : process.env.DB_PASSWORD;
if (!rawUrl) throw new Error(cloud ? "Falta SUPABASE_DB_URL en .env.local" : "Falta DATABASE_URL");
const url = new URL(rawUrl);
url.password = "";
// pg_dump no funciona con el pooler de Supabase en modo transacción (6543): se usa el modo sesión (5432).
if (cloud && url.port === "6543") url.port = "5432";

const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "_").replace(/:/g, "-").slice(0, 16);
const dbDir = path.join(OUT, "base de datos");
mkdirSync(dbDir, { recursive: true });
const dumpFile = path.join(dbDir, `gelse-${cloud ? "nube" : "local"}-${stamp}.dump`);

// 1) Base de datos, en formato de pg_restore (comprimido).
execFileSync(path.join(PG_BIN, "pg_dump.exe"), ["-Fc", "--no-owner", "--no-privileges", "-f", dumpFile, url.toString()], {
  env: { ...process.env, PGPASSWORD: password ?? "" }, stdio: ["ignore", "inherit", "inherit"],
});
const dbSize = statSync(dumpFile).size;

// 2) Archivos. Su nombre es su huella (sha256): nunca cambian, así que solo se copian los que faltan.
const filesDir = path.join(OUT, "archivos");
mkdirSync(filesDir, { recursive: true });
const have = new Set(readdirSync(filesDir));
let copied = 0;
if (cloud) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const bucket = sb.storage.from(process.env.SUPABASE_BUCKET ?? "archivos");
  const { data: dirs } = await bucket.list("", { limit: 1000 });
  for (const d of dirs ?? []) {
    for (let offset = 0; ; offset += 1000) {
      const { data: list } = await bucket.list(d.name, { limit: 1000, offset });
      if (!list?.length) break;
      for (const f of list) {
        if (have.has(f.name)) continue;
        const { data } = await bucket.download(`${d.name}/${f.name}`);
        if (data) { writeFileSync(path.join(filesDir, f.name), Buffer.from(await data.arrayBuffer())); copied++; }
      }
      if (list.length < 1000) break;
    }
  }
} else {
  const root = path.resolve(process.env.STORAGE_DIR ?? "storage");
  if (existsSync(root)) {
    for (const d of readdirSync(root)) {
      for (const f of readdirSync(path.join(root, d))) {
        if (!have.has(f)) { copyFileSync(path.join(root, d, f), path.join(filesDir, f)); copied++; }
      }
    }
  }
}

const line = `${stamp}  ${cloud ? "nube " : "local"}  base ${(dbSize / 1024).toFixed(0)} KB  ·  ${copied} archivos nuevos (${readdirSync(filesDir).length} en total)`;
appendFileSync(path.join(OUT, "registro de copias.txt"), line + "\n");
console.log(`Copia hecha en ${OUT}\n${line}`);
