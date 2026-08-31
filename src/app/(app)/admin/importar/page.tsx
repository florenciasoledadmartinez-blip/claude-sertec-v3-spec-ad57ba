import { requireRole } from "@/lib/dal";
import { ImportarForm } from "../admin-forms";

export default async function AdminImportarPage() {
  await requireRole("ADMIN");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Importación de datos</h1>
        <p className="text-slate-500">
          Pensado para la puesta en marcha inicial. Reemplaza por completo los servicios, facturas y períodos
          cargados hasta ahora. No sincroniza con el sistema contable.
        </p>
      </div>
      <ImportarForm />
    </div>
  );
}
