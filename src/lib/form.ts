// Lectura de formularios: texto recortado (vacío → null), números con coma o punto, fechas.

export const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export const money = (fd: FormData, k: string) => {
  const v = text(fd, k);
  if (v == null) return null;
  // «12.500,50» (con coma decimal, los puntos son de miles) o «12500.50».
  const n = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

export const date = (fd: FormData, k: string) => {
  const v = text(fd, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export const eur = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const dmy = (d: string | null | undefined) => (d ? d.split("-").reverse().join("/") : "—");
