// Firma y verificación de la cookie de sesión. Sin dependencias de servidor: la usa también el middleware.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "gelse_session";
// En la fábrica la tablet se queda encendida: la sesión dura 12 horas (un turno largo).
export const SESSION_HOURS = 12;

export type Role = "direccion" | "fabrica";
export type Session = { uid: number; name: string; role: Role };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: Number(payload.uid), name: String(payload.name), role: payload.role === "direccion" ? "direccion" : "fabrica" };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/",
  maxAge: SESSION_HOURS * 3600,
};
