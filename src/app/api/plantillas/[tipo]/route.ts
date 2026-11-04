import { getCurrentUser } from "@/lib/auth";
import { buildTemplate, isImportKind, TEMPLATES } from "@/lib/importar";

// Descarga de una plantilla Excel vacía (con una fila de ejemplo y desplegables). Solo dirección.
export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const me = await getCurrentUser();
  if (me?.role !== "direccion") return new Response("Sin permiso", { status: 403 });
  const { tipo } = await params;
  if (!isImportKind(tipo)) return new Response("No existe", { status: 404 });
  const buf = await buildTemplate(tipo);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(TEMPLATES[tipo].file)}`,
    },
  });
}
