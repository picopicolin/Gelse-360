import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getFile } from "@/lib/storage";

// Descarga de un archivo de cocina. Cualquier usuario con sesión (fábrica también ve los planos).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Sin sesión", { status: 401 });
  const [f] = await sql`select key, mime, name from kitchen_files where id = ${Number((await params).id) || 0} and deleted_at is null`;
  if (!f) return new Response("No encontrado", { status: 404 });
  try {
    const buf = await getFile(f.key);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
        // El contenido de una clave no cambia nunca (es su sha256): se puede guardar en caché.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
