"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { periodoActual } from "@/lib/periodos";
import type { ActionState } from "@/actions/servicios";
import type { RoleName } from "@/generated/prisma/client";

export async function crearUsuarioAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const area = String(formData.get("area") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roles = formData.getAll("roles").map(String) as RoleName[];

  if (!nombre || !email || !password) return { error: "Completá nombre, email y contraseña." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (roles.length === 0) return { error: "Asigná al menos un rol." };

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { error: "Ya existe un usuario con ese email." };

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      area: area || null,
      passwordHash,
      roles: { create: roles.map((role) => ({ role })) },
    },
  });

  await registrarAuditoria({
    usuarioId: admin.id,
    entidadTipo: "usuario",
    entidadId: usuario.id,
    accion: "ALTA_USUARIO",
    detalle: `${nombre} (${email}) — ${roles.join(", ")}`,
  });

  revalidatePath("/admin/usuarios");
  return { success: "Usuario creado." };
}

export async function actualizarRolesUsuarioAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const usuarioId = String(formData.get("usuarioId") ?? "");
  const roles = formData.getAll("roles").map(String) as RoleName[];
  const activo = formData.get("activo") === "on";

  await prisma.$transaction(async (tx) => {
    await tx.usuarioRol.deleteMany({ where: { usuarioId } });
    await tx.usuarioRol.createMany({ data: roles.map((role) => ({ usuarioId, role })) });
    await tx.usuario.update({ where: { id: usuarioId }, data: { activo } });
    await registrarAuditoria(
      {
        usuarioId: admin.id,
        entidadTipo: "usuario",
        entidadId: usuarioId,
        accion: "EDICION_ROLES_USUARIO",
        detalle: `Roles: ${roles.join(", ")} — Activo: ${activo}`,
      },
      tx
    );
  });

  revalidatePath("/admin/usuarios");
}

const ConfigSchema = z.object({
  resolutorConflictoPrecio: z.enum(["RESPONSABLE_OPERATIVO", "COMPRAS"]),
  slaConflictoPrecioDias: z.coerce.number().int().positive(),
  slaCumplimientoParcialDias: z.coerce.number().int().positive(),
  slaPeriodoAConfirmarDias: z.coerce.number().int().positive(),
  presupuestoContratoActivo: z.coerce.boolean().optional().default(false),
  fechaCorte: z.string().min(1),
});

export async function actualizarConfigAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const parsed = ConfigSchema.safeParse({
    resolutorConflictoPrecio: formData.get("resolutorConflictoPrecio"),
    slaConflictoPrecioDias: formData.get("slaConflictoPrecioDias"),
    slaCumplimientoParcialDias: formData.get("slaCumplimientoParcialDias"),
    slaPeriodoAConfirmarDias: formData.get("slaPeriodoAConfirmarDias"),
    presupuestoContratoActivo: formData.get("presupuestoContratoActivo") === "on",
    fechaCorte: formData.get("fechaCorte"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const data = parsed.data;

  await prisma.configSistema.upsert({
    where: { id: 1 },
    update: {
      resolutorConflictoPrecio: data.resolutorConflictoPrecio,
      slaConflictoPrecioDias: data.slaConflictoPrecioDias,
      slaCumplimientoParcialDias: data.slaCumplimientoParcialDias,
      slaPeriodoAConfirmarDias: data.slaPeriodoAConfirmarDias,
      presupuestoContratoActivo: data.presupuestoContratoActivo,
      fechaCorte: new Date(data.fechaCorte),
    },
    create: {
      id: 1,
      resolutorConflictoPrecio: data.resolutorConflictoPrecio,
      slaConflictoPrecioDias: data.slaConflictoPrecioDias,
      slaCumplimientoParcialDias: data.slaCumplimientoParcialDias,
      slaPeriodoAConfirmarDias: data.slaPeriodoAConfirmarDias,
      presupuestoContratoActivo: data.presupuestoContratoActivo,
      fechaCorte: new Date(data.fechaCorte),
    },
  });

  await registrarAuditoria({
    usuarioId: admin.id,
    entidadTipo: "config",
    entidadId: "1",
    accion: "ACTUALIZACION_CONFIG",
    detalle: JSON.stringify(data),
  });

  revalidatePath("/admin/config");
  return { success: "Configuración actualizada." };
}

export async function generarPeriodosAction() {
  const admin = await requireRole("ADMIN");

  const servicios = await prisma.servicio.findMany({ where: { activo: true, periodicidad: { not: "POR_EVENTO" } } });

  let creados = 0;
  for (const servicio of servicios) {
    const periodo = periodoActual(servicio.periodicidad);
    if (!periodo) continue;
    const existente = await prisma.prestacion.findUnique({
      where: { servicioId_periodo: { servicioId: servicio.id, periodo } },
    });
    if (existente) continue;
    await prisma.prestacion.create({ data: { servicioId: servicio.id, periodo } });
    creados++;
  }

  await registrarAuditoria({
    usuarioId: admin.id,
    entidadTipo: "sistema",
    entidadId: "job-periodos",
    accion: "GENERACION_PERIODOS",
    detalle: `${creados} período(s) generado(s)`,
  });

  revalidatePath("/admin/periodos");
  return creados;
}

export async function reabrirPrestacionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const prestacionId = String(formData.get("prestacionId") ?? "");
  const nuevoEstado = String(formData.get("nuevoEstado") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!["PENDIENTE", "CUMPLIDO", "PARCIAL"].includes(nuevoEstado)) {
    return { error: "Elegí un estado válido para la reapertura." };
  }
  if (!motivo) return { error: "El motivo es obligatorio para reabrir un período." };

  const prestacion = await prisma.prestacion.findUnique({ where: { id: prestacionId } });
  if (!prestacion || prestacion.estado !== "NO_CUMPLIDO") {
    return { error: "Este período no está bloqueado por incumplimiento." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.prestacion.update({
      where: { id: prestacionId },
      data: { estado: nuevoEstado as "PENDIENTE" | "CUMPLIDO" | "PARCIAL" },
    });
    await registrarAuditoria(
      {
        usuarioId: admin.id,
        entidadTipo: "prestacion",
        entidadId: prestacionId,
        accion: "REAPERTURA_NO_CUMPLIDO",
        detalle: `Nuevo estado: ${nuevoEstado}. Motivo: ${motivo}`,
      },
      tx
    );
  });

  revalidatePath("/admin/periodos");
  return { success: "Período reabierto." };
}
