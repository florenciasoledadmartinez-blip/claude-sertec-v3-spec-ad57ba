import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatMoneda, formatFecha } from "@/lib/format";
import { ReabrirFacturaForm } from "../admin-forms";

export default async function AdminRechazadasPage() {
  await requireRole("ADMIN");

  const facturas = await prisma.factura.findMany({
    where: { OR: [{ rechazadaGerencia: true }, { rechazadaPrecio: true }] },
    include: { servicio: true, rechazadaPrecioPor: true, rechazadaGerenciaPor: true },
    orderBy: { fechaRegistro: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Facturas rechazadas</h1>
        <p className="text-slate-500">
          Dejar una factura &quot;lista para autorizar&quot; sin tocarla equivale a posponerla — no hace falta
          rechazarla para eso. Rechazar es una decisión terminal; reabrirla acá requiere motivo y queda auditado.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {facturas.map((f) => (
          <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/facturas/${f.id}`} className="font-medium text-slate-900 hover:underline">
                  {f.numeroFactura}
                </Link>{" "}
                <span className="text-slate-500">— {f.servicio.proveedor}</span>
              </div>
              <span className="text-xs text-slate-400">
                {formatFecha(f.fechaRegistro)} · {formatMoneda(f.importeFacturado)}
              </span>
            </div>

            {f.rechazadaPrecio && (
              <div className="mb-3 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">
                  Rechazada por precio: {f.rechazadaPrecioMotivo} — {f.rechazadaPrecioPor?.nombre} (
                  {formatFecha(f.rechazadaPrecioFecha)})
                </p>
                <div className="mt-2">
                  <ReabrirFacturaForm facturaId={f.id} tipo="precio" />
                </div>
              </div>
            )}

            {f.rechazadaGerencia && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">
                  Rechazada por Gerencia: {f.rechazadaGerenciaMotivo} — {f.rechazadaGerenciaPor?.nombre} (
                  {formatFecha(f.rechazadaGerenciaFecha)})
                </p>
                <div className="mt-2">
                  <ReabrirFacturaForm facturaId={f.id} tipo="gerencia" />
                </div>
              </div>
            )}
          </div>
        ))}
        {facturas.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay facturas rechazadas.
          </p>
        )}
      </div>
    </div>
  );
}
