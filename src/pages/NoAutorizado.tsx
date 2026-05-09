export default function NoAutorizado() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-xl border p-6">
        <h1 className="text-2xl font-semibold mb-2">No autorizado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
      </div>
    </div>
  );
}