import { login } from "./actions";

export const metadata = { title: "Acceso" };

const ERRORS: Record<string, string> = {
  inactivo: "Tu usuario está desactivado. Habla con dirección.",
  bloqueado: "Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={login} className="card w-full max-w-sm space-y-5 p-8 shadow-sm">
        <div className="text-center">
          <p className="font-serif text-4xl tracking-tight">gelse</p>
          <p className="mt-1 text-sm text-muted">Gestión</p>
        </div>
        {error && (
          <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{ERRORS[error] ?? "Usuario o contraseña incorrectos."}</p>
        )}
        <div>
          <label className="label" htmlFor="username">Usuario</label>
          <input className="input" id="username" name="username" autoComplete="username" autoCapitalize="none" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn w-full py-3 text-lg">Entrar</button>
      </form>
    </main>
  );
}
