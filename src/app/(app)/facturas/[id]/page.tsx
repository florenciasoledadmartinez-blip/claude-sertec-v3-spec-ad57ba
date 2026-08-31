import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { cargarFacturaConEstado } from "@/lib/facturas-query";
import { getConfigSistema } from "@/lib/config";
import { formatMoneda, formatFecha, formatFechaHora } from "@/lib/format";
import { EstadoBadge } from "../estado-badge";
import { AsignarPeriodoForm, CertificarForm } from "../../servicios/prestacion-forms";
import {
  ConfirmarPrecioButton,
  ResolverConflictoPrecioForm,
  ResolverParcialForm,
  AutorizarButton,
  RechazarGerenciaForm,
  MarcarPagadaForm,
} from "../factura-actions";

const ESTADO_PRESTACION_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CUMPLIDO: "Cumplido",
  PARCIAL: "Parcial",
  NO_CUMPLIDO: "No cumplido",
};

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const factura = await cargarFacturaConEstado(id);
  if (!factura) notFound();

  const config = await getConfigSistema();

  const esResponsableDelServicio = factura.servicio.responsableOperativoId === user.id;
  const puedeResolverPrecio =
    hasRole(user, "ADMIN") ||
    (config.resolutorConflictoPrecio === "RESPONSABLE_OPERATIVO"
      ? esResponsableDelServicio
      : hasRole(user, "COMPRAS"));

  const auditoria = await prisma.auditoria.findMany({
    where: {
      OR: [
        { entidadTipo: "factura", entidadId: id },
        { entidadTipo: "prestacion", entidadId: { in: factura.periodos.map((p) => p.prestacionId) } },
      ],
    },
    include: { usuario: true },
    orderBy: { fecha: "asc" },
  });

  const periodosPendientesDelServicio = esResponsableDelServicio || hasRole(user, "ADMIN")
    ? await prisma.prestacion.findMany({ where: { servicioId: factura.servicioId }, orderBy: { periodo: "desc" } })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Factura {factura.numeroFactura}</h1>
          <p className="text-slate-500">
            <Link href={`/servicios/${factura.servicioId}`} className="hover:underline">
              {factura.servicio.proveedor}
            </Link>{" "}
            — {factura.servicio.descripcion}
          </p>
        </div>
        <EstadoBadge estado={factura.estado} />
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-4">
        <Info label="Fecha de factura" value={formatFecha(factura.fechaFactura)} />
        <Info label="Importe facturado" value={formatMoneda(factura.importeFacturado)} />
        <Info label="Precio vigente del servicio" value={formatMoneda(factura.servicio.precioVigente)} />
        <Info label="Registrada por" value={`${factura.registradoPor.nombre} — ${formatFecha(factura.fechaRegistro)}`} />
      </section>

      {factura.periodoAConfirmar && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-3 font-medium text-slate-900">Período a confirmar</h2>
          <p className="mb-3 text-sm text-slate-600">
            No está claro a qué período corresponde esta factura. Lo resuelve el responsable operativo del servicio.
          </p>
          {esResponsableDelServicio || hasRole(user, "ADMIN") ? (
            <AsignarPeriodoForm
              facturaId={factura.id}
              periodos={periodosPendientesDelServicio.map((p) => ({ id: p.id, periodo: p.periodo }))}
            />
          ) : (
            <p className="text-sm text-slate-400">Esperando al responsable operativo del servicio.</p>
          )}
        </section>
      )}

      {!factura.periodoAConfirmar && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-medium text-slate-900">Períodos cubiertos</h2>
          <div className="flex flex-col gap-3">
            {factura.periodos.map((fp) => (
              <div key={fp.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{fp.prestacion.periodo}</span>
                  <span className="text-xs text-slate-500">{ESTADO_PRESTACION_LABEL[fp.prestacion.estado]}</span>
                </div>
                {fp.prestacion.observacion && (
                  <p className="mt-1 text-sm text-slate-600">{fp.prestacion.observacion}</p>
                )}
                {fp.prestacion.estado === "PENDIENTE" && (esResponsableDelServicio || hasRole(user, "ADMIN")) && (
                  <div className="mt-2">
                    <CertificarForm prestacionId={fp.prestacion.id} />
                  </div>
                )}
                {fp.prestacion.estado === "PARCIAL" && !fp.prestacion.resolucionParcialTipo && hasRole(user, "COMPRAS") && (
                  <div className="mt-2">
                    <ResolverParcialForm prestacionId={fp.prestacion.id} />
                  </div>
                )}
                {fp.prestacion.resolucionParcialTipo && (
                  <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                    Resolución de Compras ({fp.prestacion.resolucionParcialTipo}): {fp.prestacion.resolucionParcialDetalle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-slate-900">Control de precio</h2>
        <p className="mb-3 text-sm text-slate-600">
          {factura.precioEstado === "PENDIENTE_CONFIRMAR" && "Todavía no se confirmó si el importe coincide con lo acordado."}
          {factura.precioEstado === "COINCIDE" && "El importe coincide con el precio acordado."}
          {factura.precioEstado === "CONFLICTO" && "El importe no coincide con el precio acordado."}
        </p>
        {factura.rechazadaPrecio && (
          <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Rechazada por precio: {factura.rechazadaPrecioMotivo} — {factura.rechazadaPrecioPor?.nombre} (
            {formatFecha(factura.rechazadaPrecioFecha)})
          </p>
        )}
        {hasRole(user, "ANALISTA_CXP") && factura.precioEstado === "PENDIENTE_CONFIRMAR" && !factura.periodoAConfirmar && (
          <ConfirmarPrecioButton facturaId={factura.id} />
        )}
        {factura.estado === "CONFLICTO_PRECIO" && puedeResolverPrecio && (
          <ResolverConflictoPrecioForm facturaId={factura.id} precioVigente={Number(factura.servicio.precioVigente)} />
        )}
      </section>

      {factura.estado === "LISTA_PARA_AUTORIZAR" && hasRole(user, "GERENCIA") && (
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="mb-3 font-medium text-slate-900">Autorización</h2>
          <div className="flex flex-wrap gap-4">
            <AutorizarButton facturaId={factura.id} />
            <RechazarGerenciaForm facturaId={factura.id} />
          </div>
        </section>
      )}
      {factura.rechazadaGerencia && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Rechazada por Gerencia: {factura.rechazadaGerenciaMotivo} — {factura.rechazadaGerenciaPor?.nombre} (
          {formatFecha(factura.rechazadaGerenciaFecha)})
        </section>
      )}

      {factura.estado === "AUTORIZADA_PENDIENTE_PAGO" && hasRole(user, "TESORERIA") && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-3 font-medium text-slate-900">Pago</h2>
          <MarcarPagadaForm facturaId={factura.id} />
        </section>
      )}
      {factura.pagado && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Pagada — comprobante {factura.comprobanteNumero} del {formatFecha(factura.comprobanteFecha)} (
          {factura.pagadoPor?.nombre})
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-slate-900">Historial de esta factura</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {auditoria.map((a) => (
            <li key={a.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <span className="text-slate-400">{formatFechaHora(a.fecha)}</span> — <strong>{a.usuario?.nombre ?? "Sistema"}</strong>:{" "}
              {a.accion}
              {a.detalle && <span className="text-slate-500"> — {a.detalle}</span>}
            </li>
          ))}
          {auditoria.length === 0 && <li className="text-slate-400">Sin movimientos registrados.</li>}
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}
