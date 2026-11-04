import ImportForm from "@/components/ImportForm";
import { requireDireccion } from "@/lib/auth";
import { type ImportKind, TEMPLATES } from "@/lib/importar";

export const metadata = { title: "Importar" };

// Orden recomendado: primero clientes, luego cocinas (que usan los clientes) y el stock cuando se haga el recuento.
const ORDER: ImportKind[] = ["clientes", "cocinas", "stock"];

export default async function Importar() {
  await requireDireccion();
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="h1">Importar desde Excel</h1>
        <p className="text-muted">
          Para pasar del papel a la web sin teclear uno a uno. Descarga la plantilla, rellénala y súbela:
          antes de guardar nada verás qué entra, qué ya existía y qué tiene errores. Se puede hacer por partes y repetir: lo que ya existe no se duplica.
        </p>
      </div>
      {ORDER.map((k, i) => (
        <section key={k} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{i + 1}. {TEMPLATES[k].title}</p>
              <p className="text-sm text-muted">{TEMPLATES[k].help}</p>
            </div>
            <a href={`/api/plantillas/${k}`} className="btn-light shrink-0 text-sm">Descargar plantilla</a>
          </div>
          <ImportForm kind={k} />
        </section>
      ))}
    </div>
  );
}
