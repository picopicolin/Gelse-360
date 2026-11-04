"use client";

import { useState } from "react";
import { importExcel, type ImportResult } from "@/app/(app)/importar/actions";

type Row = Extract<ImportResult, { mode: "preview" }>["rows"][number];

const TONE = { nuevo: "bg-ok/15 text-ok", existe: "bg-line text-muted", error: "bg-bad/15 text-bad" };
const LABEL = { nuevo: "Entra", existe: "Ya existe", error: "Error" };

/** Subir una plantilla rellena: primero se ve qué entra y qué no, y solo después se importa. */
export default function ImportForm({ kind }: { kind: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(mode: "preview" | "commit", f = file) {
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("mode", mode);
    fd.set("file", f);
    const res = await importExcel(fd);
    setBusy(false);
    if (!res.ok) { setMsg({ text: res.error, bad: true }); setRows(null); return; }
    if (res.mode === "preview") { setRows(res.rows); setMsg(null); return; }
    setMsg({ text: `Importado: ${res.saved} ${res.saved === 1 ? "fila" : "filas"}.` });
    setRows(null);
    setFile(null);
  }

  const count = (s: Row["status"]) => rows?.filter((r) => r.status === s).length ?? 0;

  return (
    <div className="space-y-3">
      <label className="btn-light cursor-pointer">
        {file ? `Cambiar Excel (${file.name})` : "Elegir Excel relleno…"}
        <input type="file" accept=".xlsx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setMsg(null); setRows(null); if (f) run("preview", f); e.target.value = ""; }} />
      </label>
      {busy && <p className="text-sm text-muted">Leyendo…</p>}
      {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.bad ? "bg-bad/10 text-bad" : "bg-ok/10 text-ok"}`}>{msg.text}</p>}
      {rows && (
        <div className="space-y-3">
          <p className="text-sm">
            <span className="font-medium text-ok">{count("nuevo")} {count("nuevo") === 1 ? "entra" : "entran"}</span>
            {count("existe") > 0 && <> · <span className="text-muted">{count("existe")} ya {count("existe") === 1 ? "existe" : "existen"}</span></>}
            {count("error") > 0 && <> · <span className="font-medium text-bad">{count("error")} con errores (no entran: corrígelas en el Excel y vuelve a subirlo)</span></>}
          </p>
          <div className="max-h-96 overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-b border-line last:border-0">
                    <td className="w-14 p-2 text-muted">Fila {r.line}</td>
                    <td className="p-2">{r.label}{r.notes.length > 0 && <span className="block text-xs text-muted">{r.notes.join(" · ")}</span>}</td>
                    <td className="p-2 text-right"><span className={`rounded-full px-2 py-0.5 text-xs ${TONE[r.status]}`}>{LABEL[r.status]}</span></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="p-3 text-muted">El Excel no tiene filas.</td></tr>}
              </tbody>
            </table>
          </div>
          {count("nuevo") > 0 && (
            <button disabled={busy} onClick={() => run("commit")} className="btn">Importar {count("nuevo")} {count("nuevo") === 1 ? "fila" : "filas"}</button>
          )}
        </div>
      )}
    </div>
  );
}
