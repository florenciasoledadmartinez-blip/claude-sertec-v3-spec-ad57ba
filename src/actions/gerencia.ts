"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { cargarFacturaConEstado } from "@/lib/facturas-query";
import type { ActionState } from "@/actions/servicios";

export async function autorizarFacturaAction(facturaId: string) {
  const user = await requireRole("GERENCIA");

  const factura = await cargarFacturaConEstado(facturaId);
  if (!factura || factura.estado !== "LISTA_PARA_AUTORIZAR") return;

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: { autorizado: true, autorizadoPorId: user.id, autorizadoFecha: new Date() },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "factura", entidadId: facturaId, accion: "AUTORIZACION_PAGO" },
      tx
    );
  });

  revalidatePath("/gerencia");
  revalidatePath(`/facturas/${facturaId}`);
}

export async function rechazarFacturaGerenciaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("GERENCIA");
  const facturaId = String(formData.get("facturaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "El motivo es obligatorio." };

  const factura = await cargarFacturaConEstado(facturaId);
  if (!factura || factura.estado !== "LISTA_PARA_AUTORIZAR") {
    return { error: "Esta factura ya no está lista para autorizar." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        rechazadaGerencia: true,
        rechazadaGerenciaMotivo: motivo,
        rechazadaGerenciaPorId: user.id,
        rechazadaGerenciaFecha: new Date(),
      },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "factura", entidadId: facturaId, accion: "RECHAZO_GERENCIA", detalle: motivo },
      tx
    );
  });

  revalidatePath("/gerencia");
  revalidatePath(`/facturas/${facturaId}`);
  return { success: "Factura rechazada." };
}
