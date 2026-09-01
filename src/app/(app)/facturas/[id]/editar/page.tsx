import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { editarFacturaAction } from "@/actions/facturas";
import { FacturaForm } from "../../factura-form";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ANALISTA_CXP");
  const { id } = await params;

  const factura = await prisma.factura.findUnique({
    where: { id },
    include: { servicio: true, periodos: { include: { prestacion: true } } },
  });
  if (!factura) notFound();
  if (factura.autorizado || factura.pagado) {
    redirect(`/facturas/${id}`);
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: factura.servicioId },
    include: { prestaciones: { orderBy: { periodo: "desc" } } },
  });
  if (!servicio) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Editar factura {factura.numeroFactura}</h1>
        <p className="text-slate-500">
          Al guardar, el control de precio vuelve a empezar (se re-confirma) y se limpia cualquier rechazo previo.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <FacturaForm
          servicios={[servicio]}
          action={editarFacturaAction}
          facturaId={factura.id}
          servicioFijo={{ id: servicio.id, proveedor: servicio.proveedor, descripcion: servicio.descripcion }}
          submitLabel="Guardar cambios"
          submitLabelPendiente="Guardando..."
          defaults={{
            numeroFactura: factura.numeroFactura,
            fechaFactura: factura.fechaFactura.toISOString().slice(0, 10),
            importeFacturado: Number(factura.importeFacturado),
            periodoModo: factura.periodoAConfirmar ? "a_confirmar" : "periodos",
            periodoIds: factura.periodos.map((p) => p.prestacionId),
          }}
        />
      </div>
    </div>
  );
}
