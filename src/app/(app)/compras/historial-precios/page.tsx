import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";

export default async function HistorialPreciosPage() {
  await requireRole("COMPRAS");

  const historial = await prisma.historialPrecio.findMany({
    include: { servicio: true, cambiadoPor: true },
    orderBy: { fecha: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Historial de precios</h1>
        <p className="text-slate-500">Contexto de cambios previos para negociar con los proveedores.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Anterior</th>
              <th className="px-4 py-3">Nuevo</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Cambiado por</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h) => (
              <tr key={h.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{formatFecha(h.fecha)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {h.servicio.proveedor} — {h.servicio.descripcion}
                </td>
                <td className="px-4 py-3">{formatMoneda(h.precioAnterior)}</td>
                <td className="px-4 py-3">{formatMoneda(h.precioNuevo)}</td>
                <td className="px-4 py-3 text-slate-600">{h.motivo}</td>
                <td className="px-4 py-3 text-slate-600">{h.cambiadoPor.nombre}</td>
              </tr>
            ))}
            {historial.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Sin cambios de precio registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
