import NavesView from "@/components/naves/NavesView";
import { requireDireccion } from "@/lib/auth";
import { loadNavesData } from "@/lib/naves-data";

export const metadata = { title: "Naves 3D" };

export default async function Naves() {
  const user = await requireDireccion();
  const data = await loadNavesData();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="h1">Naves</h1>
        <p className="text-sm text-muted">Showroom y fábrica con los datos de ahora. Distribución aproximada, a corregir con planos.</p>
      </div>
      <NavesView data={data} direccion={user.role === "direccion"} />
    </div>
  );
}
