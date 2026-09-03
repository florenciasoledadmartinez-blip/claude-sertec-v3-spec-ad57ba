import type { EstadoPrestacion, PrecioEstado } from "@/generated/prisma/client";

export type EstadoFacturaCode =
  | "RECHAZADA"
  | "PERIODO_A_CONFIRMAR"
  | "BLOQUEADA_NO_PRESTADO"
  | "PENDIENTE_VALIDAR_PRESTACION"
  | "PENDIENTE_AJUSTE_PROVEEDOR"
  | "PARA_CONFIRMAR_PRECIO"
  | "CONFLICTO_PRECIO"
  | "CONFLICTO_PRESUPUESTO"
  | "LISTA_PARA_AUTORIZAR"
  | "AUTORIZADA_PENDIENTE_PAGO"
  | "PAGADA";

export const ESTADO_FACTURA_LABEL: Record<EstadoFacturaCode, string> = {
  RECHAZADA: "Rechazada",
  PERIODO_A_CONFIRMAR: "Período a confirmar",
  BLOQUEADA_NO_PRESTADO: "Bloqueada — no se prestó el servicio",
  PENDIENTE_VALIDAR_PRESTACION: "Pendiente de validar prestación",
  PENDIENTE_AJUSTE_PROVEEDOR: "Pendiente de ajuste del proveedor",
  PARA_CONFIRMAR_PRECIO: "Para confirmar precio",
  CONFLICTO_PRECIO: "Conflicto — precio no coincide",
  CONFLICTO_PRESUPUESTO: "Conflicto — excede el presupuesto",
  LISTA_PARA_AUTORIZAR: "Lista para autorizar",
  AUTORIZADA_PENDIENTE_PAGO: "Autorizada — pendiente de pago",
  PAGADA: "Pagada",
};

/** Estados que representan un bloqueo (todavia no puede avanzar hacia el pago). */
export const ESTADOS_EXCEPCION: EstadoFacturaCode[] = [
  "PERIODO_A_CONFIRMAR",
  "PENDIENTE_VALIDAR_PRESTACION",
  "PENDIENTE_AJUSTE_PROVEEDOR",
  "CONFLICTO_PRECIO",
  "CONFLICTO_PRESUPUESTO",
];

export const ESTADOS_RECHAZADOS: EstadoFacturaCode[] = ["RECHAZADA", "BLOQUEADA_NO_PRESTADO"];

/** A quien le toca resolver cada tipo de excepcion (Compras no interviene en la categoria B). */
export function responsableExcepcion(estado: EstadoFacturaCode): string {
  switch (estado) {
    case "PERIODO_A_CONFIRMAR":
      return "Responsable operativo";
    case "PENDIENTE_VALIDAR_PRESTACION":
      return "Responsable operativo";
    case "PENDIENTE_AJUSTE_PROVEEDOR":
      return "Responsable operativo";
    case "CONFLICTO_PRECIO":
      return "Analista (corrección) / Gerencia (excepcional)";
    case "CONFLICTO_PRESUPUESTO":
      return "Responsable operativo";
    default:
      return "—";
  }
}

export interface PeriodoParaEstado {
  estado: EstadoPrestacion;
  importeEsperadoAjustado: unknown | null;
}

export interface FacturaParaEstado {
  periodoAConfirmar: boolean;
  rechazada: boolean;
  precioEstado: PrecioEstado;
  excepcionPrecioConcedida: boolean;
  autorizado: boolean;
  pagado: boolean;
  periodos: PeriodoParaEstado[];
}

/**
 * Motor de estados de la factura (spec v3, seccion 4.1). El orden de evaluacion es la regla de
 * negocio: nunca se guarda como campo editable a mano, siempre se deriva de los datos subyacentes.
 * Nota: el registro de una factura contra un servicio que no esta ACTIVO se bloquea antes de
 * llegar a este motor (guard en la accion de registro), no es un estado de la factura en si.
 */
export function computeEstadoFactura(
  factura: FacturaParaEstado,
  opts: { presupuestoActivo: boolean; saldoPresupuestoInsuficiente?: boolean } = {
    presupuestoActivo: false,
  }
): EstadoFacturaCode {
  if (factura.rechazada) return "RECHAZADA";
  if (factura.periodoAConfirmar) return "PERIODO_A_CONFIRMAR";

  if (factura.periodos.some((p) => p.estado === "NO_CUMPLIDO")) {
    return "BLOQUEADA_NO_PRESTADO";
  }
  if (factura.periodos.some((p) => p.estado === "PENDIENTE")) {
    return "PENDIENTE_VALIDAR_PRESTACION";
  }
  if (
    factura.periodos.some((p) => p.estado === "PARCIAL" && p.importeEsperadoAjustado == null)
  ) {
    return "PENDIENTE_AJUSTE_PROVEEDOR";
  }

  if (factura.precioEstado === "PENDIENTE_CONFIRMAR") return "PARA_CONFIRMAR_PRECIO";
  if (factura.precioEstado === "CONFLICTO" && !factura.excepcionPrecioConcedida) {
    return "CONFLICTO_PRECIO";
  }

  if (opts.presupuestoActivo && opts.saldoPresupuestoInsuficiente) {
    return "CONFLICTO_PRESUPUESTO";
  }

  if (!factura.autorizado) return "LISTA_PARA_AUTORIZAR";
  if (!factura.pagado) return "AUTORIZADA_PENDIENTE_PAGO";
  return "PAGADA";
}
