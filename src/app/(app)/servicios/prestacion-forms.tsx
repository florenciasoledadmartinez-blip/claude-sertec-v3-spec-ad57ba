"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/servicios";
import {
  certificarPrestacionAction,
  crearPeriodoManualAction,
  asignarPeriodoFacturaAction,
} from "@/actions/servicios";

export function CertificarForm({ prestacionId }: { prestacionId: string }) {
  const [state, formAction, pending] = useActionState(certificarPrestacionAction, undefined);
  const [estado, setEstado] = useState("CUMPLIDO");

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="prestacionId" value={prestacionId} />
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="CUMPLIDO">Cumplido</option>
          <option value="PARCIAL">Parcial</option>
          <option value="NO_CUMPLIDO">No cumplido</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Certificar período"}
        </button>
      </div>
      <textarea
        name="observacion"
        placeholder={estado === "CUMPLIDO" ? "Observación (opcional)" : "Observación (obligatoria)"}
        rows={2}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function PeriodoManualForm({ servicioId }: { servicioId: string }) {
  const [state, formAction, pending] = useActionState(crearPeriodoManualAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Etiqueta del período (ej: 2026-09, evento-lanzamiento)</label>
        <input
          name="periodo"
          required
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="2026-09"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear período manual"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function AsignarPeriodoForm({
  facturaId,
  periodos,
}: {
  facturaId: string;
  periodos: { id: string; periodo: string }[];
}) {
  const [state, formAction, pending] = useActionState(asignarPeriodoFacturaAction, undefined as ActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="facturaId" value={facturaId} />
      <select name="prestacionId" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">Elegí el período...</option>
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.periodo}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Asignando..." : "Asignar período"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}
