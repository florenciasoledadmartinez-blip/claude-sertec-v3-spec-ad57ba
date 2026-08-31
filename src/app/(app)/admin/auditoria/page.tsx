import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatFechaHora } from "@/lib/format";

export default async function AdminAuditoriaPage() {
  await requireRole("ADMIN");

  const eventos = await prisma.auditoria.findMany({
    include: { usuario: true },
    orderBy: { fecha: "desc" },
    take: 300,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Trazabilidad global</h1>
        <p className="text-slate-500">Quién hizo qué y cuándo, en cada paso del circuito (últimos 300 eventos).</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatFechaHora(e.fecha)}</td>
                <td className="px-4 py-3 text-slate-700">{e.usuario?.nombre ?? "Sistema"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {e.entidadTipo} · {e.entidadId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{e.accion}</td>
                <td className="px-4 py-3 text-slate-500">{e.detalle}</td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sin eventos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
