"use client";

import { useRef, useState } from "react";
import { uploadKitchenFiles } from "@/app/(app)/cocinas/archivos-actions";

// Las fotos del móvil se reducen en el navegador antes de subirlas (máx. 3000 px, JPEG):
// suben más rápido y no pasan del límite de tamaño de Vercel. Los PDF van tal cual.
const MAX_SIDE = 3000;

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function UploadFiles({ kitchenId }: { kitchenId: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("plano");
  const [state, setState] = useState<{ busy: boolean; msg?: string; bad?: boolean }>({ busy: false });

  async function send(files: FileList | null) {
    if (!files?.length) return;
    setState({ busy: true, msg: `Subiendo ${files.length}…` });
    const fd = new FormData();
    fd.set("kitchen_id", String(kitchenId));
    fd.set("kind", kind);
    for (const f of Array.from(files)) fd.append("files", await shrink(f));
    try {
      const res = await uploadKitchenFiles(fd);
      setState({
        busy: false, bad: res.failed.length > 0,
        msg: `${res.ok} subido${res.ok === 1 ? "" : "s"}${res.failed.length ? `. No se han podido subir: ${res.failed.join(", ")}` : "."}`,
      });
    } catch {
      setState({ busy: false, bad: true, msg: "No se ha podido subir. Si es un PDF muy grande, prueba con uno de menos de 4 MB." });
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={kind} onChange={(e) => setKind(e.target.value)} className="input w-auto py-2 text-sm" aria-label="Tipo">
        <option value="plano">Plano</option>
        <option value="render">Render</option>
        <option value="foto">Foto de la obra</option>
        <option value="otro">Otro</option>
      </select>
      <input ref={input} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => send(e.target.files)} />
      <button type="button" disabled={state.busy} onClick={() => input.current?.click()} className="btn py-2 text-sm">
        {state.busy ? "Subiendo…" : "+ Subir archivos"}
      </button>
      {state.msg && !state.busy && <span className={`text-sm ${state.bad ? "text-bad" : "text-ok"}`}>{state.msg}</span>}
    </div>
  );
}
