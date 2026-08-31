import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { getConfigSistema } from "@/lib/config";
import { formatMoneda, formatFecha } from "@/lib/format";
import { ResolverConflictoPrecioForm } from "../../facturas/factura-actions";

export default async function ComprasPreciosPage() {
  await requireRole("COMPRAS");
  const config = await getConfigSistema();

  const facturas = await cargarFacturasConEstado({ precioEstado: "CONFLICTO", rechazadaPrecio: false });
  const enConflicto = facturas.filter((f) => f.estado === "CONFLICTO_PRECIO");

  const resuelvenCompras = config.resolutorConflictoPrecio === "COMPRAS";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Conflictos de precio</h1>
        <p className="text-slate-500">
          {resuelvenCompras
            ? "Facturas donde el importe no coincide con el precio acordado."
            : "Según la configuración actual, estos conflictos los resuelve el responsable operativo de cada servicio. Podés verlos, pero no resolverlos."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {enConflicto.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                  {f.numeroFactura}
                </Link>{" "}
                <span className="text-slate-500">— {f.servicio.proveedor}</span>
              </div>
              <span className="text-xs text-slate-400">{formatFecha(f.fechaFactura)}</span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              Facturado {formatMoneda(f.importeFacturado)} vs precio vigente {formatMoneda(f.servicio.precioVigente)}
              {f.periodos.length > 1 ? ` × ${f.periodos.length} períodos` : ""}
            </p>
            {resuelvenCompras && (
              <ResolverConflictoPrecioForm facturaId={f.id} precioVigente={Number(f.servicio.precioVigente)} />
            )}
          </div>
        ))}
        {enConflicto.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay conflictos de precio abiertos.
          </p>
        )}
      </div>
    </div>
  );
}
