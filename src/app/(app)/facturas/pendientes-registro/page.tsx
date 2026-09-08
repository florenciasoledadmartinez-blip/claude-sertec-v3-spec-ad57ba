import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { diasHabilesTranscurridos } from "@/lib/format";

export default async function FacturasPendientesRegistroPage() {
  await requireRole("ANALISTA_CXP");

  const prestaciones = await prisma.prestacion.findMany({
    where: { estado: "CUMPLIDO", servicio: { estado: "ACTIVO" }, facturaPeriodos: { none: {} } },
    include: { servicio: true, validadoPor: true },
    orderBy: { fecha: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Servicio prestado, factura sin registrar</h1>
        <p className="text-slate-500">
          El responsable operativo ya certificó que estos períodos se cumplieron — todavía no llegó (o no se
          cargó) la factura correspondiente. No es un bloqueo del sistema, es un pendiente de gestión: conviene
          reclamarle la factura al proveedor si ya pasaron varios días.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Servicio</th>
              <th className="px-4 py-2">Período</th>
              <th className="px-4 py-2">Certificado por</th>
              <th className="px-4 py-2">Días desde la certificación</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {prestaciones.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{p.servicio.proveedor}</td>
                <td className="px-4 py-2 text-slate-600">{p.servicio.descripcion}</td>
                <td className="px-4 py-2 text-slate-600">{p.periodo}</td>
                <td className="px-4 py-2 text-slate-600">{p.validadoPor?.nombre ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {p.fecha ? diasHabilesTranscurridos(p.fecha) : "—"} hábiles
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href="/facturas/nueva" className="text-slate-700 underline hover:text-slate-900">
                    Registrar factura
                  </Link>
                </td>
              </tr>
            ))}
            {prestaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                  No hay períodos cumplidos esperando su factura.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
