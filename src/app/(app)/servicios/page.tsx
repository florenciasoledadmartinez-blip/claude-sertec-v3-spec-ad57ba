import Link from "next/link";
import { requireRole, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { formatMoneda, formatFecha } from "@/lib/format";
import { periodoLabel } from "@/lib/periodos";

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string; estado?: string; periodicidad?: string }>;
}) {
  const user = await requireRole("RESPONSABLE_OPERATIVO");
  const sp = await searchParams;

  const where: Prisma.ServicioWhereInput = hasRole(user, "ADMIN") ? {} : { responsableOperativoId: user.id };
  if (sp.proveedor) where.proveedor = { contains: sp.proveedor, mode: "insensitive" };
  if (sp.estado === "activo") where.activo = true;
  if (sp.estado === "baja") where.activo = false;
  if (sp.periodicidad) where.periodicidad = sp.periodicidad as Prisma.EnumPeriodicidadFilter["equals"];

  const servicios = await prisma.servicio.findMany({
    where,
    include: { responsableOperativo: true, prestaciones: { where: { estado: "PENDIENTE" } } },
    orderBy: [{ activo: "desc" }, { proveedor: "asc" }],
  });

  const facturas = await cargarFacturasConEstado({ servicioId: { in: servicios.map((s) => s.id) } });
  const conflictosPorServicio = new Map<string, number>();
  for (const f of facturas) {
    if (f.estado === "CONFLICTO_PRECIO") {
      conflictosPorServicio.set(f.servicioId, (conflictosPorServicio.get(f.servicioId) ?? 0) + 1);
    }
  }

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

      <form className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <input
          name="proveedor"
          defaultValue={sp.proveedor ?? ""}
          placeholder="Buscar por proveedor..."
          className="rounded-md border border-slate-300 px-2 py-1.5"
        />
        <select name="estado" defaultValue={sp.estado ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5">
          <option value="">Estado: todos</option>
          <option value="activo">Activo</option>
          <option value="baja">Dado de baja</option>
        </select>
        <select
          name="periodicidad"
          defaultValue={sp.periodicidad ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        >
          <option value="">Periodicidad: todas</option>
          <option value="MENSUAL">Mensual</option>
          <option value="QUINCENAL">Quincenal</option>
          <option value="TRIMESTRAL">Trimestral</option>
          <option value="ANUAL">Anual</option>
          <option value="POR_EVENTO">Por evento</option>
        </select>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Filtrar
        </button>
        <Link href="/servicios" className="rounded-md px-3 py-1.5 text-slate-500 hover:underline">
          Limpiar
        </Link>
      </form>

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
              <th className="px-4 py-3">Conflictos de precio</th>
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
                  {(conflictosPorServicio.get(s.id) ?? 0) > 0 ? (
                    <Link
                      href={`/servicios/${s.id}`}
                      className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 hover:underline"
                    >
                      {conflictosPorServicio.get(s.id)}
                    </Link>
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
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No hay servicios que coincidan con el filtro. Fecha de vigencia sugerida:{" "}
                  {formatFecha(new Date("2026-04-01"))} en adelante.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
