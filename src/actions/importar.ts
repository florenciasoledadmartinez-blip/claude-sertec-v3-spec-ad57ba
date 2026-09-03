"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { PeriodicidadEnum } from "@/lib/validations";
import type { ActionState } from "@/actions/servicios";

const ImportServicioSchema = z.object({
  proveedor: z.string().min(1),
  cuit: z.string().min(1),
  area: z.string().min(1),
  descripcion: z.string().min(1),
  responsableEmail: z.string().email(),
  precioVigente: z.number().positive(),
  periodicidad: PeriodicidadEnum,
  actualizacionFrecuencia: z.string().optional(),
  actualizacionBase: z.string().optional(),
  vigenteDesde: z.string().min(1),
  duracionEnPeriodos: z.number().int().positive().optional(),
});

const ImportSchema = z.array(ImportServicioSchema);

export async function importarDatosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const confirmText = String(formData.get("confirmText") ?? "");
  if (confirmText !== "REEMPLAZAR") {
    return { error: 'Para confirmar, escribí exactamente "REEMPLAZAR" en el campo de confirmación.' };
  }

  const raw = String(formData.get("jsonServicios") ?? "");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "El JSON de servicios no es válido." };
  }

  const parsed = ImportSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: `JSON inválido: ${parsed.error.issues[0]?.message} (${parsed.error.issues[0]?.path.join(".")})` };
  }

  const emails = [...new Set(parsed.data.map((s) => s.responsableEmail.toLowerCase()))];
  const responsables = await prisma.usuario.findMany({
    where: { email: { in: emails } },
    include: { roles: true },
  });
  const faltantes = emails.filter((e) => !responsables.some((r) => r.email === e));
  if (faltantes.length > 0) {
    return { error: `No existen usuarios responsables con estos emails: ${faltantes.join(", ")}. Creálos primero en Usuarios.` };
  }
  const sinRol = responsables.filter((r) => !r.roles.some((rol) => rol.role === "RESPONSABLE_OPERATIVO"));
  if (sinRol.length > 0) {
    return {
      error: `Estos usuarios no tienen el rol Responsable operativo: ${sinRol.map((u) => u.email).join(", ")}.`,
    };
  }

  const responsablePorEmail = new Map(responsables.map((r) => [r.email, r.id]));

  await prisma.$transaction(async (tx) => {
    await tx.facturaPeriodo.deleteMany({});
    await tx.factura.deleteMany({});
    await tx.prestacion.deleteMany({});
    await tx.solicitudCambioPrecio.deleteMany({});
    await tx.historialPrecio.deleteMany({});
    await tx.servicio.deleteMany({});

    for (const s of parsed.data) {
      // Se importan como servicios reales ya vigentes: quedan ACTIVO directamente, sin pasar
      // por la cola de aprobación (esa cola es para altas nuevas propuestas desde la app).
      await tx.servicio.create({
        data: {
          proveedor: s.proveedor,
          cuit: s.cuit,
          area: s.area,
          descripcion: s.descripcion,
          responsableOperativoId: responsablePorEmail.get(s.responsableEmail.toLowerCase())!,
          precioVigente: s.precioVigente,
          periodicidad: s.periodicidad,
          actualizacionFrecuencia: s.actualizacionFrecuencia || null,
          actualizacionBase: s.actualizacionBase || null,
          vigenteDesde: new Date(s.vigenteDesde),
          duracionEnPeriodos: s.duracionEnPeriodos ?? null,
          estado: "ACTIVO",
          aprobadoPorId: admin.id,
          fechaAprobacion: new Date(),
        },
      });
    }

    await registrarAuditoria(
      {
        usuarioId: admin.id,
        entidadTipo: "sistema",
        entidadId: "importacion",
        accion: "IMPORTACION_MASIVA",
        detalle: `${parsed.data.length} servicio(s) importado(s). Se reemplazaron todos los datos de prueba (servicios, facturas y períodos).`,
      },
      tx
    );
  });

  revalidatePath("/servicios");
  revalidatePath("/admin/importar");
  return { success: `Importación completa: ${parsed.data.length} servicio(s) cargados. Se reemplazó todo lo anterior.` };
}
