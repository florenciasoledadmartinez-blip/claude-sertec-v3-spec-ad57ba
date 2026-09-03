import "server-only";
import { prisma } from "@/lib/db";
import { getConfigSistema } from "@/lib/config";
import { diasHabilesTranscurridos, diasCorridosTranscurridos } from "@/lib/format";

export type ItemVencido = {
  tipo: string;
  persona: string;
  entidadTipo: string;
  entidadId: string;
  detalle: string;
  diasAtraso: number;
  href: string;
};

const ESCALACION_ANTICIPO_DIAS = 15;

/** Panel agregado de vencimientos (spec seccion 6): toda tarea pendiente que superó su SLA. */
export async function getVencimientos(): Promise<ItemVencido[]> {
  const config = await getConfigSistema();
  const items: ItemVencido[] = [];

  const facturasAConfirmar = await prisma.factura.findMany({
    where: { periodoAConfirmar: true, rechazada: false },
    include: { servicio: { include: { responsableOperativo: true } } },
  });
  for (const f of facturasAConfirmar) {
    const dias = diasHabilesTranscurridos(f.fechaRegistro);
    if (dias > config.slaPeriodoAConfirmarDias) {
      items.push({
        tipo: "Período a confirmar",
        persona: f.servicio.responsableOperativo.nombre,
        entidadTipo: "factura",
        entidadId: f.id,
        detalle: `Factura ${f.numeroFactura} — ${f.servicio.proveedor}`,
        diasAtraso: dias - config.slaPeriodoAConfirmarDias,
        href: `/facturas/${f.id}`,
      });
    }
  }

  const prestacionesSinAjuste = await prisma.prestacion.findMany({
    where: { estado: "PARCIAL", importeEsperadoAjustado: null, fecha: { not: null } },
    include: { servicio: { include: { responsableOperativo: true } } },
  });
  for (const p of prestacionesSinAjuste) {
    if (!p.fecha) continue;
    const dias = diasHabilesTranscurridos(p.fecha);
    if (dias > config.slaCumplimientoParcialDias) {
      items.push({
        tipo: "Ajuste de prestación parcial",
        persona: p.servicio.responsableOperativo.nombre,
        entidadTipo: "prestacion",
        entidadId: p.id,
        detalle: `${p.servicio.proveedor} — período ${p.periodo}`,
        diasAtraso: dias - config.slaCumplimientoParcialDias,
        href: `/servicios/${p.servicioId}`,
      });
    }
  }

  const facturasConflicto = await prisma.factura.findMany({
    where: {
      precioEstado: "CONFLICTO",
      excepcionPrecioConcedida: false,
      solicitaExcepcionPrecio: false,
      rechazada: false,
      precioConfirmadoFecha: { not: null },
    },
    include: { servicio: true, registradoPor: true },
  });
  for (const f of facturasConflicto) {
    if (!f.precioConfirmadoFecha) continue;
    const dias = diasHabilesTranscurridos(f.precioConfirmadoFecha);
    if (dias > config.slaConflictoPrecioDias) {
      items.push({
        tipo: "Corrección de precio con el proveedor",
        persona: f.registradoPor.nombre,
        entidadTipo: "factura",
        entidadId: f.id,
        detalle: `Factura ${f.numeroFactura} — ${f.servicio.proveedor}`,
        diasAtraso: dias - config.slaConflictoPrecioDias,
        href: `/facturas/${f.id}`,
      });
    }
  }

  const serviciosPendientes = await prisma.servicio.findMany({
    where: { estado: "PENDIENTE_DE_APROBACION" },
  });
  for (const s of serviciosPendientes) {
    const dias = diasHabilesTranscurridos(s.createdAt);
    if (dias > config.slaAprobacionDias) {
      items.push({
        tipo: "Alta de servicio pendiente de aprobación",
        persona: "Gerencia",
        entidadTipo: "servicio",
        entidadId: s.id,
        detalle: `${s.proveedor} — ${s.descripcion}`,
        diasAtraso: dias - config.slaAprobacionDias,
        href: `/gerencia/servicios`,
      });
    }
  }

  const solicitudesPendientes = await prisma.solicitudCambioPrecio.findMany({
    where: { estado: "PENDIENTE" },
    include: { servicio: true },
  });
  for (const s of solicitudesPendientes) {
    const dias = diasHabilesTranscurridos(s.fechaSolicitud);
    if (dias > config.slaAprobacionDias) {
      items.push({
        tipo: "Solicitud de cambio de precio pendiente",
        persona: "Gerencia",
        entidadTipo: "solicitudCambioPrecio",
        entidadId: s.id,
        detalle: `${s.servicio.proveedor} — ${s.servicio.descripcion}`,
        diasAtraso: dias - config.slaAprobacionDias,
        href: `/gerencia/precios`,
      });
    }
  }

  const anticiposSinAplicar = await prisma.anticipo.findMany({
    where: { estado: "PAGADO", aplicado: false },
  });
  for (const a of anticiposSinAplicar) {
    if (!a.fechaPago) continue;
    const dias = diasCorridosTranscurridos(a.fechaPago);
    if (dias > ESCALACION_ANTICIPO_DIAS) {
      items.push({
        tipo: "Anticipo sin aplicar (15 días corridos)",
        persona: "Compras / Gerencia",
        entidadTipo: "anticipo",
        entidadId: a.id,
        detalle: `${a.proveedor} — proforma ${a.numeroProforma}`,
        diasAtraso: dias - ESCALACION_ANTICIPO_DIAS,
        href: `/anticipos`,
      });
    }
  }

  return items.sort((a, b) => b.diasAtraso - a.diasAtraso);
}
