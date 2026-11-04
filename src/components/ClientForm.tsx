import { saveClient } from "@/app/(app)/clientes/actions";

type Client = {
  id?: number; kind?: string; name?: string; contact?: string | null; nif?: string | null; phone?: string | null;
  email?: string | null; address?: string | null; city?: string | null; postal_code?: string | null; notes?: string | null;
};

const Field = ({ label, name, value, type = "text", wide }: { label: string; name: string; value?: string | null; type?: string; wide?: boolean }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label className="label" htmlFor={name}>{label}</label>
    <input className="input" id={name} name={name} type={type} defaultValue={value ?? ""} />
  </div>
);

/** Formulario de cliente: el mismo para el alta y para editar. */
export default function ClientForm({ client = {} }: { client?: Client }) {
  return (
    <form action={saveClient} className="card grid gap-4 p-5 sm:grid-cols-2">
      {client.id && <input type="hidden" name="id" value={client.id} />}
      <div className="sm:col-span-2">
        <span className="label">Tipo</span>
        <div className="flex gap-2">
          {[["particular", "Particular"], ["profesional", "Profesional"]].map(([v, l]) => (
            <label key={v} className="btn-light cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="radio" name="kind" value={v} defaultChecked={(client.kind ?? "particular") === v} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Nombre o empresa *</label>
        <input className="input" id="name" name="name" defaultValue={client.name ?? ""} required />
      </div>
      <Field label="Persona de contacto (si es empresa)" name="contact" value={client.contact} />
      <Field label="NIF / CIF" name="nif" value={client.nif} />
      <Field label="Teléfono" name="phone" value={client.phone} type="tel" />
      <Field label="Email" name="email" value={client.email} type="email" />
      <Field label="Dirección" name="address" value={client.address} wide />
      <Field label="Población" name="city" value={client.city} />
      <Field label="Código postal" name="postal_code" value={client.postal_code} />
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notas</label>
        <textarea className="input min-h-24" id="notes" name="notes" defaultValue={client.notes ?? ""} />
      </div>
      <div className="sm:col-span-2"><button className="btn">Guardar cliente</button></div>
    </form>
  );
}
