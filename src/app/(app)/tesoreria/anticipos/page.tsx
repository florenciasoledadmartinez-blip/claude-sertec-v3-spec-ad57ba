import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { MarcarAnticipoPagadoForm } from "../../anticipos/anticipo-forms";

export default async function TesoreriaAnticiposPage() {
  await requireRole("TESORERIA");

  const anticipos = await prisma.anticipo.findMany({
    where: { estado: "AUTORIZADO" },
    include: { solicitadoPor: true },
    orderBy: { fechaSolicitud: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Anticipos a pagar</h1>
        <p className="text-slate-500">Solicitudes autorizadas (o que no superaban el umbral), listas para pagar.</p>
      </div>

      <div className="flex flex-col gap-4">
        {anticipos.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-900">{a.proveedor}</span>{" "}
                <span className="text-slate-500">— proforma {a.numeroProforma}</span>
              </div>
              <span className="text-xs text-slate-400">
                Pedido por {a.solicitadoPor.nombre} el {formatFecha(a.fechaSolicitud)}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {formatMoneda(a.monto)} — CUIT {a.cuit}
              {a.fechaEstimadaEntrega && ` — entrega estimada ${formatFecha(a.fechaEstimadaEntrega)}`}
            </p>
            <MarcarAnticipoPagadoForm anticipoId={a.id} />
          </div>
        ))}
        {anticipos.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay anticipos autorizados pendientes de pago.
          </p>
        )}
      </div>
    </div>
  );
}
