import "server-only";
import { prisma } from "@/lib/db";
import { getConfigSistema } from "@/lib/config";
import { calcularSaldoPresupuesto } from "@/lib/presupuesto";
import { computeEstadoFactura, type EstadoFacturaCode } from "@/lib/estado-factura";
import { Prisma } from "@/generated/prisma/client";

export const facturaConDatosInclude = {
  servicio: { include: { responsableOperativo: true } },
  periodos: { include: { prestacion: true } },
  registradoPor: true,
  rechazadaPor: true,
  solicitaExcepcionPor: true,
  excepcionPrecioResueltaPor: true,
  autorizadoPor: true,
  pagadoPor: true,
  anticipo: true,
} satisfies Prisma.FacturaInclude;

export type FacturaConDatos = Prisma.FacturaGetPayload<{
  include: typeof facturaConDatosInclude;
}>;

export type FacturaConEstado = FacturaConDatos & { estado: EstadoFacturaCode; importeEsperado: Prisma.Decimal };

/**
 * Importe esperado de la factura: para cada periodo cubierto, el importe_esperado_ajustado
 * cargado por el responsable (si el periodo fue certificado Parcial) o, si no hay ajuste, el
 * precio vigente del servicio. Reemplaza la comparacion vieja de precioVigente x cantidad.
 */
export function calcularImporteEsperado(factura: FacturaConDatos): Prisma.Decimal {
  if (factura.periodos.length === 0) return factura.servicio.precioVigente;
  return factura.periodos.reduce(
    (acc, p) => acc.add(p.prestacion.importeEsperadoAjustado ?? factura.servicio.precioVigente),
    new Prisma.Decimal(0)
  );
}

export async function anotarEstados(facturas: FacturaConDatos[]): Promise<FacturaConEstado[]> {
  const config = await getConfigSistema();

  const saldoPorServicio = new Map<string, Prisma.Decimal | null>();
  if (config.presupuestoContratoActivo) {
    const servicioIds = [...new Set(facturas.map((f) => f.servicioId))];
    await Promise.all(
      servicioIds.map(async (id) => {
        const resultado = await calcularSaldoPresupuesto(id);
        saldoPorServicio.set(id, resultado.aplica ? resultado.saldo : null);
      })
    );
  }

  return facturas.map((factura) => {
    let saldoPresupuestoInsuficiente = false;
    if (config.presupuestoContratoActivo && !factura.autorizado) {
      const saldo = saldoPorServicio.get(factura.servicioId);
      if (saldo != null) {
        saldoPresupuestoInsuficiente = saldo.sub(factura.importeFacturado).lt(0);
      }
    }

    const estado = computeEstadoFactura(
      {
        periodoAConfirmar: factura.periodoAConfirmar,
        rechazada: factura.rechazada,
        precioEstado: factura.precioEstado,
        excepcionPrecioConcedida: factura.excepcionPrecioConcedida,
        autorizado: factura.autorizado,
        pagado: factura.pagado,
        periodos: factura.periodos.map((p) => ({
          estado: p.prestacion.estado,
          importeEsperadoAjustado: p.prestacion.importeEsperadoAjustado,
        })),
      },
      { presupuestoActivo: config.presupuestoContratoActivo, saldoPresupuestoInsuficiente }
    );

    return { ...factura, estado, importeEsperado: calcularImporteEsperado(factura) };
  });
}

export async function cargarFacturasConEstado(where: Prisma.FacturaWhereInput = {}) {
  const facturas = await prisma.factura.findMany({
    where,
    include: facturaConDatosInclude,
    orderBy: { fechaRegistro: "desc" },
  });
  return anotarEstados(facturas);
}

export async function cargarFacturaConEstado(id: string) {
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: facturaConDatosInclude,
  });
  if (!factura) return null;
  const [conEstado] = await anotarEstados([factura]);
  return conEstado;
}
