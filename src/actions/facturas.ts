"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { registrarAuditoria } from "@/lib/auditoria";
import { FacturaSchema } from "@/lib/validations";
import { calcularImporteEsperado, facturaConDatosInclude } from "@/lib/facturas-query";
import type { ActionState } from "@/actions/servicios";

/** Periodos elegidos que ya tienen otra factura asociada (alerta, no bloqueo). */
async function buscarPeriodosDuplicados(prestacionIds: string[], excluirFacturaId?: string) {
  if (prestacionIds.length === 0) return [];
  return prisma.facturaPeriodo.findMany({
    where: {
      prestacionId: { in: prestacionIds },
      ...(excluirFacturaId ? { facturaId: { not: excluirFacturaId } } : {}),
    },
    include: { factura: true, prestacion: true },
  });
}

function mensajeDuplicados(duplicados: Awaited<ReturnType<typeof buscarPeriodosDuplicados>>) {
  const detalle = duplicados
    .map((d) => `${d.prestacion.periodo} (factura ${d.factura.numeroFactura})`)
    .join(", ");
  return `Ya hay otra factura registrada para este servicio en: ${detalle}. Si igual querés continuar (por ejemplo, es una factura adicional del mismo período), volvé a apretar el botón.`;
}

async function aplicarAnticipoEnTx(
  tx: Prisma.TransactionClient,
  facturaId: string,
  anticipoId: string | undefined,
  variante: "SALDO_RESTANTE" | "TOTAL_CON_CREDITO" | undefined,
  usuarioId: string
) {
  if (!anticipoId) return;
  const anticipo = await tx.anticipo.findUnique({ where: { id: anticipoId } });
  if (!anticipo || anticipo.aplicado || anticipo.estado !== "PAGADO") return;

  await tx.factura.update({
    where: { id: facturaId },
    data: { anticipoId, varianteAplicacionAnticipo: variante ?? "SALDO_RESTANTE" },
  });
  await tx.anticipo.update({ where: { id: anticipoId }, data: { aplicado: true } });
  await registrarAuditoria(
    {
      usuarioId,
      entidadTipo: "anticipo",
      entidadId: anticipoId,
      accion: "APLICACION_ANTICIPO",
      detalle: `Aplicado a factura ${facturaId} (${variante ?? "SALDO_RESTANTE"})`,
    },
    tx
  );
}

export async function registrarFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ANALISTA_CXP");

  const raw = Object.fromEntries(formData);
  const periodoIds = formData.getAll("periodoIds").map(String).filter(Boolean);

  const parsed = FacturaSchema.safeParse({ ...raw, periodoIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  const servicio = await prisma.servicio.findUnique({ where: { id: data.servicioId } });
  if (!servicio) return { error: "Servicio no encontrado." };
  if (servicio.estado !== "ACTIVO") {
    return { error: "Este servicio no está activo — no admite facturas nuevas." };
  }

  if (data.periodoModo === "periodos" && (!data.periodoIds || data.periodoIds.length === 0)) {
    return { error: "Elegí al menos un período, o marcá la factura como \"a confirmar\"." };
  }

  if (data.periodoIds && data.periodoIds.length > 0) {
    const periodos = await prisma.prestacion.findMany({ where: { id: { in: data.periodoIds } } });
    if (periodos.some((p) => p.servicioId !== data.servicioId)) {
      return { error: "Los períodos elegidos no corresponden a este servicio." };
    }

    const confirmarDuplicado = formData.get("confirmarDuplicado") === "true";
    if (!confirmarDuplicado) {
      const duplicados = await buscarPeriodosDuplicados(data.periodoIds);
      if (duplicados.length > 0) {
        return { warning: mensajeDuplicados(duplicados), valores: data };
      }
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
      await aplicarAnticipoEnTx(tx, f.id, data.anticipoId, data.varianteAplicacionAnticipo, user.id);
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

export async function editarFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ANALISTA_CXP");
  const facturaId = String(formData.get("facturaId") ?? "");

  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura) return { error: "Factura no encontrada." };
  if (factura.autorizado || factura.pagado) {
    return { error: "No se puede editar una factura ya autorizada o pagada." };
  }

  const raw = Object.fromEntries(formData);
  const periodoIds = formData.getAll("periodoIds").map(String).filter(Boolean);

  const parsed = FacturaSchema.omit({ servicioId: true }).safeParse({ ...raw, periodoIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }
  const data = parsed.data;

  if (data.periodoModo === "periodos" && (!data.periodoIds || data.periodoIds.length === 0)) {
    return { error: "Elegí al menos un período, o marcá la factura como \"a confirmar\"." };
  }

  if (data.periodoIds && data.periodoIds.length > 0) {
    const periodos = await prisma.prestacion.findMany({ where: { id: { in: data.periodoIds } } });
    if (periodos.some((p) => p.servicioId !== factura.servicioId)) {
      return { error: "Los períodos elegidos no corresponden a este servicio." };
    }

    const confirmarDuplicado = formData.get("confirmarDuplicado") === "true";
    if (!confirmarDuplicado) {
      const duplicados = await buscarPeriodosDuplicados(data.periodoIds, facturaId);
      if (duplicados.length > 0) {
        return { warning: mensajeDuplicados(duplicados), valores: data };
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.facturaPeriodo.deleteMany({ where: { facturaId } });
      await tx.factura.update({
        where: { id: facturaId },
        data: {
          numeroFactura: data.numeroFactura,
          fechaFactura: new Date(data.fechaFactura),
          importeFacturado: data.importeFacturado,
          periodoAConfirmar: data.periodoModo === "a_confirmar",
          // Se corrigió la carga: vuelve a pasar por control de precio y se limpia cualquier rechazo previo.
          precioEstado: "PENDIENTE_CONFIRMAR",
          precioConfirmadoFecha: null,
          rechazada: false,
          rechazadaMotivo: null,
          rechazadaPorId: null,
          rechazadaFecha: null,
          solicitaExcepcionPrecio: false,
          excepcionPrecioConcedida: false,
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
          entidadId: facturaId,
          accion: "EDICION_FACTURA",
          detalle: `Nº ${data.numeroFactura} — ${data.importeFacturado}`,
        },
        tx
      );
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Ya existe otra factura con ese número para este servicio." };
    }
    throw err;
  }

  revalidatePath(`/facturas/${facturaId}`);
  redirect(`/facturas/${facturaId}`);
}

export async function eliminarFacturaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ANALISTA_CXP");
  const facturaId = String(formData.get("facturaId") ?? "");

  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura) return { error: "Factura no encontrada." };
  if (factura.autorizado || factura.pagado) {
    return { error: "No se puede eliminar una factura ya autorizada o pagada." };
  }

  await prisma.$transaction(async (tx) => {
    if (factura.anticipoId) {
      await tx.anticipo.update({ where: { id: factura.anticipoId }, data: { aplicado: false } });
    }
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "ELIMINACION_FACTURA",
        detalle: `Nº ${factura.numeroFactura} — ${factura.importeFacturado.toString()}`,
      },
      tx
    );
    await tx.factura.delete({ where: { id: facturaId } });
  });

  revalidatePath("/facturas");
  revalidatePath("/facturas/bloqueadas");
  redirect("/facturas");
}

export async function confirmarPrecioAction(facturaId: string) {
  const user = await requireRole("ANALISTA_CXP");

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: facturaConDatosInclude,
  });
  if (!factura) return;
  if (factura.periodoAConfirmar) return;

  const esperado = calcularImporteEsperado(factura);
  const coincide = esperado.equals(factura.importeFacturado);

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        precioEstado: coincide ? "COINCIDE" : "CONFLICTO",
        precioConfirmadoFecha: new Date(),
      },
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

export async function solicitarAutorizacionExcepcionalAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("ANALISTA_CXP");
  const facturaId = String(formData.get("facturaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "Contá por qué necesitás la autorización excepcional." };

  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
  if (!factura) return { error: "Factura no encontrada." };
  if (factura.precioEstado !== "CONFLICTO") {
    return { error: "Esta factura no tiene un conflicto de precio abierto." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        solicitaExcepcionPrecio: true,
        solicitaExcepcionMotivo: motivo,
        solicitaExcepcionPorId: user.id,
        solicitaExcepcionFecha: new Date(),
      },
    });
    await registrarAuditoria(
      {
        usuarioId: user.id,
        entidadTipo: "factura",
        entidadId: facturaId,
        accion: "SOLICITUD_AUTORIZACION_EXCEPCIONAL",
        detalle: motivo,
      },
      tx
    );
  });

  revalidatePath(`/facturas/${facturaId}`);
  revalidatePath("/gerencia/excepciones");
  return { success: "Autorización excepcional pedida a Gerencia." };
}
