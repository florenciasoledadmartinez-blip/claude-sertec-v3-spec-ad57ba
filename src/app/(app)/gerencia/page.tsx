import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { formatMoneda, formatFecha } from "@/lib/format";
import { AutorizarButton, RechazarFacturaForm } from "../facturas/factura-actions";

export default async function GerenciaPage() {
  await requireRole("GERENCIA");

  const facturas = await cargarFacturasConEstado({});
  const listas = facturas.filter((f) => f.estado === "LISTA_PARA_AUTORIZAR");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Para autorizar</h1>
        <p className="text-slate-500">Facturas que ya pasaron el control de prestación y de precio.</p>
      </div>

      <div className="flex flex-col gap-4">
        {listas.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                  {f.numeroFactura}
                </Link>{" "}
                <span className="text-slate-500">
                  — {f.servicio.proveedor} ({f.servicio.area})
                </span>
              </div>
              <span className="text-xs text-slate-400">{formatFecha(f.fechaFactura)}</span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {formatMoneda(f.importeFacturado)} — períodos:{" "}
              {f.periodos.map((p) => p.prestacion.periodo).join(", ")}
            </p>
            <div className="flex flex-wrap gap-4">
              <AutorizarButton facturaId={f.id} />
              <RechazarFacturaForm facturaId={f.id} />
            </div>
          </div>
        ))}
        {listas.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay facturas listas para autorizar.
          </p>
        )}
      </div>
    </div>
  );
}
