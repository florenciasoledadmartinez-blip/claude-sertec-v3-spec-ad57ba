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

export async function rechazarFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
      data: { rechazada: true, rechazadaMotivo: motivo, rechazadaPorId: user.id, rechazadaFecha: new Date() },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "factura", entidadId: facturaId, accion: "RECHAZO_FACTURA", detalle: motivo },
      tx
    );
  });

  revalidatePath("/gerencia");
  revalidatePath(`/facturas/${facturaId}`);
  return { success: "Factura rechazada." };
}

export async function aprobarServicioAction(formData: FormData) {
  const user = await requireRole("GERENCIA");
  const servicioId = String(formData.get("servicioId") ?? "");

  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });
  if (!servicio || servicio.estado !== "PENDIENTE_DE_APROBACION") return;

  await prisma.$transaction(async (tx) => {
    await tx.servicio.update({
      where: { id: servicioId },
      data: { estado: "ACTIVO", aprobadoPorId: user.id, fechaAprobacion: new Date() },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "servicio", entidadId: servicioId, accion: "APROBACION_SERVICIO" },
      tx
    );
  });

  revalidatePath("/gerencia/servicios");
  revalidatePath(`/servicios/${servicioId}`);
}

export async function rechazarServicioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("GERENCIA");
  const servicioId = String(formData.get("servicioId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "El motivo es obligatorio." };

  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });
  if (!servicio || servicio.estado !== "PENDIENTE_DE_APROBACION") {
    return { error: "Este servicio ya no está pendiente de aprobación." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.servicio.update({
      where: { id: servicioId },
      data: { estado: "RECHAZADO", aprobadoPorId: user.id, fechaAprobacion: new Date(), motivoRechazo: motivo },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "servicio",
        entidadId: servicioId,
        accion: "RECHAZO_SERVICIO",
        detalle: motivo,
      },
      tx
    );
  });

  revalidatePath("/gerencia/servicios");
  revalidatePath(`/servicios/${servicioId}`);
  return { success: "Propuesta de servicio rechazada." };
}

export async function aprobarSolicitudPrecioAction(formData: FormData) {
  const user = await requireRole("GERENCIA");
  const solicitudId = String(formData.get("solicitudId") ?? "");

  const solicitud = await prisma.solicitudCambioPrecio.findUnique({
    where: { id: solicitudId },
    include: { servicio: true },
  });
  if (!solicitud || solicitud.estado !== "PENDIENTE") return;

  await prisma.$transaction(async (tx) => {
    await tx.historialPrecio.create({
      data: {
        servicioId: solicitud.servicioId,
        precioAnterior: solicitud.servicio.precioVigente,
        precioNuevo: solicitud.precioPropuesto,
        motivo: solicitud.observaciones,
        origen: "SOLICITUD_CAMBIO_PRECIO",
        cambiadoPorId: user.id,
      },
    });
    await tx.servicio.update({
      where: { id: solicitud.servicioId },
      data: { precioVigente: solicitud.precioPropuesto },
    });
    await tx.solicitudCambioPrecio.update({
      where: { id: solicitudId },
      data: { estado: "APROBADA", resueltoPorId: user.id, fechaResolucion: new Date() },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "solicitudCambioPrecio",
        entidadId: solicitudId,
        accion: "APROBACION_SOLICITUD_PRECIO",
        detalle: `${solicitud.precioActual} → ${solicitud.precioPropuesto}`,
      },
      tx
    );
  });

  revalidatePath("/gerencia/precios");
  revalidatePath(`/servicios/${solicitud.servicioId}`);
}

export async function rechazarSolicitudPrecioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("GERENCIA");
  const solicitudId = String(formData.get("solicitudId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "El motivo es obligatorio." };

  const solicitud = await prisma.solicitudCambioPrecio.findUnique({ where: { id: solicitudId } });
  if (!solicitud || solicitud.estado !== "PENDIENTE") {
    return { error: "Esta solicitud ya no está pendiente." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.solicitudCambioPrecio.update({
      where: { id: solicitudId },
      data: { estado: "RECHAZADA", resueltoPorId: user.id, fechaResolucion: new Date(), motivoRechazo: motivo },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "solicitudCambioPrecio",
        entidadId: solicitudId,
        accion: "RECHAZO_SOLICITUD_PRECIO",
        detalle: motivo,
      },
      tx
    );
  });

  revalidatePath("/gerencia/precios");
  revalidatePath(`/servicios/${solicitud.servicioId}`);
  return { success: "Solicitud de cambio de precio rechazada." };
}

export async function concederAutorizacionExcepcionalAction(formData: FormData) {
  const user = await requireRole("GERENCIA");
  const facturaId = String(formData.get("facturaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || "Autorización excepcional concedida.";

  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura || !factura.solicitaExcepcionPrecio) return;

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        excepcionPrecioConcedida: true,
        excepcionPrecioResueltaMotivo: motivo,
        excepcionPrecioResueltaPorId: user.id,
        excepcionPrecioResueltaFecha: new Date(),
        solicitaExcepcionPrecio: false,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "CONCESION_AUTORIZACION_EXCEPCIONAL",
        detalle: motivo,
      },
      tx
    );
  });

  revalidatePath("/gerencia/excepciones");
  revalidatePath(`/facturas/${facturaId}`);
}

export async function denegarAutorizacionExcepcionalAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("GERENCIA");
  const facturaId = String(formData.get("facturaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "El motivo es obligatorio." };

  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura || !factura.solicitaExcepcionPrecio) {
    return { error: "Esta factura no tiene un pedido de autorización excepcional pendiente." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        solicitaExcepcionPrecio: false,
        excepcionPrecioResueltaMotivo: motivo,
        excepcionPrecioResueltaPorId: user.id,
        excepcionPrecioResueltaFecha: new Date(),
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "DENEGACION_AUTORIZACION_EXCEPCIONAL",
        detalle: motivo,
      },
      tx
    );
  });

  revalidatePath("/gerencia/excepciones");
  revalidatePath(`/facturas/${facturaId}`);
  return { success: "Autorización excepcional denegada. La factura vuelve a la corrección administrativa." };
}

export async function autorizarAnticipoAction(formData: FormData) {
  const user = await requireRole("GERENCIA");
  const anticipoId = String(formData.get("anticipoId") ?? "");

  const anticipo = await prisma.anticipo.findUnique({ where: { id: anticipoId } });
  if (!anticipo || anticipo.estado !== "PENDIENTE_AUTORIZACION") return;

  await prisma.$transaction(async (tx) => {
    await tx.anticipo.update({
      where: { id: anticipoId },
      data: { estado: "AUTORIZADO", autorizadoPorId: user.id, fechaAutorizacion: new Date() },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "anticipo", entidadId: anticipoId, accion: "AUTORIZACION_ANTICIPO" },
      tx
    );
  });

  revalidatePath("/gerencia/anticipos");
  revalidatePath("/anticipos");
}
