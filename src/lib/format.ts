import type { Prisma } from "@/generated/prisma/client";

export function formatMoneda(valor: Prisma.Decimal | number | string) {
  const n = typeof valor === "object" ? Number(valor) : Number(valor);
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function formatFecha(fecha: Date | string | null | undefined) {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatFechaHora(fecha: Date | string | null | undefined) {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diasHabilesDesde(fecha: Date, dias: number) {
  const resultado = new Date(fecha);
  let restantes = dias;
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return resultado;
}

export function diasHabilesTranscurridos(desde: Date, hasta: Date = new Date()) {
  let dias = 0;
  const cursor = new Date(desde);
  while (cursor < hasta) {
    cursor.setDate(cursor.getDate() + 1);
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

/** Dias corridos (no habiles) — usado para el seguimiento de anticipos (spec 4.4: 15 dias corridos). */
export function diasCorridosTranscurridos(desde: Date, hasta: Date = new Date()) {
  const ms = hasta.getTime() - new Date(desde).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
