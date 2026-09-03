import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, hasRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { cargarFacturaConEstado } from "@/lib/facturas-query";
import { formatMoneda, formatFecha, formatFechaHora } from "@/lib/format";
import { EstadoBadge } from "../estado-badge";
import { AsignarPeriodoForm } from "../../servicios/prestacion-forms";
import {
  ConfirmarPrecioButton,
  SolicitarExcepcionForm,
  AutorizarButton,
  RechazarFacturaForm,
  MarcarPagadaForm,
  EliminarFacturaButton,
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

  const esResponsableDelServicio = factura.servicio.responsableOperativoId === user.id;

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

  const periodosPendientesDelServicio =
    esResponsableDelServicio || hasRole(user, "ADMIN")
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
        <div className="flex items-center gap-3">
          <EstadoBadge estado={factura.estado} />
          {hasRole(user, "ANALISTA_CXP") && !factura.autorizado && !factura.pagado && (
            <>
              <Link
                href={`/facturas/${factura.id}/editar`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Editar
              </Link>
              <EliminarFacturaButton facturaId={factura.id} />
            </>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-4">
        <Info label="Fecha de factura" value={formatFecha(factura.fechaFactura)} />
        <Info label="Importe facturado" value={formatMoneda(factura.importeFacturado)} />
        <Info label="Importe esperado" value={formatMoneda(factura.importeEsperado)} />
        <Info label="Registrada por" value={`${factura.registradoPor.nombre} — ${formatFecha(factura.fechaRegistro)}`} />
      </section>

      {factura.anticipo && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Tiene un anticipo aplicado: proforma {factura.anticipo.numeroProforma} por{" "}
          {formatMoneda(factura.anticipo.monto)}
          {factura.varianteAplicacionAnticipo === "TOTAL_CON_CREDITO"
            ? ` — la factura vino por el total; saldo a pagar: ${formatMoneda(
                Number(factura.importeFacturado) - Number(factura.anticipo.monto)
              )}`
            : " — la factura vino por el saldo restante."}
        </section>
      )}

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
                {fp.prestacion.estado === "PARCIAL" && fp.prestacion.importeEsperadoAjustado == null && (
                  <p className="mt-1 text-xs text-amber-700">
                    Pendiente de que el responsable operativo cargue el importe esperado ajustado.{" "}
                    {(esResponsableDelServicio || hasRole(user, "ADMIN")) && (
                      <Link href={`/servicios/${factura.servicioId}`} className="underline">
                        Cargarlo acá.
                      </Link>
                    )}
                  </p>
                )}
                {fp.prestacion.estado === "PARCIAL" && fp.prestacion.importeEsperadoAjustado != null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Importe esperado ajustado: {formatMoneda(fp.prestacion.importeEsperadoAjustado)}
                  </p>
                )}
                {fp.prestacion.estado === "PENDIENTE" && (esResponsableDelServicio || hasRole(user, "ADMIN")) && (
                  <p className="mt-1 text-xs text-slate-400">
                    <Link href={`/servicios/${factura.servicioId}`} className="underline">
                      Certificar este período
                    </Link>
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
          {factura.precioEstado === "COINCIDE" && "El importe coincide con lo acordado."}
          {factura.precioEstado === "CONFLICTO" &&
            `El importe no coincide con lo esperado (${formatMoneda(factura.importeEsperado)}).`}
        </p>

        {hasRole(user, "ANALISTA_CXP") && factura.precioEstado === "PENDIENTE_CONFIRMAR" && !factura.periodoAConfirmar && (
          <ConfirmarPrecioButton facturaId={factura.id} />
        )}

        {factura.estado === "CONFLICTO_PRECIO" && (
          <div className="flex flex-col gap-3">
            {hasRole(user, "ANALISTA_CXP") && !factura.solicitaExcepcionPrecio && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Gestioná directo con el proveedor que corrija la factura al importe esperado (
                <Link href={`/facturas/${factura.id}/editar`} className="underline">
                  editar factura
                </Link>
                ). Si no llega a tiempo, pedí una autorización excepcional puntual.
              </div>
            )}
            {hasRole(user, "ANALISTA_CXP") && !factura.solicitaExcepcionPrecio && (
              <SolicitarExcepcionForm facturaId={factura.id} />
            )}
            {factura.solicitaExcepcionPrecio && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Autorización excepcional pedida por {factura.solicitaExcepcionPor?.nombre} el{" "}
                {formatFecha(factura.solicitaExcepcionFecha)}: {factura.solicitaExcepcionMotivo}. Esperando decisión
                de Gerencia.
              </p>
            )}
          </div>
        )}

        {factura.excepcionPrecioResueltaFecha && (
          <p className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            {factura.excepcionPrecioConcedida ? "Autorización excepcional concedida" : "Autorización excepcional denegada"}{" "}
            por {factura.excepcionPrecioResueltaPor?.nombre} el {formatFecha(factura.excepcionPrecioResueltaFecha)}:{" "}
            {factura.excepcionPrecioResueltaMotivo}
          </p>
        )}
      </section>

      {factura.estado === "LISTA_PARA_AUTORIZAR" && hasRole(user, "GERENCIA") && (
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="mb-3 font-medium text-slate-900">Autorización</h2>
          <div className="flex flex-wrap gap-4">
            <AutorizarButton facturaId={factura.id} />
            <RechazarFacturaForm facturaId={factura.id} />
          </div>
        </section>
      )}
      {factura.rechazada && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Rechazada: {factura.rechazadaMotivo} — {factura.rechazadaPor?.nombre} ({formatFecha(factura.rechazadaFecha)})
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
