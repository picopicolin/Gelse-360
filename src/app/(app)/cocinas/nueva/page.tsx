import Link from "next/link";
import KitchenForm from "@/components/KitchenForm";
import { requireDireccion } from "@/lib/auth";
import { kitchenFormData } from "@/lib/kitchens";

export const metadata = { title: "Nueva cocina" };

export default async function NuevaCocina({ searchParams }: { searchParams: Promise<{ cliente?: string; error?: string }> }) {
  await requireDireccion();
  const { cliente, error } = await searchParams;
  const data = await kitchenFormData();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/cocinas" className="text-sm text-muted hover:text-ink">← Cocinas</Link>
      <h1 className="h1">Nueva cocina</h1>
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Faltan el cliente o el nombre de la cocina.</p>}
      {data.clients.length === 0 ? (
        <p className="card p-5">Primero hace falta un cliente. <Link href="/clientes/nuevo" className="underline">Crear cliente</Link></p>
      ) : (
        <KitchenForm kitchen={{ client_id: Number(cliente) || undefined }} {...data} />
      )}
    </div>
  );
}
