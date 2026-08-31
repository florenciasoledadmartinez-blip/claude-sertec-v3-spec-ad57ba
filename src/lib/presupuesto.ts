import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Control de presupuesto de contrato (spec 5.5, opcional). Independiente del control
 * de prestacion: un contrato puede tener saldo de sobra y aun asi un periodo puntual
 * no haberse prestado, y viceversa.
 */
export async function calcularSaldoPresupuesto(servicioId: string, excluirFacturaId?: string) {
  const servicio = await prisma.servicio.findUniqueOrThrow({ where: { id: servicioId } });

  if (!servicio.duracionEnPeriodos) {
    return { aplica: false as const };
  }

  const presupuestoTotal = servicio.precioVigente.mul(servicio.duracionEnPeriodos);

  const usadas = await prisma.factura.findMany({
    where: {
      servicioId,
      id: excluirFacturaId ? { not: excluirFacturaId } : undefined,
      OR: [{ autorizado: true }, { pagado: true }],
    },
    select: { importeFacturado: true },
  });

  const usado = usadas.reduce((acc, f) => acc.add(f.importeFacturado), new Prisma.Decimal(0));
  const saldo = presupuestoTotal.sub(usado);

  return { aplica: true as const, presupuestoTotal, usado, saldo };
}

export async function excedePresupuesto(
  servicioId: string,
  importeFactura: Prisma.Decimal,
  excluirFacturaId?: string
) {
  const resultado = await calcularSaldoPresupuesto(servicioId, excluirFacturaId);
  if (!resultado.aplica) return false;
  return resultado.saldo.sub(importeFactura).lt(0);
}
