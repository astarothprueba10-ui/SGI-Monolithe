export function EstadoCatalogoProyectos({ loading, error, empty, retry }: {
  loading: boolean; error: string; empty: boolean; retry: () => void;
}) {
  if (loading) return <p role="status" className="text-sm text-muted">Cargando proyectos…</p>;
  if (!error && !empty) return null;
  return <div role="alert" className="text-sm text-muted">
    <p>{error || 'No hay proyectos activos disponibles. Puedes consultar por WhatsApp, teléfono o correo.'}</p>
    <button type="button" className="mt-2 font-medium text-brand underline" onClick={retry}>Volver a cargar proyectos</button>
  </div>;
}
