"use client";

import { useActionState, useState, useTransition } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import type { RoleName } from "@/generated/prisma/client";
import {
  crearUsuarioAction,
  actualizarRolesUsuarioAction,
  actualizarConfigAction,
  generarPeriodosAction,
  reabrirPrestacionAction,
  reabrirFacturaRechazadaAction,
} from "@/actions/admin";
import { importarDatosAction } from "@/actions/importar";

const ALL_ROLES: RoleName[] = ["RESPONSABLE_OPERATIVO", "ANALISTA_CXP", "COMPRAS", "GERENCIA", "TESORERIA", "ADMIN"];

export function CrearUsuarioForm() {
  const [state, formAction, pending] = useActionState(crearUsuarioAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-medium text-slate-900">Nuevo usuario</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="nombre" placeholder="Nombre" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input name="area" placeholder="Área" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Contraseña" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {ALL_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-1.5">
            <input type="checkbox" name="roles" value={role} />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button type="submit" disabled={pending} className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
        {pending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}

export function EditarUsuarioRow({
  usuario,
}: {
  usuario: { id: string; nombre: string; email: string; activo: boolean; roles: RoleName[] };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => actualizarRolesUsuarioAction(formData))}
      className="grid grid-cols-1 items-center gap-2 border-t border-slate-100 py-3 sm:grid-cols-[1fr_2fr_auto_auto]"
    >
      <input type="hidden" name="usuarioId" value={usuario.id} />
      <div>
        <div className="font-medium text-slate-800">{usuario.nombre}</div>
        <div className="text-xs text-slate-400">{usuario.email}</div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {ALL_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-1">
            <input type="checkbox" name="roles" value={role} defaultChecked={usuario.roles.includes(role)} />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" name="activo" defaultChecked={usuario.activo} />
        Activo
      </label>
      <button type="submit" disabled={isPending} className="w-fit rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50">
        {isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}

export function ConfigForm({
  defaults,
}: {
  defaults: {
    slaConflictoPrecioDias: number;
    slaCumplimientoParcialDias: number;
    slaPeriodoAConfirmarDias: number;
    slaAprobacionDias: number;
    presupuestoContratoActivo: boolean;
    fechaCorte: string;
    umbralAnticipoAutorizacion: number;
  };
}) {
  const [state, formAction, pending] = useActionState(actualizarConfigAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="SLA conflicto de precio (días hábiles)" name="slaConflictoPrecioDias" defaultValue={defaults.slaConflictoPrecioDias} />
        <NumberField label="SLA ajuste de prestación parcial (días hábiles)" name="slaCumplimientoParcialDias" defaultValue={defaults.slaCumplimientoParcialDias} />
        <NumberField label="SLA período a confirmar (días hábiles)" name="slaPeriodoAConfirmarDias" defaultValue={defaults.slaPeriodoAConfirmarDias} />
        <NumberField label="SLA aprobación de Gerencia (días hábiles)" name="slaAprobacionDias" defaultValue={defaults.slaAprobacionDias} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="presupuestoContratoActivo" defaultChecked={defaults.presupuestoContratoActivo} />
        Activar control de presupuesto de contrato (opcional, spec 5.5)
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha de corte del circuito</label>
          <input name="fechaCorte" type="date" defaultValue={defaults.fechaCorte} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Umbral de anticipo que requiere autorización de Gerencia (ARS)
          </label>
          <input
            name="umbralAnticipoAutorizacion"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.umbralAnticipoAutorizacion}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button type="submit" disabled={pending} className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
        {pending ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}

function NumberField({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input name={name} type="number" min={1} defaultValue={defaultValue} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

export function GenerarPeriodosButton() {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => startTransition(async () => setResultado(await generarPeriodosAction()))}
        disabled={isPending}
        className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Generando..." : "Generar períodos pendientes ahora"}
      </button>
      {resultado !== null && (
        <p className="text-sm text-emerald-600">{resultado} período(s) nuevo(s) generado(s).</p>
      )}
    </div>
  );
}

export function ReabrirPrestacionForm({ prestacionId }: { prestacionId: string }) {
  const [state, formAction, pending] = useActionState(reabrirPrestacionAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="prestacionId" value={prestacionId} />
      <select name="nuevoEstado" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs">
        <option value="PENDIENTE">Pendiente</option>
        <option value="CUMPLIDO">Cumplido</option>
        <option value="PARCIAL">Parcial</option>
      </select>
      <input name="motivo" placeholder="Motivo de la reapertura (obligatorio)" required className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
      <button type="submit" disabled={pending} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50">
        {pending ? "Reabriendo..." : "Reabrir período"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export function ImportarForm() {
  const [state, formAction, pending] = useActionState(importarDatosAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Servicios a importar (JSON)</label>
        <textarea
          name="jsonServicios"
          rows={10}
          required
          className="rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
          placeholder={`[\n  {\n    "proveedor": "CleanCo SRL",\n    "cuit": "30-71234567-8",\n    "area": "Operaciones",\n    "descripcion": "Limpieza",\n    "responsableEmail": "marcos.ibarra@sertec.com",\n    "precioVigente": 150000,\n    "periodicidad": "MENSUAL",\n    "vigenteDesde": "2026-04-01"\n  }\n]`}
        />
      </div>
      <p className="text-sm text-red-700">
        Esta acción reemplaza por completo los servicios, facturas y períodos existentes. No se puede deshacer.
        Los usuarios responsables deben existir previamente (por email).
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Escribí <code>REEMPLAZAR</code> para confirmar
        </label>
        <input name="confirmText" required className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button type="submit" disabled={pending} className="w-fit rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
        {pending ? "Importando..." : "Reemplazar datos"}
      </button>
    </form>
  );
}

export function ReabrirFacturaForm({ facturaId }: { facturaId: string }) {
  const [state, formAction, pending] = useActionState(reabrirFacturaRechazadaAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="facturaId" value={facturaId} />
      <input
        name="motivo"
        placeholder="Motivo de la reapertura (obligatorio)"
        required
        className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Reabriendo..." : "Reabrir factura"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}
