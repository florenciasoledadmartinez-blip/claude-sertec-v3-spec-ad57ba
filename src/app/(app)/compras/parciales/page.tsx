import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatFecha } from "@/lib/format";
import { ResolverParcialForm } from "../../facturas/factura-actions";

export default async function ComprasParcialesPage() {
  await requireRole("COMPRAS");

  const prestaciones = await prisma.prestacion.findMany({
    where: { estado: "PARCIAL", resolucionParcialTipo: null },
    include: {
      servicio: true,
      validadoPor: true,
      facturaPeriodos: { include: { factura: true } },
    },
    orderBy: { fecha: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cumplimiento parcial</h1>
        <p className="text-slate-500">
          Períodos certificados como &quot;Parcial&quot; por el responsable operativo, pendientes de resolución.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {prestaciones.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-900">{p.servicio.proveedor}</span>{" "}
                <span className="text-slate-500">— {p.servicio.descripcion}</span>
              </div>
              <span className="text-xs text-slate-400">
                Período {p.periodo} · certificado por {p.validadoPor?.nombre} el {formatFecha(p.fecha)}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-700">{p.observacion}</p>
            {p.facturaPeriodos.length > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                Facturas asociadas:{" "}
                {p.facturaPeriodos.map((fp) => (
                  <Link key={fp.id} href={`/facturas/${fp.facturaId}`} className="mr-2 hover:underline">
                    {fp.factura.numeroFactura}
                  </Link>
                ))}
              </p>
            )}
            <ResolverParcialForm prestacionId={p.id} />
          </div>
        ))}
        {prestaciones.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay cumplimientos parciales pendientes de resolución.
          </p>
        )}
      </div>
    </div>
  );
}
