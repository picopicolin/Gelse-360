// Dirección de la base para los scripts: la local (DATABASE_URL) o, con «--nube», la de Supabase (SUPABASE_DB_URL).
export function scriptDbUrl() {
  const cloud = process.argv.includes("--nube");
  const raw = cloud ? process.env.SUPABASE_DB_URL : process.env.DATABASE_URL;
  if (!raw) throw new Error(cloud ? "Falta SUPABASE_DB_URL en .env.local" : "Falta DATABASE_URL en .env.local");
  const url = new URL(raw);
  const password = cloud ? process.env.SUPABASE_DB_PASSWORD : process.env.DB_PASSWORD;
  if (password) url.password = encodeURIComponent(password);
  return url.toString();
}
