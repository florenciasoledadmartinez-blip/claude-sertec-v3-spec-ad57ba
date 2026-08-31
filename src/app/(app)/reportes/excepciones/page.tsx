import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getReporteExcepciones } from "@/lib/reportes";
import { formatFecha } from "@/lib/format";

export default async function ReporteExcepcionesPage() {
  await requireRole("ANALISTA_CXP", "GERENCIA");
  const filas = await getReporteExcepciones();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reporte de excepciones abiertas</h1>
          <p className="text-slate-500">Una fila por factura en cualquier estado de excepción.</p>
        </div>
        <a
          href="/api/reportes/excepciones"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Nº factura</th>
              <th className="px-4 py-3">Tipo de excepción</th>
              <th className="px-4 py-3">Días abierta</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Observación</th>
              <th className="px-4 py-3">Fecha límite SLA</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.factura.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{f.proveedor}</td>
                <td className="px-4 py-3">
                  <Link href={`/facturas/${f.factura.id}`} className="font-medium text-slate-900 hover:underline">
                    {f.numeroFactura}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{f.tipoExcepcion}</td>
                <td className="px-4 py-3 text-slate-600">{f.diasAbierta}</td>
                <td className="px-4 py-3 text-slate-600">{f.responsable}</td>
                <td className="px-4 py-3 text-slate-600">{f.observacion}</td>
                <td className="px-4 py-3 text-slate-600">{f.fechaLimite ? formatFecha(f.fechaLimite) : "—"}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No hay excepciones abiertas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
