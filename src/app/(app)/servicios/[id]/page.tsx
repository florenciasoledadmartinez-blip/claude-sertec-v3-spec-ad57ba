import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha, formatFechaHora } from "@/lib/format";
import { periodoLabel } from "@/lib/periodos";
import {
  editarServicioAction,
  darDeBajaServicioAction,
  reactivarServicioAction,
  reproponerServicioAction,
} from "@/actions/servicios";
import { ServicioForm } from "../servicio-form";
import { CertificarForm, PeriodoManualForm, AsignarPeriodoForm, AjusteImporteForm } from "../prestacion-forms";

const ESTADO_PRESTACION_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CUMPLIDO: "Cumplido",
  PARCIAL: "Parcial",
  NO_CUMPLIDO: "No cumplido",
};

const ESTADO_PRESTACION_COLOR: Record<string, string> = {
  PENDIENTE: "bg-slate-100 text-slate-700",
  CUMPLIDO: "bg-emerald-100 text-emerald-800",
  PARCIAL: "bg-amber-100 text-amber-800",
  NO_CUMPLIDO: "bg-red-100 text-red-800",
};

const ESTADO_SERVICIO_LABEL: Record<string, string> = {
  PENDIENTE_DE_APROBACION: "Pendiente de aprobación",
  ACTIVO: "Activo",
  RECHAZADO: "Rechazado",
  BAJA: "Dado de baja",
};

const ESTADO_SERVICIO_COLOR: Record<string, string> = {
  PENDIENTE_DE_APROBACION: "bg-amber-100 text-amber-800",
  ACTIVO: "bg-emerald-100 text-emerald-800",
  RECHAZADO: "bg-red-100 text-red-800",
  BAJA: "bg-slate-100 text-slate-500",
};

export default async function ServicioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("RESPONSABLE_OPERATIVO");

  const servicio = await prisma.servicio.findUnique({
    where: { id },
    include: {
      responsableOperativo: true,
      aprobadoPor: true,
      historialPrecio: { orderBy: { fecha: "desc" }, include: { cambiadoPor: true } },
      prestaciones: { orderBy: { periodo: "desc" }, include: { validadoPor: true } },
      facturas: { where: { periodoAConfirmar: true }, include: { registradoPor: true } },
    },
  });
  if (!servicio) notFound();
  if (servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) {
    redirect("/servicios");
  }

  const responsables = await prisma.usuario.findMany({
    where: { activo: true, roles: { some: { role: "RESPONSABLE_OPERATIVO" } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{servicio.proveedor}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_SERVICIO_COLOR[servicio.estado]}`}>
              {ESTADO_SERVICIO_LABEL[servicio.estado]}
            </span>
          </div>
          <p className="text-slate-500">{servicio.descripcion}</p>
        </div>
        <div className="flex gap-2">
          {servicio.estado === "ACTIVO" && (
            <>
              <Link
                href={`/servicios/${servicio.id}/solicitud-precio`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cambio de precio
              </Link>
              <form action={darDeBajaServicioAction}>
                <input type="hidden" name="servicioId" value={servicio.id} />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Dar de baja
                </button>
              </form>
            </>
          )}
          {servicio.estado === "BAJA" && (
            <form action={reactivarServicioAction}>
              <input type="hidden" name="servicioId" value={servicio.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Reactivar
              </button>
            </form>
          )}
        </div>
      </div>

      {servicio.estado === "PENDIENTE_DE_APROBACION" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Pendiente de aprobación de Gerencia desde el {formatFecha(servicio.createdAt)}. No genera períodos ni
          admite facturas hasta que se apruebe.
        </section>
      )}

      {servicio.estado === "RECHAZADO" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Rechazado por {servicio.aprobadoPor?.nombre} el {formatFecha(servicio.fechaAprobacion)}:{" "}
            {servicio.motivoRechazo}
          </p>
          <form action={reproponerServicioAction} className="mt-2">
            <input type="hidden" name="servicioId" value={servicio.id} />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Volver a proponer
            </button>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-900">Datos del servicio</h2>
        <ServicioForm
          action={editarServicioAction}
          responsables={responsables}
          currentUserId={user.id}
          mostrarResponsable={false}
          mostrarPrecio={false}
          servicioId={servicio.id}
          submitLabel="Guardar cambios"
          defaults={{
            proveedor: servicio.proveedor,
            cuit: servicio.cuit,
            area: servicio.area,
            descripcion: servicio.descripcion,
            precioVigente: Number(servicio.precioVigente),
            periodicidad: servicio.periodicidad,
            actualizacionFrecuencia: servicio.actualizacionFrecuencia ?? "",
            actualizacionBase: servicio.actualizacionBase ?? "",
            vigenteDesde: servicio.vigenteDesde.toISOString().slice(0, 10),
            duracionEnPeriodos: servicio.duracionEnPeriodos ?? "",
          }}
        />
      </section>

      {servicio.facturas.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-3 font-medium text-slate-900">
            Facturas con período a confirmar ({servicio.facturas.length})
          </h2>
          <div className="flex flex-col gap-4">
            {servicio.facturas.map((f) => (
              <div key={f.id} className="rounded-md border border-amber-200 bg-white p-3">
                <div className="mb-2 text-sm text-slate-700">
                  Factura <strong>{f.numeroFactura}</strong> del {formatFecha(f.fechaFactura)} por{" "}
                  {formatMoneda(f.importeFacturado)} — registrada por {f.registradoPor.nombre}
                </div>
                <AsignarPeriodoForm
                  facturaId={f.id}
                  periodos={servicio.prestaciones.map((p) => ({ id: p.id, periodo: p.periodo }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">
            Períodos ({periodoLabel(servicio.periodicidad)})
          </h2>
        </div>
        {servicio.estado === "ACTIVO" && (
          <div className="mb-4">
            <PeriodoManualForm servicioId={servicio.id} />
          </div>
        )}
        <div className="flex flex-col gap-3">
          {servicio.prestaciones.map((p) => (
            <div key={p.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{p.periodo}</span>
                  {p.creadoManualmente && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">manual</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_PRESTACION_COLOR[p.estado]}`}
                  >
                    {ESTADO_PRESTACION_LABEL[p.estado]}
                  </span>
                </div>
                {p.validadoPor && (
                  <span className="text-xs text-slate-400">
                    {p.validadoPor.nombre} — {formatFechaHora(p.fecha)}
                  </span>
                )}
              </div>
              {p.observacion && <p className="mt-2 text-sm text-slate-600">{p.observacion}</p>}
              {p.estado === "PENDIENTE" && (
                <div className="mt-3">
                  <CertificarForm prestacionId={p.id} />
                </div>
              )}
              {p.estado === "PARCIAL" && (
                <div className="mt-3">
                  {p.importeEsperadoAjustado != null && (
                    <p className="mb-2 text-sm text-slate-600">
                      Importe esperado ajustado: <strong>{formatMoneda(p.importeEsperadoAjustado)}</strong> (se
                      compara la factura contra este importe, no contra el precio completo)
                    </p>
                  )}
                  <AjusteImporteForm
                    prestacionId={p.id}
                    importeActual={p.importeEsperadoAjustado != null ? Number(p.importeEsperadoAjustado) : null}
                  />
                </div>
              )}
            </div>
          ))}
          {servicio.prestaciones.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay períodos generados para este servicio.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-900">Historial de precios</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Fecha</th>
              <th className="py-2">Anterior</th>
              <th className="py-2">Nuevo</th>
              <th className="py-2">Motivo</th>
              <th className="py-2">Aprobado por</th>
            </tr>
          </thead>
          <tbody>
            {servicio.historialPrecio.map((h) => (
              <tr key={h.id} className="border-t border-slate-100">
                <td className="py-2">{formatFecha(h.fecha)}</td>
                <td className="py-2">{formatMoneda(h.precioAnterior)}</td>
                <td className="py-2">{formatMoneda(h.precioNuevo)}</td>
                <td className="py-2 text-slate-600">{h.motivo}</td>
                <td className="py-2 text-slate-600">{h.cambiadoPor.nombre}</td>
              </tr>
            ))}
            {servicio.historialPrecio.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  Sin cambios de precio registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
