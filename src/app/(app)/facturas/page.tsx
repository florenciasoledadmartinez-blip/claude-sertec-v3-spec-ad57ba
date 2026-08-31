import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { formatMoneda, formatFecha } from "@/lib/format";
import { ESTADO_FACTURA_LABEL } from "@/lib/estado-factura";
import { EstadoBadge } from "./estado-badge";

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("ANALISTA_CXP", "GERENCIA");
  const sp = await searchParams;

  const servicios = await prisma.servicio.findMany({ orderBy: { proveedor: "asc" } });

  const where: Prisma.FacturaWhereInput = {};
  if (sp.servicioId) where.servicioId = sp.servicioId;
  if (sp.precioEstado) where.precioEstado = sp.precioEstado as Prisma.EnumPrecioEstadoFilter["equals"];
  if (sp.area || sp.proveedor) {
    where.servicio = {
      ...(sp.area ? { area: { equals: sp.area, mode: "insensitive" } } : {}),
      ...(sp.proveedor ? { proveedor: { contains: sp.proveedor, mode: "insensitive" } } : {}),
    };
  }

  let facturas = await cargarFacturasConEstado(where);
  if (sp.estado) facturas = facturas.filter((f) => f.estado === sp.estado);

  const areas = [...new Set(servicios.map((s) => s.area))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Facturas</h1>
          <p className="text-slate-500">Todas las facturas de servicio (categoría B), sin filtro por área.</p>
        </div>
        <Link
          href="/facturas/nueva"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Registrar factura
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <select name="servicioId" defaultValue={sp.servicioId ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5">
          <option value="">Servicio: todos</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.proveedor} — {s.descripcion}
            </option>
          ))}
        </select>
        <select name="area" defaultValue={sp.area ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5">
          <option value="">Área: todas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select name="precioEstado" defaultValue={sp.precioEstado ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5">
          <option value="">Precio: todos</option>
          <option value="PENDIENTE_CONFIRMAR">Pendiente de confirmar</option>
          <option value="COINCIDE">Coincide</option>
          <option value="CONFLICTO">No coincide</option>
        </select>
        <select name="estado" defaultValue={sp.estado ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5">
          <option value="">Estado: todos</option>
          {Object.entries(ESTADO_FACTURA_LABEL).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Filtrar
        </button>
        <Link href="/facturas" className="rounded-md px-3 py-1.5 text-slate-500 hover:underline">
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nº factura</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Importe</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                    {f.numeroFactura}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{f.servicio.proveedor}</td>
                <td className="px-4 py-3 text-slate-600">{formatFecha(f.fechaFactura)}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoneda(f.importeFacturado)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {f.precioEstado === "PENDIENTE_CONFIRMAR" && "A confirmar"}
                  {f.precioEstado === "COINCIDE" && "Coincide"}
                  {f.precioEstado === "CONFLICTO" && "No coincide"}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={f.estado} />
                </td>
              </tr>
            ))}
            {facturas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay facturas que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
