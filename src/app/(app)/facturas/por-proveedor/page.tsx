import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { anotarEstados, facturaConDatosInclude } from "@/lib/facturas-query";
import { formatMoneda } from "@/lib/format";
import { EstadoBadge } from "../estado-badge";

export default async function PorProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string }>;
}) {
  await requireRole("ANALISTA_CXP");
  const { proveedor } = await searchParams;

  const proveedores = await prisma.servicio.findMany({
    distinct: ["proveedor"],
    select: { proveedor: true },
    orderBy: { proveedor: "asc" },
  });

  const proveedorSeleccionado = proveedor || proveedores[0]?.proveedor;

  const servicios = proveedorSeleccionado
    ? await prisma.servicio.findMany({
        where: { proveedor: proveedorSeleccionado },
        include: { prestaciones: { orderBy: { periodo: "asc" } } },
      })
    : [];

  const facturasCrudo = proveedorSeleccionado
    ? await prisma.factura.findMany({
        where: { servicio: { proveedor: proveedorSeleccionado } },
        include: facturaConDatosInclude,
      })
    : [];
  const facturas = await anotarEstados(facturasCrudo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Vista agrupada por proveedor</h1>
        <p className="text-slate-500">Todos los períodos del año de un proveedor, con su estado.</p>
      </div>

      <form className="flex gap-3">
        <select
          name="proveedor"
          defaultValue={proveedorSeleccionado}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {proveedores.map((p) => (
            <option key={p.proveedor} value={p.proveedor}>
              {p.proveedor}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Ver
        </button>
      </form>

      {servicios.map((s) => (
        <section key={s.id} className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-medium text-slate-900">{s.descripcion}</h2>
            <p className="text-xs text-slate-500">{s.area}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Período</th>
                <th className="px-4 py-2">Prestación</th>
                <th className="px-4 py-2">Factura</th>
                <th className="px-4 py-2">Importe</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {s.prestaciones.map((p) => {
                const factura = facturas.find((f) => f.periodos.some((fp) => fp.prestacionId === p.id));
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{p.periodo}</td>
                    <td className="px-4 py-2 text-slate-600">{p.estado}</td>
                    <td className="px-4 py-2 text-slate-600">{factura?.numeroFactura ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {factura ? formatMoneda(factura.importeFacturado) : "—"}
                    </td>
                    <td className="px-4 py-2">{factura ? <EstadoBadge estado={factura.estado} /> : <span className="text-slate-400">Sin facturar</span>}</td>
                  </tr>
                );
              })}
              {s.prestaciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                    Sin períodos generados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
