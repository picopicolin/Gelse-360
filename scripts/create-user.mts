// Crea un usuario o le cambia la contraseña. Uso:
//   npm run user -- <usuario> <Nombre y apellidos> <direccion|fabrica>          (base local)
//   npm run nube:usuario -- <usuario> <Nombre y apellidos> <direccion|fabrica>  (Supabase)
// El nombre puede ir sin comillas (en Windows npm las quita). La contraseña se pide por la terminal, sin verse.
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { scriptDbUrl } from "./db-url.mts";

const ROLES = ["direccion", "fabrica"];
const args = process.argv.slice(2).filter((a) => a !== "--nube");
const role = ROLES.includes(args.at(-1) ?? "") ? args.pop()! : "direccion";
const [username, ...nameParts] = args;
const name = nameParts.join(" ").trim();
if (!username || !name) {
  console.error("Uso: npm run nube:usuario -- <usuario> <Nombre y apellidos> <direccion|fabrica>");
  process.exit(1);
}

/** Pide un texto sin mostrarlo (como las contraseñas en cualquier terminal). */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) { // con la entrada redirigida (pruebas), se lee tal cual
      let buf = "";
      stdin.on("data", (d) => (buf += d)).on("end", () => resolve(buf.split(/\r?\n/)[0]));
      return;
    }
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false); stdin.pause(); stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1); // Ctrl-C
        if (c === "\u007f" || c === "\b") { if (value) { value = value.slice(0, -1); process.stdout.write("\b \b"); } continue; }
        value += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

console.log(`Usuario «${username.toLowerCase()}» · ${name} · ${role}${process.argv.includes("--nube") ? " · EN LA NUBE" : " · local"}`);
const password = await askHidden("Contraseña (mínimo 8 caracteres): ");
if (password.length < 8) { console.error("Demasiado corta."); process.exit(1); }
const again = process.stdin.isTTY ? await askHidden("Repítela: ") : password;
if (again !== password) { console.error("No coinciden. No se ha guardado nada."); process.exit(1); }

const sql = postgres(scriptDbUrl(), { prepare: false });
const hash = await bcrypt.hash(password, 10);
await sql`insert into users (username, name, password_hash, role) values (${username.toLowerCase()}, ${name}, ${hash}, ${role})
          on conflict (username) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role,
            active = true, failed_logins = 0, locked_until = null`;
console.log(`Listo: ya puedes entrar con el usuario «${username.toLowerCase()}».`);
await sql.end();
