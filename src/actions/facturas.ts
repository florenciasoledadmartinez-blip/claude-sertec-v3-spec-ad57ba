"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { FacturaSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/servicios";

export async function registrarFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ANALISTA_CXP");

  const raw = Object.fromEntries(formData);
  const periodoIds = formData.getAll("periodoIds").map(String).filter(Boolean);

  const parsed = FacturaSchema.safeParse({ ...raw, periodoIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  if (data.periodoModo === "periodos" && (!data.periodoIds || data.periodoIds.length === 0)) {
    return { error: "Elegí al menos un período, o marcá la factura como \"a confirmar\"." };
  }

  if (data.periodoIds && data.periodoIds.length > 0) {
    const periodos = await prisma.prestacion.findMany({ where: { id: { in: data.periodoIds } } });
    if (periodos.some((p) => p.servicioId !== data.servicioId)) {
      return { error: "Los períodos elegidos no corresponden a este servicio." };
    }
  }

  try {
    const factura = await prisma.$transaction(async (tx) => {
      const f = await tx.factura.create({
        data: {
          servicioId: data.servicioId,
          numeroFactura: data.numeroFactura,
          fechaFactura: new Date(data.fechaFactura),
          importeFacturado: data.importeFacturado,
          registradoPorId: user.id,
          periodoAConfirmar: data.periodoModo === "a_confirmar",
          periodos:
            data.periodoModo === "periodos" && data.periodoIds
              ? { create: data.periodoIds.map((prestacionId) => ({ prestacionId })) }
              : undefined,
        },
      });
      await registrarAuditoria(
        {
          usuarioId: user.id,
          entidadTipo: "factura",
          entidadId: f.id,
          accion: "REGISTRO_FACTURA",
          detalle: `Nº ${data.numeroFactura} — ${data.importeFacturado}`,
        },
        tx
      );
      return f;
    });

    redirect(`/facturas/${factura.id}`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya existe una factura registrada con ese número para este servicio." };
    }
    throw err;
  }
}

export async function confirmarPrecioAction(facturaId: string) {
  const user = await requireRole("ANALISTA_CXP");

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: { servicio: true, periodos: true },
  });
  if (!factura) return;
  if (factura.periodoAConfirmar) return;

  const cantidadPeriodos = Math.max(factura.periodos.length, 1);
  const esperado = factura.servicio.precioVigente.mul(cantidadPeriodos);
  const coincide = esperado.equals(factura.importeFacturado);

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: { precioEstado: coincide ? "COINCIDE" : "CONFLICTO" },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "CONFIRMACION_PRECIO",
        detalle: `Esperado ${esperado.toString()} vs facturado ${factura.importeFacturado.toString()} → ${
          coincide ? "COINCIDE" : "CONFLICTO"
        }`,
      },
      tx
    );
  });

  revalidatePath(`/facturas/${facturaId}`);
  revalidatePath("/facturas/bloqueadas");
}
