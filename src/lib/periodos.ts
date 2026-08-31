import type { Periodicidad } from "@/generated/prisma/client";

/**
 * Etiqueta del periodo "actual" segun la periodicidad del servicio, a la fecha dada.
 * POR_EVENTO no tiene calendario fijo: siempre null, se crea manualmente (spec 4.4).
 */
export function periodoActual(periodicidad: Periodicidad, fecha: Date = new Date()): string | null {
  const y = fecha.getFullYear();
  const m = fecha.getMonth() + 1; // 1-12

  switch (periodicidad) {
    case "MENSUAL":
      return `${y}-${String(m).padStart(2, "0")}`;
    case "QUINCENAL": {
      const quincena = fecha.getDate() <= 15 ? "Q1" : "Q2";
      return `${y}-${String(m).padStart(2, "0")}-${quincena}`;
    }
    case "TRIMESTRAL": {
      const trimestre = Math.ceil(m / 3);
      return `${y}-T${trimestre}`;
    }
    case "ANUAL":
      return `${y}`;
    case "POR_EVENTO":
      return null;
    default:
      return null;
  }
}

export function periodoLabel(periodicidad: Periodicidad): string {
  switch (periodicidad) {
    case "MENSUAL":
      return "Mes";
    case "QUINCENAL":
      return "Quincena";
    case "TRIMESTRAL":
      return "Trimestre";
    case "ANUAL":
      return "Año";
    case "POR_EVENTO":
      return "Evento";
  }
}
