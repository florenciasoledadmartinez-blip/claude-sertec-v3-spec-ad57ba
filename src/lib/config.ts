import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { ConfigSistema } from "@/generated/prisma/client";

const DEFAULT_CONFIG: Omit<ConfigSistema, "id" | "updatedAt"> = {
  resolutorConflictoPrecio: "RESPONSABLE_OPERATIVO",
  slaConflictoPrecioDias: 3,
  slaCumplimientoParcialDias: 5,
  slaPeriodoAConfirmarDias: 2,
  presupuestoContratoActivo: false,
  fechaCorte: new Date("2026-04-01T00:00:00.000Z"),
};

export const getConfigSistema = cache(async (): Promise<ConfigSistema> => {
  const config = await prisma.configSistema.findUnique({ where: { id: 1 } });
  if (config) return config;
  return { id: 1, updatedAt: new Date(), ...DEFAULT_CONFIG };
});
