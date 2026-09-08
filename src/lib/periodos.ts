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

/**
 * Fecha de inicio de un periodo a partir de su etiqueta (formato de periodoActual), para poder
 * compararla contra la vigencia del servicio. POR_EVENTO no tiene una fecha propia (la etiqueta
 * es texto libre) y siempre devuelve null — no se valida contra vigenteDesde.
 */
export function periodoInicioFecha(periodicidad: Periodicidad, periodo: string): Date | null {
  switch (periodicidad) {
    case "MENSUAL": {
      const m = periodo.match(/^(\d{4})-(\d{2})$/);
      if (!m) return null;
      return new Date(Number(m[1]), Number(m[2]) - 1, 1);
    }
    case "QUINCENAL": {
      const m = periodo.match(/^(\d{4})-(\d{2})-Q([12])$/);
      if (!m) return null;
      const dia = m[3] === "1" ? 1 : 16;
      return new Date(Number(m[1]), Number(m[2]) - 1, dia);
    }
    case "TRIMESTRAL": {
      const m = periodo.match(/^(\d{4})-T([1-4])$/);
      if (!m) return null;
      return new Date(Number(m[1]), (Number(m[2]) - 1) * 3, 1);
    }
    case "ANUAL": {
      const m = periodo.match(/^(\d{4})$/);
      if (!m) return null;
      return new Date(Number(m[1]), 0, 1);
    }
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
