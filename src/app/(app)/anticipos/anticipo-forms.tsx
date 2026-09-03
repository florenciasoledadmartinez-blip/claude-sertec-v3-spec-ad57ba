"use client";

import { useActionState } from "react";
import { crearAnticipoAction, marcarAnticipoPagadoAction } from "@/actions/anticipos";
import { autorizarAnticipoAction } from "@/actions/gerencia";

export function CrearAnticipoForm() {
  const [state, formAction, pending] = useActionState(crearAnticipoAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Proveedor" name="proveedor" required />
        <Field label="CUIT" name="cuit" required />
        <Field label="Número de proforma" name="numeroProforma" required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Monto (ARS)</label>
          <input
            name="monto"
            type="number"
            step="0.01"
            min="0"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha estimada de entrega (opcional)</label>
          <input name="fechaEstimadaEntrega" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Cargando..." : "Enviar solicitud a Tesorería"}
      </button>
    </form>
  );
}

function Field({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input name={name} required={required} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

export function AutorizarAnticipoButton({ anticipoId }: { anticipoId: string }) {
  return (
    <form action={autorizarAnticipoAction}>
      <input type="hidden" name="anticipoId" value={anticipoId} />
      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Autorizar anticipo
      </button>
    </form>
  );
}

export function MarcarAnticipoPagadoForm({ anticipoId }: { anticipoId: string }) {
  const [state, formAction, pending] = useActionState(marcarAnticipoPagadoAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="anticipoId" value={anticipoId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Marcar como pagado"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
