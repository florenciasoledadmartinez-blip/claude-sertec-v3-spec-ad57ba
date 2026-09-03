"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, hasRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { ServicioSchema, ServicioEdicionSchema, CertificacionSchema, SolicitudPrecioSchema } from "@/lib/validations";

export type ActionState =
  | { error?: string; success?: string; warning?: string; valores?: Record<string, unknown> }
  | undefined;

export async function crearServicioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("RESPONSABLE_OPERATIVO");

  const parsed = ServicioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  // Solo puede asignar el servicio a si mismo o a otro responsable operativo existente.
  const responsable = await prisma.usuario.findUnique({
    where: { id: data.responsableOperativoId },
    include: { roles: true },
  });
  if (!responsable || !responsable.roles.some((r) => r.role === "RESPONSABLE_OPERATIVO")) {
    return { error: "El responsable seleccionado no es válido." };
  }

  const servicio = await prisma.servicio.create({
    data: {
      proveedor: data.proveedor,
      cuit: data.cuit,
      area: data.area,
      descripcion: data.descripcion,
      responsableOperativoId: data.responsableOperativoId,
      precioVigente: data.precioVigente,
      periodicidad: data.periodicidad,
      actualizacionFrecuencia: data.actualizacionFrecuencia || null,
      actualizacionBase: data.actualizacionBase || null,
      vigenteDesde: new Date(data.vigenteDesde),
      duracionEnPeriodos: data.duracionEnPeriodos ?? null,
      estado: "PENDIENTE_DE_APROBACION",
    },
  });

  await registrarAuditoria({
    usuarioId: user.id,
    entidadTipo: "servicio",
    entidadId: servicio.id,
    accion: "PROPUESTA_SERVICIO",
    detalle: `${data.proveedor} — ${data.descripcion}`,
  });

  redirect(`/servicios/${servicio.id}`);
}

async function assertResponsableDelServicio(servicioId: string) {
  const user = await requireRole("RESPONSABLE_OPERATIVO");
  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });
  if (!servicio) redirect("/servicios");
  if (servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) {
    redirect("/servicios");
  }
  return { user, servicio };
}

export async function editarServicioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const servicioId = String(formData.get("servicioId") ?? "");
  const { user } = await assertResponsableDelServicio(servicioId);

  const parsed = ServicioEdicionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.servicio.update({
      where: { id: servicioId },
      data: {
        proveedor: data.proveedor,
        cuit: data.cuit,
        area: data.area,
        descripcion: data.descripcion,
        periodicidad: data.periodicidad,
        actualizacionFrecuencia: data.actualizacionFrecuencia || null,
        actualizacionBase: data.actualizacionBase || null,
        vigenteDesde: new Date(data.vigenteDesde),
        duracionEnPeriodos: data.duracionEnPeriodos ?? null,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "servicio",
        entidadId: servicioId,
        accion: "EDICION_SERVICIO",
        detalle: "Datos descriptivos actualizados",
      },
      tx
    );
  });

  revalidatePath(`/servicios/${servicioId}`);
  return { success: "Servicio actualizado." };
}

export async function reproponerServicioAction(formData: FormData) {
  const servicioId = String(formData.get("servicioId") ?? "");
  const { user, servicio } = await assertResponsableDelServicio(servicioId);
  if (servicio.estado !== "RECHAZADO") redirect(`/servicios/${servicioId}`);

  await prisma.$transaction(async (tx) => {
    await tx.servicio.update({
      where: { id: servicioId },
      data: { estado: "PENDIENTE_DE_APROBACION", motivoRechazo: null },
    });
    await registrarAuditoria(
      { usuarioId: user.id, entidadTipo: "servicio", entidadId: servicioId, accion: "REPROPUESTA_SERVICIO" },
      tx
    );
  });

  revalidatePath(`/servicios/${servicioId}`);
}

export async function darDeBajaServicioAction(formData: FormData) {
  const servicioId = String(formData.get("servicioId") ?? "");
  const { user, servicio } = await assertResponsableDelServicio(servicioId);
  if (servicio.estado !== "ACTIVO") redirect(`/servicios/${servicioId}`);

  await prisma.servicio.update({ where: { id: servicioId }, data: { estado: "BAJA" } });
  await registrarAuditoria({
    usuarioId: user.id,
    entidadTipo: "servicio",
    entidadId: servicioId,
    accion: "BAJA_SERVICIO",
  });

  redirect("/servicios");
}

export async function reactivarServicioAction(formData: FormData) {
  const servicioId = String(formData.get("servicioId") ?? "");
  const { user, servicio } = await assertResponsableDelServicio(servicioId);
  if (servicio.estado !== "BAJA") redirect(`/servicios/${servicioId}`);

  await prisma.servicio.update({ where: { id: servicioId }, data: { estado: "ACTIVO" } });
  await registrarAuditoria({
    usuarioId: user.id,
    entidadTipo: "servicio",
    entidadId: servicioId,
    accion: "REACTIVACION_SERVICIO",
  });

  revalidatePath(`/servicios/${servicioId}`);
}

export async function certificarPrestacionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = CertificacionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const { prestacionId, estado, observacion } = parsed.data;

  if (estado !== "CUMPLIDO" && !observacion) {
    return { error: "La observación es obligatoria salvo que el período esté Cumplido." };
  }

  const prestacion = await prisma.prestacion.findUnique({
    where: { id: prestacionId },
    include: { servicio: true },
  });
  if (!prestacion) return { error: "Período no encontrado." };

  const user = await requireRole("RESPONSABLE_OPERATIVO");
  if (prestacion.servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) {
    return { error: "No sos responsable de este servicio." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.prestacion.update({
      where: { id: prestacionId },
      data: {
        estado,
        observacion: observacion || null,
        validadoPorId: user.id,
        fecha: new Date(),
        // Si se re-certifica, el importe ajustado de una vuelta anterior ya no aplica.
        importeEsperadoAjustado: estado === "PARCIAL" ? prestacion.importeEsperadoAjustado : null,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "prestacion",
        entidadId: prestacionId,
        accion: "CERTIFICACION_PRESTACION",
        detalle: `${prestacion.periodo}: ${estado}${observacion ? " — " + observacion : ""}`,
      },
      tx
    );
  });

  revalidatePath(`/servicios/${prestacion.servicioId}`);
  return { success: "Período certificado." };
}

export async function cargarImporteAjustadoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const prestacionId = String(formData.get("prestacionId") ?? "");
  const importeEsperadoAjustado = Number(formData.get("importeEsperadoAjustado"));
  if (!importeEsperadoAjustado || importeEsperadoAjustado <= 0) {
    return { error: "Ingresá el importe esperado ajustado." };
  }

  const prestacion = await prisma.prestacion.findUnique({
    where: { id: prestacionId },
    include: { servicio: true },
  });
  if (!prestacion || prestacion.estado !== "PARCIAL") {
    return { error: "Este período no está certificado como Parcial." };
  }

  const user = await requireRole("RESPONSABLE_OPERATIVO");
  if (prestacion.servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) {
    return { error: "No sos responsable de este servicio." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.prestacion.update({ where: { id: prestacionId }, data: { importeEsperadoAjustado } });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "prestacion",
        entidadId: prestacionId,
        accion: "AJUSTE_IMPORTE_ESPERADO",
        detalle: `${prestacion.periodo}: importe ajustado a ${importeEsperadoAjustado}`,
      },
      tx
    );
  });

  revalidatePath(`/servicios/${prestacion.servicioId}`);
  return { success: "Importe ajustado cargado." };
}

export async function crearSolicitudCambioPrecioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = SolicitudPrecioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const { servicioId, precioPropuesto, observaciones } = parsed.data;

  const { user, servicio } = await assertResponsableDelServicio(servicioId);
  if (servicio.estado !== "ACTIVO") {
    return { error: "Solo se puede pedir un cambio de precio para un servicio activo." };
  }

  const pendiente = await prisma.solicitudCambioPrecio.findFirst({
    where: { servicioId, estado: "PENDIENTE" },
  });
  if (pendiente) return { error: "Ya hay una solicitud de cambio de precio pendiente para este servicio." };

  await prisma.$transaction(async (tx) => {
    const solicitud = await tx.solicitudCambioPrecio.create({
      data: {
        servicioId,
        precioActual: servicio.precioVigente,
        precioPropuesto,
        observaciones,
        solicitadoPorId: user.id,
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "solicitudCambioPrecio",
        entidadId: solicitud.id,
        accion: "SOLICITUD_CAMBIO_PRECIO",
        detalle: `${servicio.precioVigente} → ${precioPropuesto}. ${observaciones}`,
      },
      tx
    );
  });

  revalidatePath(`/servicios/${servicioId}`);
  return { success: "Solicitud de cambio de precio elevada a Gerencia." };
}

export async function crearPeriodoManualAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const servicioId = String(formData.get("servicioId") ?? "");
  const periodo = String(formData.get("periodo") ?? "").trim();
  if (!periodo) return { error: "Ingresá la etiqueta del período." };

  const { user } = await assertResponsableDelServicio(servicioId);

  const existente = await prisma.prestacion.findUnique({
    where: { servicioId_periodo: { servicioId, periodo } },
  });
  if (existente) return { error: "Ya existe un período con esa etiqueta para este servicio." };

  const prestacion = await prisma.prestacion.create({
    data: { servicioId, periodo, creadoManualmente: true },
  });

  await registrarAuditoria({
    usuarioId: user.id,
    entidadTipo: "prestacion",
    entidadId: prestacion.id,
    accion: "CREACION_MANUAL_PERIODO",
    detalle: periodo,
  });

  revalidatePath(`/servicios/${servicioId}`);
  return { success: "Período creado. Todavía requiere certificación." };
}

export async function asignarPeriodoFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const facturaId = String(formData.get("facturaId") ?? "");
  const prestacionId = String(formData.get("prestacionId") ?? "");
  if (!prestacionId) return { error: "Elegí un período." };

  const factura = await prisma.factura.findUnique({ where: { id: facturaId }, include: { servicio: true } });
  if (!factura) return { error: "Factura no encontrada." };

  const user = await requireRole("RESPONSABLE_OPERATIVO");
  if (factura.servicio.responsableOperativoId !== user.id && !hasRole(user, "ADMIN")) {
    return { error: "No sos responsable de este servicio." };
  }

  const prestacion = await prisma.prestacion.findUnique({ where: { id: prestacionId } });
  if (!prestacion || prestacion.servicioId !== factura.servicioId) {
    return { error: "El período elegido no corresponde a este servicio." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({ where: { id: facturaId }, data: { periodoAConfirmar: false } });
    await tx.facturaPeriodo.create({ data: { facturaId, prestacionId } });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "ASIGNACION_PERIODO",
        detalle: `Período asignado: ${prestacion.periodo}`,
      },
      tx
    );
  });

  revalidatePath(`/facturas/${facturaId}`);
  revalidatePath("/facturas/bloqueadas");
  return { success: "Período asignado a la factura." };
}
