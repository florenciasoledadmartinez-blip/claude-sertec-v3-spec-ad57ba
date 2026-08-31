import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getReporteConciliacion } from "@/lib/reportes";
import { formatMoneda, formatFecha } from "@/lib/format";

export default async function ReporteConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requireRole("TESORERIA", "ANALISTA_CXP");
  const { desde, hasta } = await searchParams;

  const facturas = await getReporteConciliacion(desde ? new Date(desde) : undefined, hasta ? new Date(hasta) : undefined);

  const qs = new URLSearchParams();
  if (desde) qs.set("desde", desde);
  if (hasta) qs.set("hasta", hasta);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reporte de conciliación de pagos</h1>
          <p className="text-slate-500">
            Para cruzar manualmente contra el sistema contable (proveedor + número de factura + importe).
          </p>
        </div>
        <a
          href={`/api/reportes/conciliacion?${qs.toString()}`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Autorizada desde</label>
          <input name="desde" type="date" defaultValue={desde} className="rounded-md border border-slate-300 px-2 py-1.5" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Autorizada hasta</label>
          <input name="hasta" type="date" defaultValue={hasta} className="rounded-md border border-slate-300 px-2 py-1.5" />
        </div>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Filtrar
        </button>
        <Link href="/reportes/conciliacion" className="px-3 py-1.5 text-slate-500 hover:underline">
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Nº factura</th>
              <th className="px-4 py-3">CUIT</th>
              <th className="px-4 py-3">Importe</th>
              <th className="px-4 py-3">Autorizada</th>
              <th className="px-4 py-3">Pagada</th>
              <th className="px-4 py-3">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                    {f.servicio.proveedor}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{f.numeroFactura}</td>
                <td className="px-4 py-3 text-slate-600">{f.servicio.cuit}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoneda(f.importeFacturado)}</td>
                <td className="px-4 py-3 text-slate-600">{formatFecha(f.autorizadoFecha)}</td>
                <td className="px-4 py-3 text-slate-600">{formatFecha(f.comprobanteFecha)}</td>
                <td className="px-4 py-3 text-slate-600">{f.comprobanteNumero ?? "—"}</td>
              </tr>
            ))}
            {facturas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No hay facturas autorizadas o pagadas en el período elegido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
