"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { getConfigSistema } from "@/lib/config";
import type { ActionState } from "@/actions/servicios";

export async function resolverConflictoPrecioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const facturaId = String(formData.get("facturaId") ?? "");
  const opcion = String(formData.get("opcion") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) return { error: "El motivo es obligatorio." };

  const factura = await prisma.factura.findUnique({ where: { id: facturaId }, include: { servicio: true, periodos: true } });
  if (!factura) return { error: "Factura no encontrada." };

  const config = await getConfigSistema();
  const autorizado =
    hasRole(user, "ADMIN") ||
    (config.resolutorConflictoPrecio === "RESPONSABLE_OPERATIVO"
      ? factura.servicio.responsableOperativoId === user.id
      : hasRole(user, "COMPRAS"));
  if (!autorizado) return { error: "No estás habilitado para resolver este conflicto de precio." };

  if (opcion === "rechazar") {
    await prisma.$transaction(async (tx) => {
      await tx.factura.update({
        where: { id: facturaId },
        data: {
          rechazadaPrecio: true,
          rechazadaPrecioMotivo: motivo,
          rechazadaPrecioPorId: user.id,
          rechazadaPrecioFecha: new Date(),
        },
      });
      await registrarAuditoria(
        { usuarioId: user.id, entidadTipo: "factura", entidadId: facturaId, accion: "RECHAZO_PRECIO", detalle: motivo },
        tx
      );
    });
  } else if (opcion === "excepcion") {
    // Acepta este importe puntual sin modificar el precio de referencia del servicio
    // (no queda en historial_precio: la condicion general del servicio no cambia).
    await prisma.$transaction(async (tx) => {
      await tx.factura.update({ where: { id: facturaId }, data: { precioEstado: "COINCIDE" } });
      await registrarAuditoria(
        {
          usuarioId: user.id,
          entidadTipo: "factura",
          entidadId: facturaId,
          accion: "APROBACION_EXCEPCIONAL_PRECIO",
          detalle: `Aceptado como excepción puntual, sin cambiar el precio de referencia (${factura.servicio.precioVigente.toString()}). ${motivo}`,
        },
        tx
      );
    });
  } else {
    const nuevoPrecio = Number(formData.get("nuevoPrecio"));
    if (!nuevoPrecio || nuevoPrecio <= 0) return { error: "Ingresá el nuevo precio vigente." };

    await prisma.$transaction(async (tx) => {
      await tx.historialPrecio.create({
        data: {
          servicioId: factura.servicioId,
          precioAnterior: factura.servicio.precioVigente,
          precioNuevo: nuevoPrecio,
          motivo,
          cambiadoPorId: user.id,
        },
      });
      await tx.servicio.update({ where: { id: factura.servicioId }, data: { precioVigente: nuevoPrecio } });
      await tx.factura.update({ where: { id: facturaId }, data: { precioEstado: "COINCIDE" } });
      await registrarAuditoria(
        {
          usuarioId: user.id,
          entidadTipo: "factura",
          entidadId: facturaId,
          accion: "RESOLUCION_CONFLICTO_PRECIO",
          detalle: `Precio actualizado a ${nuevoPrecio}. ${motivo}`,
        },
        tx
      );
    });
  }

  revalidatePath(`/facturas/${facturaId}`);
  revalidatePath("/compras/precios");
  revalidatePath("/facturas/bloqueadas");
  return { success: "Excepción de precio resuelta." };
}

export async function resolverCumplimientoParcialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!hasRole(user, "COMPRAS")) return { error: "Solo Compras puede resolver el cumplimiento parcial." };

  const prestacionId = String(formData.get("prestacionId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const detalle = String(formData.get("detalle") ?? "").trim();
  const importeAjustadoRaw = formData.get("importeAjustado");

  if (!["NOTA_CREDITO", "PAGO_PARCIAL", "RECHAZADA"].includes(tipo)) {
    return { error: "Elegí un tipo de resolución." };
  }
  if (!detalle) return { error: "El detalle es obligatorio." };
  if (tipo === "PAGO_PARCIAL" && (!importeAjustadoRaw || Number(importeAjustadoRaw) <= 0)) {
    return { error: "Ingresá el importe ajustado para el pago parcial." };
  }

  const prestacion = await prisma.prestacion.findUnique({ where: { id: prestacionId } });
  if (!prestacion || prestacion.estado !== "PARCIAL") return { error: "Período no encontrado o no está en estado parcial." };

  await prisma.$transaction(async (tx) => {
    await tx.prestacion.update({
      where: { id: prestacionId },
      data: {
        resolucionParcialTipo: tipo as "NOTA_CREDITO" | "PAGO_PARCIAL" | "RECHAZADA",
        resolucionParcialDetalle: detalle,
        resolucionParcialImporteAjustado: tipo === "PAGO_PARCIAL" ? Number(importeAjustadoRaw) : null,
        resolucionParcialResueltoPorId: user.id,
        resolucionParcialFecha: new Date(),
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "prestacion",
        entidadId: prestacionId,
        accion: "RESOLUCION_CUMPLIMIENTO_PARCIAL",
        detalle: `${tipo}: ${detalle}`,
      },
      tx
    );
  });

  revalidatePath("/compras/parciales");
  revalidatePath("/facturas/bloqueadas");
  return { success: "Cumplimiento parcial resuelto." };
}
