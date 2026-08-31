"use client";

import { useActionState, useMemo, useState } from "react";
import { registrarFacturaAction } from "@/actions/facturas";

type Servicio = {
  id: string;
  proveedor: string;
  descripcion: string;
  prestaciones: { id: string; periodo: string; estado: string }[];
};

export function FacturaForm({ servicios }: { servicios: Servicio[] }) {
  const [state, formAction, pending] = useActionState(registrarFacturaAction, undefined);
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [modo, setModo] = useState<"periodos" | "a_confirmar">("periodos");

  const servicio = useMemo(() => servicios.find((s) => s.id === servicioId), [servicios, servicioId]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Servicio</label>
        <select
          name="servicioId"
          value={servicioId}
          onChange={(e) => setServicioId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.proveedor} — {s.descripcion}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Número de factura</label>
          <input name="numeroFactura" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha de factura</label>
          <input name="fechaFactura" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Importe facturado (ARS)</label>
          <input
            name="importeFacturado"
            type="number"
            step="0.01"
            min="0"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="periodoModo"
              value="periodos"
              checked={modo === "periodos"}
              onChange={() => setModo("periodos")}
            />
            Elegir período(s)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="periodoModo"
              value="a_confirmar"
              checked={modo === "a_confirmar"}
              onChange={() => setModo("a_confirmar")}
            />
            Período a confirmar (no está claro)
          </label>
        </div>

        {modo === "periodos" && (
          <div className="flex flex-col gap-1">
            {servicio && servicio.prestaciones.length > 0 ? (
              servicio.prestaciones.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="periodoIds" value={p.id} />
                  {p.periodo}{" "}
                  <span className="text-xs text-slate-400">({p.estado.toLowerCase()})</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-slate-400">Este servicio todavía no tiene períodos generados.</p>
            )}
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Registrando..." : "Registrar factura"}
      </button>
    </form>
  );
}
