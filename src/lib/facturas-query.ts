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
  rechazadaPrecioPor: true,
  rechazadaGerenciaPor: true,
  autorizadoPor: true,
  pagadoPor: true,
} satisfies Prisma.FacturaInclude;

export type FacturaConDatos = Prisma.FacturaGetPayload<{
  include: typeof facturaConDatosInclude;
}>;

export type FacturaConEstado = FacturaConDatos & { estado: EstadoFacturaCode };

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
        rechazadaPrecio: factura.rechazadaPrecio,
        rechazadaGerencia: factura.rechazadaGerencia,
        precioEstado: factura.precioEstado,
        autorizado: factura.autorizado,
        pagado: factura.pagado,
        periodos: factura.periodos.map((p) => ({
          estado: p.prestacion.estado,
          resolucionParcialTipo: p.prestacion.resolucionParcialTipo,
        })),
      },
      { presupuestoActivo: config.presupuestoContratoActivo, saldoPresupuestoInsuficiente }
    );

    return { ...factura, estado };
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
