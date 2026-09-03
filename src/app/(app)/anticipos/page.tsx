import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha, diasCorridosTranscurridos } from "@/lib/format";

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_AUTORIZACION: "Pendiente de autorización",
  AUTORIZADO: "Autorizado",
  PAGADO: "Pagado",
};

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE_AUTORIZACION: "bg-amber-100 text-amber-800",
  AUTORIZADO: "bg-sky-100 text-sky-800",
  PAGADO: "bg-emerald-100 text-emerald-800",
};

export default async function AnticiposPage() {
  await requireRole("COMPRAS", "ANALISTA_CXP", "TESORERIA");

  const anticipos = await prisma.anticipo.findMany({
    include: { solicitadoPor: true, autorizadoPor: true, pagadoPor: true },
    orderBy: { fechaSolicitud: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tracking de anticipos</h1>
          <p className="text-slate-500">
            Categoría C — proveedores que exigen anticipo. Se escala si pasan 15 días corridos pagado sin aplicar.
          </p>
        </div>
        <a
          href="/api/reportes/anticipos"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Proforma</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha de pago</th>
              <th className="px-4 py-3">Días desde el pago</th>
              <th className="px-4 py-3">Aplicado</th>
            </tr>
          </thead>
          <tbody>
            {anticipos.map((a) => {
              const dias = a.fechaPago ? diasCorridosTranscurridos(a.fechaPago) : null;
              const vencido = dias != null && dias > 15 && !a.aplicado;
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.proveedor}</td>
                  <td className="px-4 py-3 text-slate-600">{a.numeroProforma}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMoneda(a.monto)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[a.estado]}`}>
                      {ESTADO_LABEL[a.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatFecha(a.fechaPago)}</td>
                  <td className={`px-4 py-3 ${vencido ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {dias ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.aplicado ? "Sí" : "No"}</td>
                </tr>
              );
            })}
            {anticipos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay anticipos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
