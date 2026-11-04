import "server-only";
import { sql } from "./db";

// Registro de cambios: quién creó, cambió o borró qué (página «Registro»).
// Nunca debe romper la acción que lo llama: si falla el apunte, se ignora.

export type AuditUser = { uid: number; name: string } | null;
export type AuditAction = "crear" | "editar" | "borrar" | "entrar" | "importar" | "otro";

export async function audit(user: AuditUser, action: AuditAction, entity: string, summary: string,
  link?: { href?: string; id?: string | number | null }) {
  try {
    await sql`insert into activity_log ${sql({
      user_id: user?.uid ?? null, user_name: user?.name ?? "Sistema", action, entity, summary: summary.slice(0, 500),
      entity_id: link?.id != null ? String(link.id) : null, href: link?.href ?? null,
    })}`;
  } catch {
    // el registro es informativo: no bloquea nada
  }
}
