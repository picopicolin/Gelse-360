import { sql } from "@/lib/db";

// Comprobación después de desplegar: la web responde y llega a la base de datos.
export async function GET() {
  try {
    await sql`select 1`;
    return Response.json({ ok: true, db: true });
  } catch {
    return Response.json({ ok: false, db: false }, { status: 500 });
  }
}
