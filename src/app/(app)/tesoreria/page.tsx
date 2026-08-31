import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { formatMoneda, formatFecha } from "@/lib/format";
import { MarcarPagadaForm } from "../facturas/factura-actions";

export default async function TesoreriaPage() {
  await requireRole("TESORERIA");

  const facturas = await cargarFacturasConEstado({});
  const pendientes = facturas.filter((f) => f.estado === "AUTORIZADA_PENDIENTE_PAGO");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pendientes de pago</h1>
        <p className="text-slate-500">Facturas autorizadas por Gerencia, esperando el pago.</p>
      </div>

      <div className="flex flex-col gap-4">
        {pendientes.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                  {f.numeroFactura}
                </Link>{" "}
                <span className="text-slate-500">— {f.servicio.proveedor}</span>
              </div>
              <span className="text-xs text-slate-400">
                Autorizada por {f.autorizadoPor?.nombre} el {formatFecha(f.autorizadoFecha)}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {formatMoneda(f.importeFacturado)} — CUIT {f.servicio.cuit}
            </p>
            <MarcarPagadaForm facturaId={f.id} />
          </div>
        ))}
        {pendientes.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay facturas autorizadas pendientes de pago.
          </p>
        )}
      </div>
    </div>
  );
}
