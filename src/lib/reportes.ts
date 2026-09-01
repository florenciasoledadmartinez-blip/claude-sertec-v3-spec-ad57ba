import "server-only";
import { cargarFacturasConEstado, type FacturaConEstado } from "@/lib/facturas-query";
import { getConfigSistema } from "@/lib/config";
import { ESTADOS_EXCEPCION, ESTADO_FACTURA_LABEL, responsableExcepcion } from "@/lib/estado-factura";
import { diasHabilesDesde, diasHabilesTranscurridos } from "@/lib/format";
import { prisma } from "@/lib/db";

export type FilaExcepcion = {
  factura: FacturaConEstado;
  proveedor: string;
  numeroFactura: string;
  tipoExcepcion: string;
  diasAbierta: number;
  responsable: string;
  observacion: string;
  fechaLimite: Date | null;
};

export async function getReporteExcepciones(): Promise<FilaExcepcion[]> {
  const config = await getConfigSistema();
  const facturas = await cargarFacturasConEstado({});
  const abiertas = facturas.filter((f) => ESTADOS_EXCEPCION.includes(f.estado));

  return abiertas.map((f) => {
    const observacionPeriodo = f.periodos.find((p) => p.prestacion.observacion)?.prestacion.observacion;
    const dias = diasHabilesTranscurridos(f.fechaRegistro);

    let sla: number | null = null;
    if (f.estado === "CONFLICTO_PRECIO") sla = config.slaConflictoPrecioDias;
    if (f.estado === "CONFLICTO_PARCIAL") sla = config.slaCumplimientoParcialDias;
    if (f.estado === "PERIODO_A_CONFIRMAR") sla = config.slaPeriodoAConfirmarDias;

    return {
      factura: f,
      proveedor: f.servicio.proveedor,
      numeroFactura: f.numeroFactura,
      tipoExcepcion: ESTADO_FACTURA_LABEL[f.estado],
      diasAbierta: dias,
      responsable: responsableExcepcion(f.estado, config.resolutorConflictoPrecio),
      observacion: observacionPeriodo ?? "",
      fechaLimite: sla != null ? diasHabilesDesde(f.fechaRegistro, sla) : null,
    };
  });
}

export async function getReporteConciliacion(desde?: Date, hasta?: Date) {
  const facturas = await prisma.factura.findMany({
    where: {
      OR: [{ autorizado: true }, { pagado: true }],
      ...(desde || hasta
        ? {
            autorizadoFecha: {
              gte: desde ?? undefined,
              lte: hasta ?? undefined,
            },
          }
        : {}),
    },
    include: { servicio: true },
    orderBy: { autorizadoFecha: "asc" },
  });
  return facturas;
}

/** Facturas autorizadas por Gerencia, esperando el pago de Tesorería. */
export async function getPendientesDePago(proveedor?: string) {
  const facturas = await prisma.factura.findMany({
    where: {
      autorizado: true,
      pagado: false,
      ...(proveedor ? { servicio: { proveedor: { contains: proveedor, mode: "insensitive" } } } : {}),
    },
    include: { servicio: true, autorizadoPor: true },
    orderBy: { autorizadoFecha: "asc" },
  });
  const total = facturas.reduce((acc, f) => acc + Number(f.importeFacturado), 0);
  return { facturas, total, cantidad: facturas.length };
}
