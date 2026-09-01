"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/actions/servicios";

type Servicio = {
  id: string;
  proveedor: string;
  descripcion: string;
  prestaciones: { id: string; periodo: string; estado: string }[];
};

type Defaults = {
  numeroFactura?: string;
  fechaFactura?: string;
  importeFacturado?: number | string;
  periodoModo?: "periodos" | "a_confirmar";
  periodoIds?: string[];
};

export function FacturaForm({
  servicios,
  action,
  facturaId,
  defaults,
  servicioFijo,
  submitLabel = "Registrar factura",
  submitLabelPendiente = "Registrando...",
}: {
  servicios: Servicio[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  facturaId?: string;
  defaults?: Defaults;
  /** Si se pasa, el servicio queda fijo (modo edicion) y no se puede elegir otro. */
  servicioFijo?: { id: string; proveedor: string; descripcion: string };
  submitLabel?: string;
  submitLabelPendiente?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Si el navegador hizo un submit "nativo" (sin JS todavía hidratado) para resolver la
  // advertencia de período duplicado, este componente se re-monta desde cero en la página
  // nueva. En ese caso, Next.js igual entrega el `state` devuelto por la server action, así
  // que usamos los valores que el usuario ya había cargado (`state.valores`) como punto de
  // partida en vez de perderlos.
  const valoresEco = state?.valores as
    | { numeroFactura?: string; fechaFactura?: string; importeFacturado?: number | string; periodoModo?: "periodos" | "a_confirmar"; periodoIds?: string[] }
    | undefined;
  const valoresIniciales = valoresEco ?? defaults;

  const [servicioId, setServicioId] = useState(servicioFijo?.id ?? servicios[0]?.id ?? "");
  const [modo, setModo] = useState<"periodos" | "a_confirmar">(valoresIniciales?.periodoModo ?? "periodos");
  const [numeroFactura, setNumeroFactura] = useState(valoresIniciales?.numeroFactura ?? "");
  const [fechaFactura, setFechaFactura] = useState(valoresIniciales?.fechaFactura ?? "");
  const [importeFacturado, setImporteFacturado] = useState(String(valoresIniciales?.importeFacturado ?? ""));
  const [periodoIdsElegidos, setPeriodoIdsElegidos] = useState<Set<string>>(
    new Set(valoresIniciales?.periodoIds ?? [])
  );

  const servicio = useMemo(() => servicios.find((s) => s.id === servicioId), [servicios, servicioId]);

  function togglePeriodo(id: string) {
    setPeriodoIdsElegidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {facturaId && <input type="hidden" name="facturaId" value={facturaId} />}
      <input type="hidden" name="confirmarDuplicado" value={state?.warning ? "true" : "false"} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Servicio</label>
        {servicioFijo ? (
          <>
            <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
              {servicioFijo.proveedor} — {servicioFijo.descripcion}
            </div>
            <input type="hidden" name="servicioId" value={servicioFijo.id} />
          </>
        ) : (
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
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Número de factura</label>
          <input
            name="numeroFactura"
            required
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha de factura</label>
          <input
            name="fechaFactura"
            type="date"
            required
            value={fechaFactura}
            onChange={(e) => setFechaFactura(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Importe facturado (ARS)</label>
          <input
            name="importeFacturado"
            type="number"
            step="0.01"
            min="0"
            required
            value={importeFacturado}
            onChange={(e) => setImporteFacturado(e.target.value)}
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
                  <input
                    type="checkbox"
                    name="periodoIds"
                    value={p.id}
                    checked={periodoIdsElegidos.has(p.id)}
                    onChange={() => togglePeriodo(p.id)}
                  />
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
      {state?.warning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{state.warning}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? submitLabelPendiente : state?.warning ? "Registrar de todas formas" : submitLabel}
      </button>
    </form>
  );
}
