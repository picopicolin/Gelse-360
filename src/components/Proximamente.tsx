/** Hueco de una sección que aún no está hecha: dice en qué fase llega y qué tendrá. */
export default function Proximamente({ title, fase, items }: { title: string; fase: number; items: string[] }) {
  return (
    <div className="space-y-5">
      <h1 className="h1">{title}</h1>
      <div className="card p-6">
        <p className="text-sm font-medium text-wood">Llega en la fase {fase}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </div>
  );
}
