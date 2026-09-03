import { notFound, redirect } from "next/navigation";
import { requireRole, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { SolicitudPrecioForm } from "../../solicitud-precio-form";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  APROBADA: "bg-emerald-100 text-emerald-800",
  RECHAZADA: "bg-red-100 text-red-800",
};

export default async function SolicitudPrecioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("RESPONSABLE_OPERATIVO");

  const servicio = await prisma.servicio.findUnique({
    where: { id },
    include: { solicitudesPrecio: { orderBy: { fechaSolicitud: "desc" }, include: { resueltoPor: true } } },
  });
  if (!servicio) notFound();
  if (servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) redirect("/servicios");

  const tienePendiente = servicio.solicitudesPrecio.some((s) => s.estado === "PENDIENTE");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Solicitud de cambio de precio</h1>
        <p className="text-slate-500">
          {servicio.proveedor} — {servicio.descripcion}
        </p>
      </div>

      {servicio.estado !== "ACTIVO" && (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Este servicio no está activo, no se puede pedir un cambio de precio.
        </p>
      )}

      {servicio.estado === "ACTIVO" &&
        (tienePendiente ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Ya hay una solicitud pendiente de resolución de Gerencia para este servicio.
          </p>
        ) : (
          <SolicitudPrecioForm servicioId={servicio.id} precioActual={Number(servicio.precioVigente)} />
        ))}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-slate-900">Historial de solicitudes</h2>
        <div className="flex flex-col gap-3">
          {servicio.solicitudesPrecio.map((s) => (
            <div key={s.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-800">
                  {formatMoneda(s.precioActual)} → {formatMoneda(s.precioPropuesto)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[s.estado]}`}>
                  {ESTADO_LABEL[s.estado]}
                </span>
              </div>
              <p className="text-slate-600">{s.observaciones}</p>
              <p className="mt-1 text-xs text-slate-400">
                Pedida el {formatFecha(s.fechaSolicitud)}
                {s.resueltoPor && ` — resuelta por ${s.resueltoPor.nombre} el ${formatFecha(s.fechaResolucion)}`}
              </p>
              {s.motivoRechazo && <p className="mt-1 text-xs text-red-600">Motivo de rechazo: {s.motivoRechazo}</p>}
            </div>
          ))}
          {servicio.solicitudesPrecio.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay solicitudes de cambio de precio.</p>
          )}
        </div>
      </section>
    </div>
  );
}
