import { requireDireccion } from "@/lib/auth";
import { sql } from "@/lib/db";
import { saveUser, toggleUser } from "./actions";

export const metadata = { title: "Usuarios" };

const ERRORS: Record<string, string> = {
  datos: "Revisa los datos: el usuario va en minúsculas, sin espacios (3 a 30 letras o números).",
  corta: "La contraseña tiene que tener al menos 8 caracteres.",
  propio: "No puedes desactivar tu propio usuario.",
};

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await requireDireccion();
  const { error, ok } = await searchParams;
  const users = await sql`select id, username, name, role, active, locked_until > now() as locked from users order by active desc, name`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Usuarios</h1>
        <p className="text-muted">Dirección lo ve y lo cambia todo. Fábrica solo apunta stock y marca muebles hechos.</p>
      </div>
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{ERRORS[error] ?? "No se ha podido guardar."}</p>}
      {ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">Guardado.</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr><th className="p-3">Nombre</th><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-line last:border-0 ${u.active ? "" : "text-muted"}`}>
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.role === "direccion" ? "Dirección" : "Fábrica"}</td>
                <td className="p-3">{!u.active ? "Desactivado" : u.locked ? "Bloqueado 15 min" : "Activo"}</td>
                <td className="p-3 text-right">
                  {u.id !== me.uid && (
                    <form action={toggleUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="btn-light py-1.5 text-sm">{u.active ? "Desactivar" : "Activar"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={saveUser} className="card grid gap-4 p-5 sm:grid-cols-2">
        <p className="font-medium sm:col-span-2">Nuevo usuario o cambiar contraseña</p>
        <div><label className="label" htmlFor="name">Nombre</label><input className="input" id="name" name="name" required /></div>
        <div><label className="label" htmlFor="username">Usuario</label><input className="input" id="username" name="username" autoCapitalize="none" placeholder="p. ej. sergio" required /></div>
        <div><label className="label" htmlFor="password">Contraseña</label><input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <div>
          <label className="label" htmlFor="role">Rol</label>
          <select className="input" id="role" name="role" defaultValue="fabrica">
            <option value="direccion">Dirección</option>
            <option value="fabrica">Fábrica</option>
          </select>
        </div>
        <div className="sm:col-span-2"><button className="btn">Guardar usuario</button></div>
      </form>
    </div>
  );
}
