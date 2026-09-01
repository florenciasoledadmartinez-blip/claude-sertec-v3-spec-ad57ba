import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { getPendientesDePago } from "@/lib/reportes";
import { formatMoneda, formatFecha } from "@/lib/format";
import { MarcarPagadaForm } from "../facturas/factura-actions";

export default async function TesoreriaPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string }>;
}) {
  await requireRole("TESORERIA");
  const { proveedor } = await searchParams;

  const { facturas: pendientes, total, cantidad } = await getPendientesDePago(proveedor);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pendientes de pago</h1>
          <p className="text-slate-500">Facturas autorizadas por Gerencia, esperando el pago.</p>
        </div>
        <a
          href={`/api/reportes/pendientes-pago${proveedor ? `?proveedor=${encodeURIComponent(proveedor)}` : ""}`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar Excel
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500">
          <span className="text-2xl font-semibold text-slate-900">{cantidad}</span> factura{cantidad === 1 ? "" : "s"}{" "}
          por {formatMoneda(total)}
        </div>
        <form className="ml-auto flex gap-2">
          <input
            name="proveedor"
            defaultValue={proveedor ?? ""}
            placeholder="Filtrar por proveedor..."
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Filtrar
          </button>
          {proveedor && (
            <Link href="/tesoreria" className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:underline">
              Limpiar
            </Link>
          )}
        </form>
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
