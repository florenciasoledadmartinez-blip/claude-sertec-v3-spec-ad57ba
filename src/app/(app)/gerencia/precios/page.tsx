import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { AprobarSolicitudPrecioForm } from "../gerencia-forms";

export default async function GerenciaPreciosPage() {
  await requireRole("GERENCIA");

  const solicitudes = await prisma.solicitudCambioPrecio.findMany({
    where: { estado: "PENDIENTE" },
    include: { servicio: true, solicitadoPor: true },
    orderBy: { fechaSolicitud: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Solicitudes de cambio de precio</h1>
        <p className="text-slate-500">El precio de un servicio nunca se edita directo — solo cambia si se aprueba acá.</p>
      </div>

      <div className="flex flex-col gap-4">
        {solicitudes.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/servicios/${s.servicioId}`} className="font-medium text-slate-900 hover:underline">
                  {s.servicio.proveedor}
                </Link>{" "}
                <span className="text-slate-500">— {s.servicio.descripcion}</span>
              </div>
              <span className="text-xs text-slate-400">
                Pedido por {s.solicitadoPor.nombre} el {formatFecha(s.fechaSolicitud)}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {formatMoneda(s.precioActual)} → {formatMoneda(s.precioPropuesto)}
            </p>
            <p className="mb-3 text-sm text-slate-600">{s.observaciones}</p>
            <AprobarSolicitudPrecioForm solicitudId={s.id} />
          </div>
        ))}
        {solicitudes.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay solicitudes de cambio de precio pendientes.
          </p>
        )}
      </div>
    </div>
  );
}
