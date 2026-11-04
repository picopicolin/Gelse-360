// Crea un usuario o le cambia la contraseña. Uso:
//   npm run user -- <usuario> "<Nombre>" <direccion|fabrica>
// La contraseña se pide por la terminal (no queda en el historial).
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { scriptDbUrl } from "./db-url.mts";

const [username, name, role = "direccion"] = process.argv.slice(2);
if (!username || !name || !["direccion", "fabrica"].includes(role)) {
  console.error('Uso: npm run user -- <usuario> "<Nombre>" <direccion|fabrica>');
  process.exit(1);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Contraseña (mínimo 8 caracteres): ");
rl.close();
if (password.length < 8) { console.error("Demasiado corta."); process.exit(1); }

const sql = postgres(scriptDbUrl(), { prepare: false });
const hash = await bcrypt.hash(password, 10);
await sql`insert into users (username, name, password_hash, role) values (${username.toLowerCase()}, ${name}, ${hash}, ${role})
          on conflict (username) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role,
            active = true, failed_logins = 0, locked_until = null`;
console.log(`Usuario «${username}» listo (${role}).`);
await sql.end();
