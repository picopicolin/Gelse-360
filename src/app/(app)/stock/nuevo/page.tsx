import Link from "next/link";
import StockItemForm from "@/components/StockItemForm";
import { requireDireccion } from "@/lib/auth";

export const metadata = { title: "Nuevo material" };

export default async function NuevoMaterial({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireDireccion();
  const { error } = await searchParams;
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/stock" className="text-sm text-muted hover:text-ink">← Stock</Link>
      <h1 className="h1">Nuevo material</h1>
      {error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Falta el nombre del material.</p>}
      <StockItemForm />
    </div>
  );
}
