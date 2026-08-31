import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatFecha } from "@/lib/format";
import { GenerarPeriodosButton, ReabrirPrestacionForm } from "../admin-forms";

export default async function AdminPeriodosPage() {
  await requireRole("ADMIN");

  const noCumplidos = await prisma.prestacion.findMany({
    where: { estado: "NO_CUMPLIDO" },
    include: { servicio: true, validadoPor: true },
    orderBy: { fecha: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Generación de períodos</h1>
        <p className="text-slate-500">
          Job que crea el registro de prestación &quot;Pendiente&quot; de cada servicio activo al iniciar cada período.
          Se puede disparar manualmente acá.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <GenerarPeriodosButton />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Períodos bloqueados por incumplimiento</h2>
        <p className="mb-4 text-sm text-slate-500">
          Reabrir un período &quot;No cumplido&quot; requiere una acción explícita y auditada por el administrador.
        </p>
        <div className="flex flex-col gap-3">
          {noCumplidos.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {p.servicio.proveedor} — {p.periodo}
                </span>
                <span className="text-xs text-slate-400">
                  {p.validadoPor?.nombre} — {formatFecha(p.fecha)}
                </span>
              </div>
              <p className="mb-2 text-sm text-slate-600">{p.observacion}</p>
              <ReabrirPrestacionForm prestacionId={p.id} />
            </div>
          ))}
          {noCumplidos.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
              No hay períodos bloqueados por incumplimiento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
