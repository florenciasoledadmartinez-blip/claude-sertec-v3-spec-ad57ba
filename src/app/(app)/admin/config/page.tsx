import { requireRole } from "@/lib/dal";
import { getConfigSistema } from "@/lib/config";
import { ConfigForm } from "../admin-forms";

export default async function AdminConfigPage() {
  await requireRole("ADMIN");
  const config = await getConfigSistema();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-500">Parámetros del sistema (spec sección 11: pendientes de confirmar con la empresa).</p>
      </div>
      <ConfigForm
        defaults={{
          resolutorConflictoPrecio: config.resolutorConflictoPrecio,
          slaConflictoPrecioDias: config.slaConflictoPrecioDias,
          slaCumplimientoParcialDias: config.slaCumplimientoParcialDias,
          slaPeriodoAConfirmarDias: config.slaPeriodoAConfirmarDias,
          presupuestoContratoActivo: config.presupuestoContratoActivo,
          fechaCorte: config.fechaCorte.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
