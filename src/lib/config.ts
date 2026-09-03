import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { Prisma, type ConfigSistema } from "@/generated/prisma/client";

const DEFAULT_CONFIG: Omit<ConfigSistema, "id" | "updatedAt"> = {
  slaConflictoPrecioDias: 3,
  slaCumplimientoParcialDias: 5,
  slaPeriodoAConfirmarDias: 2,
  slaAprobacionDias: 3,
  presupuestoContratoActivo: false,
  fechaCorte: new Date("2026-04-01T00:00:00.000Z"),
  umbralAnticipoAutorizacion: new Prisma.Decimal(500000),
};

export const getConfigSistema = cache(async (): Promise<ConfigSistema> => {
  const config = await prisma.configSistema.findUnique({ where: { id: 1 } });
  if (config) return config;
  return { id: 1, updatedAt: new Date(), ...DEFAULT_CONFIG };
});
