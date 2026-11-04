import Link from "next/link";
import ClientForm from "@/components/ClientForm";
import { requireDireccion } from "@/lib/auth";

export const metadata = { title: "Nuevo cliente" };

export default async function NuevoCliente({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireDireccion();
  const { error } = await searchParams;
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/clientes" className="text-sm text-muted hover:text-ink">← Clientes</Link>
      <h1 className="h1">Nuevo cliente</h1>
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Falta el nombre.</p>}
      <ClientForm />
    </div>
  );
}
