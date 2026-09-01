import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { cargarFacturasConEstado } from "@/lib/facturas-query";
import { formatMoneda, diasHabilesTranscurridos } from "@/lib/format";
import { ESTADO_FACTURA_LABEL, ESTADOS_EXCEPCION, responsableExcepcion, type EstadoFacturaCode } from "@/lib/estado-factura";
import { getConfigSistema } from "@/lib/config";

const SLA_POR_ESTADO: Partial<Record<EstadoFacturaCode, (dias: { precio: number; parcial: number; periodo: number }) => number>> = {
  CONFLICTO_PRECIO: (d) => d.precio,
  CONFLICTO_PARCIAL: (d) => d.parcial,
  PERIODO_A_CONFIRMAR: (d) => d.periodo,
};

export default async function FacturasBloqueadasPage() {
  await requireRole("ANALISTA_CXP");
  const config = await getConfigSistema();
  const facturas = await cargarFacturasConEstado({});
  const bloqueadas = facturas.filter((f) => ESTADOS_EXCEPCION.includes(f.estado));

  const grupos = ESTADOS_EXCEPCION.map((estado) => ({
    estado,
    facturas: bloqueadas.filter((f) => f.estado === estado),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Facturas bloqueadas</h1>
        <p className="text-slate-500">
          Todo lo que todavía no puede avanzar hacia el pago, agrupado por tipo de excepción.
        </p>
      </div>

      {grupos.map(({ estado, facturas: fs }) => (
        <section key={estado} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-medium text-slate-900">
              {ESTADO_FACTURA_LABEL[estado]} ({fs.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nº factura</th>
                <th className="px-4 py-2">Proveedor</th>
                <th className="px-4 py-2">Importe</th>
                <th className="px-4 py-2">Días abierta</th>
                <th className="px-4 py-2">Responsable de resolver</th>
              </tr>
            </thead>
            <tbody>
              {fs.map((f) => {
                const slaFn = SLA_POR_ESTADO[estado];
                const dias = diasHabilesTranscurridos(f.fechaRegistro);
                const sla = slaFn
                  ? slaFn({
                      precio: config.slaConflictoPrecioDias,
                      parcial: config.slaCumplimientoParcialDias,
                      periodo: config.slaPeriodoAConfirmarDias,
                    })
                  : null;
                const vencida = sla != null && dias > sla;
                return (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                        {f.numeroFactura}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{f.servicio.proveedor}</td>
                    <td className="px-4 py-2 text-slate-600">{formatMoneda(f.importeFacturado)}</td>
                    <td className={`px-4 py-2 ${vencida ? "font-medium text-red-600" : "text-slate-600"}`}>
                      {dias} {sla != null ? `/ ${sla} hábiles` : ""}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {responsableExcepcion(estado, config.resolutorConflictoPrecio)}
                    </td>
                  </tr>
                );
              })}
              {fs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                    Sin facturas en esta excepción.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
