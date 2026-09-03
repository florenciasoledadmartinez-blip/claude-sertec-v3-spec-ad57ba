"use client";

import { useActionState } from "react";
import {
  aprobarServicioAction,
  rechazarServicioAction,
  aprobarSolicitudPrecioAction,
  rechazarSolicitudPrecioAction,
  concederAutorizacionExcepcionalAction,
  denegarAutorizacionExcepcionalAction,
} from "@/actions/gerencia";

export function AprobarServicioForm({ servicioId }: { servicioId: string }) {
  const [state, formAction, pending] = useActionState(rechazarServicioAction, undefined);
  return (
    <div className="flex flex-col gap-2">
      <form action={aprobarServicioAction}>
        <input type="hidden" name="servicioId" value={servicioId} />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Aprobar servicio
        </button>
      </form>
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="servicioId" value={servicioId} />
        <textarea
          name="motivo"
          rows={1}
          placeholder="Motivo del rechazo"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Rechazando..." : "Rechazar"}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}

export function AprobarSolicitudPrecioForm({ solicitudId }: { solicitudId: string }) {
  const [state, formAction, pending] = useActionState(rechazarSolicitudPrecioAction, undefined);
  return (
    <div className="flex flex-col gap-2">
      <form action={aprobarSolicitudPrecioAction}>
        <input type="hidden" name="solicitudId" value={solicitudId} />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Aprobar cambio de precio
        </button>
      </form>
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="solicitudId" value={solicitudId} />
        <textarea
          name="motivo"
          rows={1}
          placeholder="Motivo del rechazo"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Rechazando..." : "Rechazar"}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}

export function AutorizacionExcepcionalForm({ facturaId }: { facturaId: string }) {
  const [state, formAction, pending] = useActionState(denegarAutorizacionExcepcionalAction, undefined);
  return (
    <div className="flex flex-col gap-2">
      <form action={concederAutorizacionExcepcionalAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="facturaId" value={facturaId} />
        <textarea
          name="motivo"
          rows={1}
          placeholder="Motivo (opcional)"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Conceder
        </button>
      </form>
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="facturaId" value={facturaId} />
        <textarea
          name="motivo"
          rows={1}
          required
          placeholder="Motivo de la denegación"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Denegando..." : "Denegar"}
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
