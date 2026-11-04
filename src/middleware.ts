import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Todo requiere sesión salvo la pantalla de acceso y la comprobación de salud.
export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/api/health") return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session && p !== "/login") return NextResponse.redirect(new URL("/login", req.url));
  if (session && p === "/login") return NextResponse.redirect(new URL(session.role === "fabrica" ? "/fabrica" : "/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo-gelse.svg|robots.txt).*)"],
};
