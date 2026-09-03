import { requireRole } from "@/lib/dal";
import { CrearAnticipoForm } from "../anticipo-forms";

export default async function NuevoAnticipoPage() {
  await requireRole("COMPRAS");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Nueva solicitud de anticipo</h1>
        <p className="text-slate-500">
          Va directo a Tesorería, respaldada por la proforma del proveedor — no pasa por el Analista de Cuentas a
          Pagar, todavía no hay factura fiscal.
        </p>
      </div>
      <CrearAnticipoForm />
    </div>
  );
}
