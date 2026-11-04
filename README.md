# Gelse Gestión

Programa de gestión de Gelse Cocinas: clientes, cocinas y sus fases, hoja de fábrica, stock, planos, montajes, cobros y las naves en 3D.

- Next.js 15 + TypeScript + Tailwind v4 · Postgres (`postgres`, `prepare:false`) · Supabase (base y archivos) · Vercel.
- Local: Postgres en el puerto 5433 (base `gelse`), `npm run dev` en el puerto 3211.
- Esquema: `db/schema.sql` (idempotente) → `npm run db:schema` (local) / `npm run nube:esquema` (Supabase).
- Subir a la nube: [docs/cuentas.md](docs/cuentas.md) · Copias de seguridad: [docs/copias.md](docs/copias.md).
- Distribución de las naves del 3D: `src/lib/naves.ts` (aproximada, a corregir con planos).
