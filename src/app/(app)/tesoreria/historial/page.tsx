import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";

export default async function TesoreriaHistorialPage() {
  await requireRole("TESORERIA");

  const facturas = await prisma.factura.findMany({
    where: { pagado: true },
    include: { servicio: true, pagadoPor: true },
    orderBy: { comprobanteFecha: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Comprobantes emitidos</h1>
        <p className="text-slate-500">Historial de facturas ya pagadas.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nº factura</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Importe</th>
              <th className="px-4 py-3">Comprobante</th>
              <th className="px-4 py-3">Fecha de pago</th>
              <th className="px-4 py-3">Pagado por</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                    {f.numeroFactura}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{f.servicio.proveedor}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoneda(f.importeFacturado)}</td>
                <td className="px-4 py-3 text-slate-600">{f.comprobanteNumero}</td>
                <td className="px-4 py-3 text-slate-600">{formatFecha(f.comprobanteFecha)}</td>
                <td className="px-4 py-3 text-slate-600">{f.pagadoPor?.nombre}</td>
              </tr>
            ))}
            {facturas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Todavía no se emitieron comprobantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
