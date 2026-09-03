import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { periodoLabel } from "@/lib/periodos";
import { AprobarServicioForm } from "../gerencia-forms";

export default async function GerenciaServiciosPage() {
  await requireRole("GERENCIA");

  const servicios = await prisma.servicio.findMany({
    where: { estado: "PENDIENTE_DE_APROBACION" },
    include: { responsableOperativo: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Altas de servicio pendientes</h1>
        <p className="text-slate-500">Sin aprobar, el servicio no genera períodos ni admite facturas.</p>
      </div>

      <div className="flex flex-col gap-4">
        {servicios.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/servicios/${s.id}`} className="font-medium text-slate-900 hover:underline">
                  {s.proveedor}
                </Link>{" "}
                <span className="text-slate-500">— {s.descripcion}</span>
              </div>
              <span className="text-xs text-slate-400">
                Propuesto por {s.responsableOperativo.nombre} el {formatFecha(s.createdAt)}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {formatMoneda(s.precioVigente)} — {periodoLabel(s.periodicidad)} — Área {s.area} — CUIT {s.cuit}
            </p>
            <AprobarServicioForm servicioId={s.id} />
          </div>
        ))}
        {servicios.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay altas de servicio pendientes.
          </p>
        )}
      </div>
    </div>
  );
}
