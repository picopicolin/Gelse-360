import Link from "next/link";
import Nav from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { SECTIONS } from "@/lib/nav";
import { logout } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = SECTIONS.filter((s) => s.roles.includes(user.role));
  return (
    <div className="lg:flex">
      <aside className="sticky top-0 z-20 border-b border-line bg-white px-3 py-3 lg:h-screen lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
        <div className="mb-3 flex items-center justify-between lg:mb-8 lg:block lg:px-2">
          <Link href={user.role === "fabrica" ? "/fabrica" : "/"} className="block">
            <span className="font-serif text-3xl leading-none tracking-tight">gelse</span>
            <span className="ml-2 text-xs text-muted lg:ml-0 lg:block">Gestión</span>
          </Link>
          <form action={logout} className="lg:hidden">
            <button className="text-sm text-muted hover:text-ink">Salir</button>
          </form>
        </div>
        <Nav links={links} />
        <div className="mt-6 hidden border-t border-line px-2 pt-4 text-sm text-muted lg:block">
          <p className="truncate font-medium text-ink">{user.name}</p>
          <p>{user.role === "direccion" ? "Dirección" : "Fábrica"}</p>
          <form action={logout}>
            <button className="mt-2 hover:text-ink">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-5 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
