import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function registrarAuditoria(
  params: {
    usuarioId: string | null;
    entidadTipo: string;
    entidadId: string;
    accion: string;
    detalle?: string;
  },
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  await tx.auditoria.create({
    data: {
      usuarioId: params.usuarioId,
      entidadTipo: params.entidadTipo,
      entidadId: params.entidadId,
      accion: params.accion,
      detalle: params.detalle,
    },
  });
}
