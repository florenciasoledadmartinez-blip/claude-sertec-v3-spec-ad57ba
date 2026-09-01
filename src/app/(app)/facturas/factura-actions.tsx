"use client";

import { useActionState, useState } from "react";
import { confirmarPrecioAction, eliminarFacturaAction } from "@/actions/facturas";
import { resolverConflictoPrecioAction, resolverCumplimientoParcialAction } from "@/actions/excepciones";
import { autorizarFacturaAction, rechazarFacturaGerenciaAction } from "@/actions/gerencia";
import { marcarPagadaAction } from "@/actions/tesoreria";

export function ConfirmarPrecioButton({ facturaId }: { facturaId: string }) {
  const action = confirmarPrecioAction.bind(null, facturaId);
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Confirmar comparación de precio
      </button>
    </form>
  );
}

export function ResolverConflictoPrecioForm({ facturaId, precioVigente }: { facturaId: string; precioVigente: number }) {
  const [state, formAction, pending] = useActionState(resolverConflictoPrecioAction, undefined);
  const [opcion, setOpcion] = useState<"actualizar_precio" | "excepcion" | "rechazar">("actualizar_precio");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="facturaId" value={facturaId} />
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="opcion" value="actualizar_precio" checked={opcion === "actualizar_precio"} onChange={() => setOpcion("actualizar_precio")} />
          Actualizar precio vigente del servicio
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="opcion" value="excepcion" checked={opcion === "excepcion"} onChange={() => setOpcion("excepcion")} />
          Aceptar este importe como excepción puntual (no cambia el precio de referencia)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="opcion" value="rechazar" checked={opcion === "rechazar"} onChange={() => setOpcion("rechazar")} />
          Rechazar factura
        </label>
      </div>
      {opcion === "actualizar_precio" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Nuevo precio vigente (actual: {precioVigente})</label>
          <input name="nuevoPrecio" type="number" step="0.01" min="0" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Motivo / fecha (obligatorio)</label>
        <textarea name="motivo" rows={2} required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
        {pending ? "Guardando..." : "Confirmar resolución"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function ResolverParcialForm({ prestacionId }: { prestacionId: string }) {
  const [state, formAction, pending] = useActionState(resolverCumplimientoParcialAction, undefined);
  const [tipo, setTipo] = useState("NOTA_CREDITO");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="prestacionId" value={prestacionId} />
      <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="NOTA_CREDITO">Nota de crédito solicitada</option>
        <option value="PAGO_PARCIAL">Pago parcial autorizado</option>
        <option value="RECHAZADA">Rechazada</option>
      </select>
      {tipo === "PAGO_PARCIAL" && (
        <input name="importeAjustado" type="number" step="0.01" min="0" placeholder="Importe ajustado" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      )}
      <textarea name="detalle" rows={2} required placeholder="Detalle (obligatorio)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <button type="submit" disabled={pending} className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
        {pending ? "Guardando..." : "Resolver cumplimiento parcial"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function AutorizarButton({ facturaId }: { facturaId: string }) {
  const action = autorizarFacturaAction.bind(null, facturaId);
  return (
    <form action={action}>
      <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
        Autorizar pago
      </button>
    </form>
  );
}

export function RechazarGerenciaForm({ facturaId }: { facturaId: string }) {
  const [state, formAction, pending] = useActionState(rechazarFacturaGerenciaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="facturaId" value={facturaId} />
      <textarea name="motivo" rows={2} required placeholder="Motivo del rechazo" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <button type="submit" disabled={pending} className="w-fit rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
        {pending ? "Rechazando..." : "Rechazar factura"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function MarcarPagadaForm({ facturaId }: { facturaId: string }) {
  const [state, formAction, pending] = useActionState(marcarPagadaAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="facturaId" value={facturaId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Nº comprobante</label>
        <input name="comprobanteNumero" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Fecha de pago</label>
        <input name="comprobanteFecha" type="date" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
        {pending ? "Guardando..." : "Marcar como pagada"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function EliminarFacturaButton({ facturaId }: { facturaId: string }) {
  const [state, formAction, pending] = useActionState(eliminarFacturaAction, undefined);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Eliminar factura
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3">
      <input type="hidden" name="facturaId" value={facturaId} />
      <p className="text-sm text-red-700">
        ¿Confirmás que querés eliminar esta factura? No se puede deshacer.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {pending ? "Eliminando..." : "Sí, eliminar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
        >
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
