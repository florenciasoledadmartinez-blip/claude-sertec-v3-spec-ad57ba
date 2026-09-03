"use client";

import { useActionState } from "react";
import { crearSolicitudCambioPrecioAction } from "@/actions/servicios";

export function SolicitudPrecioForm({ servicioId, precioActual }: { servicioId: string; precioActual: number }) {
  const [state, formAction, pending] = useActionState(crearSolicitudCambioPrecioAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-6">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Precio actual</label>
        <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
          {precioActual}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Precio propuesto</label>
        <input
          name="precioPropuesto"
          type="number"
          step="0.01"
          min="0"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Observaciones</label>
        <textarea
          name="observaciones"
          rows={3}
          required
          placeholder="Por qué corresponde el cambio (condición del contrato, aumento acordado, etc.)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Elevando..." : "Elevar solicitud a Gerencia"}
      </button>
    </form>
  );
}
