import Link from "next/link";
import { requireRole, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { periodoLabel } from "@/lib/periodos";

export default async function ServiciosPage() {
  const user = await requireRole("RESPONSABLE_OPERATIVO");

  const servicios = await prisma.servicio.findMany({
    where: hasRole(user, "ADMIN") ? {} : { responsableOperativoId: user.id },
    include: { responsableOperativo: true, prestaciones: { where: { estado: "PENDIENTE" } } },
    orderBy: [{ activo: "desc" }, { proveedor: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mis servicios</h1>
          <p className="text-slate-500">Servicios contratados sin orden de compra ni remito.</p>
        </div>
        <Link
          href="/servicios/nuevo"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nuevo servicio
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Periodicidad</th>
              <th className="px-4 py-3">Precio vigente</th>
              <th className="px-4 py-3">Pendientes de certificar</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/servicios/${s.id}`} className="font-medium text-slate-900 hover:underline">
                    {s.proveedor}
                  </Link>
                  {hasRole(user, "ADMIN") && (
                    <div className="text-xs text-slate-400">Resp: {s.responsableOperativo.nombre}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.descripcion}</td>
                <td className="px-4 py-3 text-slate-600">{s.area}</td>
                <td className="px-4 py-3 text-slate-600">{periodoLabel(s.periodicidad)}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoneda(s.precioVigente)}</td>
                <td className="px-4 py-3">
                  {s.prestaciones.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {s.prestaciones.length}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.activo ? (
                    <span className="text-emerald-700">Activo</span>
                  ) : (
                    <span className="text-slate-400">Dado de baja</span>
                  )}
                </td>
              </tr>
            ))}
            {servicios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Todavía no tenés servicios cargados. Fecha de vigencia sugerida: {formatFecha(new Date("2026-04-01"))} en adelante.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
