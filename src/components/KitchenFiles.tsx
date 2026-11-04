import { removeKitchenFile } from "@/app/(app)/cocinas/archivos-actions";
import { sql } from "@/lib/db";
import { isImage } from "@/lib/storage";
import ConfirmButton from "./ConfirmButton";
import UploadFiles from "./UploadFiles";

const KIND_LABEL: Record<string, string> = { plano: "Planos", render: "Renders", foto: "Fotos de la obra", otro: "Otros" };

/** Planos, renders y fotos de una cocina, en miniatura. Al tocar uno se abre entero en otra pestaña. */
export default async function KitchenFiles({ kitchenId, editable = true }: { kitchenId: number; editable?: boolean }) {
  const files = await sql`select id, kind, name, mime, size from kitchen_files
                          where kitchen_id = ${kitchenId} and deleted_at is null order by kind, created_at`;
  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Planos y archivos {files.length > 0 && <span className="text-muted">{files.length}</span>}</p>
        {editable && <UploadFiles kitchenId={kitchenId} />}
      </div>
      {files.length === 0 && <p className="text-sm text-muted">Aún no hay planos. Se pueden subir fotos o PDF; desde la tablet o el móvil se puede hacer la foto directamente.</p>}
      {Object.entries(KIND_LABEL).map(([kind, label]) => {
        const list = files.filter((f) => f.kind === kind);
        if (!list.length) return null;
        return (
          <div key={kind}>
            <p className="mb-2 text-sm text-muted">{label}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((f) => (
                <div key={f.id} className="group relative overflow-hidden rounded-xl border border-line bg-paper">
                  <a href={`/api/archivos/${f.id}`} target="_blank" rel="noreferrer" className="block">
                    {isImage(f.mime) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/archivos/${f.id}`} alt={f.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] w-full items-center justify-center text-2xl font-semibold text-muted">
                        {f.mime === "application/pdf" ? "PDF" : "Archivo"}
                      </span>
                    )}
                    <span className="block truncate px-2 py-1.5 text-xs">{f.name}</span>
                  </a>
                  {editable && (
                    <form action={removeKitchenFile} className="absolute top-1.5 right-1.5">
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton message={`¿Quitar «${f.name}»?`} className="rounded-full bg-white/90 px-2 py-0.5 text-sm text-muted shadow hover:text-bad">✕</ConfirmButton>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
