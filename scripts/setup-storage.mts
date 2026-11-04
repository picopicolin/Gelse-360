// Crea en Supabase el almacén PRIVADO de archivos (planos, fotos), si no existe. Uso: npm run nube:almacen
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = process.env.SUPABASE_BUCKET ?? "archivos";
const { data } = await sb.storage.getBucket(bucket);
if (data) {
  console.log(`El almacén «${bucket}» ya existe (${data.public ? "PÚBLICO: revisar" : "privado"}).`);
} else {
  const { error } = await sb.storage.createBucket(bucket, { public: false, fileSizeLimit: "25MB" });
  if (error) throw new Error(error.message);
  console.log(`Almacén «${bucket}» creado (privado).`);
}
