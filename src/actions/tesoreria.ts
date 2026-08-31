"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { cargarFacturaConEstado } from "@/lib/facturas-query";
import type { ActionState } from "@/actions/servicios";

export async function marcarPagadaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("TESORERIA");
  const facturaId = String(formData.get("facturaId") ?? "");
  const comprobanteNumero = String(formData.get("comprobanteNumero") ?? "").trim();
  const comprobanteFechaRaw = String(formData.get("comprobanteFecha") ?? "");

  if (!comprobanteNumero) return { error: "Ingresá el número de comprobante." };
  if (!comprobanteFechaRaw) return { error: "Ingresá la fecha de pago." };

  const factura = await cargarFacturaConEstado(facturaId);
  if (!factura || factura.estado !== "AUTORIZADA_PENDIENTE_PAGO") {
    return { error: "Esta factura no está autorizada y pendiente de pago." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        pagado: true,
        comprobanteNumero,
        comprobanteFecha: new Date(comprobanteFechaRaw),
        pagadoPorId: user.id,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "PAGO_FACTURA",
        detalle: `Comprobante ${comprobanteNumero}`,
      },
      tx
    );
  });

  revalidatePath("/tesoreria");
  revalidatePath("/tesoreria/historial");
  revalidatePath(`/facturas/${facturaId}`);
  return { success: "Factura marcada como pagada." };
}
