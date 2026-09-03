"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { getConfigSistema } from "@/lib/config";
import { AnticipoSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/servicios";

export async function crearAnticipoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("COMPRAS");

  const parsed = AnticipoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  const config = await getConfigSistema();
  const requiereAutorizacion = data.monto > Number(config.umbralAnticipoAutorizacion);

  await prisma.$transaction(async (tx) => {
    const a = await tx.anticipo.create({
      data: {
        proveedor: data.proveedor,
        cuit: data.cuit,
        numeroProforma: data.numeroProforma,
        monto: data.monto,
        fechaEstimadaEntrega: data.fechaEstimadaEntrega ? new Date(data.fechaEstimadaEntrega) : null,
        solicitadoPorId: user.id,
        requiereAutorizacion,
        estado: requiereAutorizacion ? "PENDIENTE_AUTORIZACION" : "AUTORIZADO",
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "anticipo",
        entidadId: a.id,
        accion: "SOLICITUD_ANTICIPO",
        detalle: `${data.proveedor} — proforma ${data.numeroProforma} — ${data.monto}`,
      },
      tx
    );
    return a;
  });

  revalidatePath("/anticipos");
  redirect(`/anticipos`);
}

export async function marcarAnticipoPagadoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("TESORERIA");
  const anticipoId = String(formData.get("anticipoId") ?? "");

  const anticipo = await prisma.anticipo.findUnique({ where: { id: anticipoId } });
  if (!anticipo) return { error: "Anticipo no encontrado." };
  if (anticipo.estado !== "AUTORIZADO") {
    return { error: "Este anticipo todavía no está autorizado para pagar." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.anticipo.update({
      where: { id: anticipoId },
      data: { estado: "PAGADO", pagadoPorId: user.id, fechaPago: new Date() },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "anticipo",
        entidadId: anticipoId,
        accion: "PAGO_ANTICIPO",
        detalle: `${anticipo.proveedor} — proforma ${anticipo.numeroProforma}`,
      },
      tx
    );
  });

  revalidatePath("/tesoreria/anticipos");
  revalidatePath("/anticipos");
  return { success: "Anticipo marcado como pagado." };
}
