import "server-only";
import { prisma } from "@/lib/db";

/** Excepcion de precio abierta = alguna factura del servicio en conflicto de precio sin resolver. */
export async function tieneExcepcionPrecioAbierta(servicioId: string) {
  const count = await prisma.factura.count({
    where: { servicioId, precioEstado: "CONFLICTO", rechazadaPrecio: false },
  });
  return count > 0;
}
