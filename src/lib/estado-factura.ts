import type {
  EstadoPrestacion,
  PrecioEstado,
  TipoResolucionParcial,
} from "@/generated/prisma/client";

export type EstadoFacturaCode =
  | "RECHAZADA_PRECIO"
  | "PERIODO_A_CONFIRMAR"
  | "RECHAZADA_NO_PRESTADO"
  | "PENDIENTE_VALIDAR_PRESTACION"
  | "CONFLICTO_PARCIAL"
  | "RECHAZADA_PARCIAL"
  | "PARA_CONFIRMAR_PRECIO"
  | "CONFLICTO_PRECIO"
  | "CONFLICTO_PRESUPUESTO"
  | "RECHAZADA_GERENCIA"
  | "LISTA_PARA_AUTORIZAR"
  | "AUTORIZADA_PENDIENTE_PAGO"
  | "PAGADA";

export const ESTADO_FACTURA_LABEL: Record<EstadoFacturaCode, string> = {
  RECHAZADA_PRECIO: "Rechazada — precio no autorizado",
  PERIODO_A_CONFIRMAR: "Período a confirmar",
  RECHAZADA_NO_PRESTADO: "Rechazada — no se prestó el servicio",
  PENDIENTE_VALIDAR_PRESTACION: "Pendiente de validar prestación",
  CONFLICTO_PARCIAL: "Conflicto — cumplimiento parcial",
  RECHAZADA_PARCIAL: "Rechazada — parcial no aceptado",
  PARA_CONFIRMAR_PRECIO: "Para confirmar precio",
  CONFLICTO_PRECIO: "Conflicto — precio no coincide",
  CONFLICTO_PRESUPUESTO: "Conflicto — excede el presupuesto",
  RECHAZADA_GERENCIA: "Rechazada — gerencia no autoriza",
  LISTA_PARA_AUTORIZAR: "Lista para autorizar",
  AUTORIZADA_PENDIENTE_PAGO: "Autorizada — pendiente de pago",
  PAGADA: "Pagada",
};

/** Estados que representan un bloqueo (todavia no puede avanzar hacia el pago). */
export const ESTADOS_EXCEPCION: EstadoFacturaCode[] = [
  "PERIODO_A_CONFIRMAR",
  "PENDIENTE_VALIDAR_PRESTACION",
  "CONFLICTO_PARCIAL",
  "CONFLICTO_PRECIO",
  "CONFLICTO_PRESUPUESTO",
];

export const ESTADOS_RECHAZADOS: EstadoFacturaCode[] = [
  "RECHAZADA_PRECIO",
  "RECHAZADA_NO_PRESTADO",
  "RECHAZADA_PARCIAL",
  "RECHAZADA_GERENCIA",
];

export interface PeriodoParaEstado {
  estado: EstadoPrestacion;
  resolucionParcialTipo: TipoResolucionParcial | null;
}

export interface FacturaParaEstado {
  periodoAConfirmar: boolean;
  rechazadaPrecio: boolean;
  rechazadaGerencia: boolean;
  precioEstado: PrecioEstado;
  autorizado: boolean;
  pagado: boolean;
  periodos: PeriodoParaEstado[];
}

/**
 * Motor de estados de la factura (spec 4.1). El orden de evaluacion es la regla de negocio:
 * nunca se guarda como campo editable a mano, siempre se deriva de los datos subyacentes.
 */
/** A quien le toca resolver cada tipo de excepcion, dado el resolutor de precio configurado. */
export function responsableExcepcion(
  estado: EstadoFacturaCode,
  resolutorConflictoPrecio: "RESPONSABLE_OPERATIVO" | "COMPRAS"
): string {
  switch (estado) {
    case "PERIODO_A_CONFIRMAR":
    case "PENDIENTE_VALIDAR_PRESTACION":
      return "Responsable operativo";
    case "CONFLICTO_PARCIAL":
      return "Compras";
    case "CONFLICTO_PRECIO":
      return resolutorConflictoPrecio === "COMPRAS" ? "Compras" : "Responsable operativo";
    case "CONFLICTO_PRESUPUESTO":
      return "Responsable operativo / Compras";
    default:
      return "—";
  }
}

export function computeEstadoFactura(
  factura: FacturaParaEstado,
  opts: { presupuestoActivo: boolean; saldoPresupuestoInsuficiente?: boolean } = {
    presupuestoActivo: false,
  }
): EstadoFacturaCode {
  if (factura.rechazadaPrecio) return "RECHAZADA_PRECIO";
  if (factura.periodoAConfirmar) return "PERIODO_A_CONFIRMAR";

  if (factura.periodos.some((p) => p.estado === "NO_CUMPLIDO")) {
    return "RECHAZADA_NO_PRESTADO";
  }
  if (factura.periodos.some((p) => p.estado === "PENDIENTE")) {
    return "PENDIENTE_VALIDAR_PRESTACION";
  }
  if (
    factura.periodos.some((p) => p.estado === "PARCIAL" && !p.resolucionParcialTipo)
  ) {
    return "CONFLICTO_PARCIAL";
  }
  if (
    factura.periodos.some(
      (p) => p.estado === "PARCIAL" && p.resolucionParcialTipo === "RECHAZADA"
    )
  ) {
    return "RECHAZADA_PARCIAL";
  }
  if (factura.precioEstado === "PENDIENTE_CONFIRMAR") return "PARA_CONFIRMAR_PRECIO";
  if (factura.precioEstado === "CONFLICTO") return "CONFLICTO_PRECIO";

  if (opts.presupuestoActivo && opts.saldoPresupuestoInsuficiente) {
    return "CONFLICTO_PRESUPUESTO";
  }

  if (factura.rechazadaGerencia) return "RECHAZADA_GERENCIA";

  if (!factura.autorizado) return "LISTA_PARA_AUTORIZAR";
  if (!factura.pagado) return "AUTORIZADA_PENDIENTE_PAGO";
  return "PAGADA";
}
