"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/servicios";

type ResponsableOption = { id: string; nombre: string };

type Defaults = {
  proveedor?: string;
  cuit?: string;
  area?: string;
  descripcion?: string;
  responsableOperativoId?: string;
  precioVigente?: number | string;
  periodicidad?: string;
  actualizacionFrecuencia?: string;
  actualizacionBase?: string;
  vigenteDesde?: string;
  duracionEnPeriodos?: number | string | null;
};

export function ServicioForm({
  action,
  responsables,
  currentUserId,
  defaults,
  mostrarResponsable = true,
  responsableEditable = true,
  servicioId,
  precioBloqueado = false,
  submitLabel = "Guardar",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  responsables: ResponsableOption[];
  currentUserId: string;
  defaults?: Defaults;
  /** Si se muestra el campo "Responsable operativo" (false en edicion: no se puede reasignar). */
  mostrarResponsable?: boolean;
  /** Si el responsable se elige de una lista (admin) o queda fijo en el usuario actual. */
  responsableEditable?: boolean;
  servicioId?: string;
  precioBloqueado?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {servicioId && <input type="hidden" name="servicioId" value={servicioId} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Proveedor" name="proveedor" defaultValue={defaults?.proveedor} required />
        <Field label="CUIT" name="cuit" defaultValue={defaults?.cuit} required />
        <Field label="Área" name="area" defaultValue={defaults?.area} required />
        {mostrarResponsable && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Responsable operativo</label>
            {responsableEditable ? (
              <select
                name="responsableOperativoId"
                defaultValue={defaults?.responsableOperativoId ?? currentUserId}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {responsables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id === currentUserId ? `${r.nombre} (vos)` : r.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  {responsables.find((r) => r.id === currentUserId)?.nombre ?? "Vos"}
                </div>
                <input type="hidden" name="responsableOperativoId" value={currentUserId} />
              </>
            )}
          </div>
        )}
      </div>

      <Field label="Descripción" name="descripcion" defaultValue={defaults?.descripcion} required textarea />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Precio vigente (ARS)</label>
          <input
            name="precioVigente"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.precioVigente}
            disabled={precioBloqueado}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
          {precioBloqueado && (
            <p className="text-xs text-amber-700">
              Bloqueado: hay una excepción de precio abierta para este servicio.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Periodicidad</label>
          <select
            name="periodicidad"
            defaultValue={defaults?.periodicidad ?? "MENSUAL"}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="MENSUAL">Mensual</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="ANUAL">Anual</option>
            <option value="POR_EVENTO">Por evento</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Vigente desde</label>
          <input
            name="vigenteDesde"
            type="date"
            defaultValue={defaults?.vigenteDesde}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Frecuencia de actualización"
          name="actualizacionFrecuencia"
          defaultValue={defaults?.actualizacionFrecuencia}
        />
        <Field label="Base de actualización" name="actualizacionBase" defaultValue={defaults?.actualizacionBase} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Duración en períodos (opcional)</label>
          <input
            name="duracionEnPeriodos"
            type="number"
            min="1"
            defaultValue={defaults?.duracionEnPeriodos ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-400">Para activar el control de presupuesto de contrato.</p>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          rows={2}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          required={required}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
