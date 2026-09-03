import { ESTADO_FACTURA_LABEL, ESTADOS_EXCEPCION, ESTADOS_RECHAZADOS, type EstadoFacturaCode } from "@/lib/estado-factura";

const COLOR: Record<EstadoFacturaCode, string> = {
  RECHAZADA: "bg-red-100 text-red-800",
  PERIODO_A_CONFIRMAR: "bg-amber-100 text-amber-800",
  BLOQUEADA_NO_PRESTADO: "bg-red-100 text-red-800",
  PENDIENTE_VALIDAR_PRESTACION: "bg-slate-100 text-slate-700",
  PENDIENTE_AJUSTE_PROVEEDOR: "bg-amber-100 text-amber-800",
  PARA_CONFIRMAR_PRECIO: "bg-sky-100 text-sky-800",
  CONFLICTO_PRECIO: "bg-amber-100 text-amber-800",
  CONFLICTO_PRESUPUESTO: "bg-amber-100 text-amber-800",
  LISTA_PARA_AUTORIZAR: "bg-indigo-100 text-indigo-800",
  AUTORIZADA_PENDIENTE_PAGO: "bg-blue-100 text-blue-800",
  PAGADA: "bg-emerald-100 text-emerald-800",
};

export function EstadoBadge({ estado }: { estado: EstadoFacturaCode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLOR[estado]}`}>
      {ESTADO_FACTURA_LABEL[estado]}
    </span>
  );
}

export function esExcepcion(estado: EstadoFacturaCode) {
  return ESTADOS_EXCEPCION.includes(estado);
}

export function esRechazada(estado: EstadoFacturaCode) {
  return ESTADOS_RECHAZADOS.includes(estado);
}
