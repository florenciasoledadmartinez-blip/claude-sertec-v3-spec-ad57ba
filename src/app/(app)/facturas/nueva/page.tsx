import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { registrarFacturaAction } from "@/actions/facturas";
import { FacturaForm } from "../factura-form";

export default async function NuevaFacturaPage() {
  await requireRole("ANALISTA_CXP");

  const servicios = await prisma.servicio.findMany({
    where: { estado: "ACTIVO" },
    orderBy: { proveedor: "asc" },
    include: { prestaciones: { orderBy: { periodo: "desc" } } },
  });

  const anticipos = await prisma.anticipo.findMany({
    where: { estado: "PAGADO", aplicado: false },
    orderBy: { fechaPago: "asc" },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Registrar factura</h1>
        <p className="text-slate-500">
          La clave de emparejamiento es servicio + período, no el número de factura. Si no está claro a qué
          período corresponde, marcala como &quot;a confirmar&quot;: vuelve al responsable operativo del servicio.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <FacturaForm
          servicios={servicios}
          action={registrarFacturaAction}
          anticiposDisponibles={anticipos.map((a) => ({
            id: a.id,
            proveedor: a.proveedor,
            numeroProforma: a.numeroProforma,
            monto: Number(a.monto),
          }))}
        />
      </div>
    </div>
  );
}
