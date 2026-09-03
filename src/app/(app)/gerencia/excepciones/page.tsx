import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { calcularImporteEsperado, facturaConDatosInclude } from "@/lib/facturas-query";
import { formatMoneda, formatFecha } from "@/lib/format";
import { AutorizacionExcepcionalForm } from "../gerencia-forms";

export default async function GerenciaExcepcionesPage() {
  await requireRole("GERENCIA");

  const facturas = await prisma.factura.findMany({
    where: { solicitaExcepcionPrecio: true },
    include: facturaConDatosInclude,
    orderBy: { solicitaExcepcionFecha: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Autorizaciones excepcionales</h1>
        <p className="text-slate-500">
          El proveedor no corrigió la factura a tiempo y el Analista pidió habilitarla puntualmente, sin tocar el
          precio de referencia del servicio.
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
                Pedido por {f.solicitaExcepcionPor?.nombre} el {formatFecha(f.solicitaExcepcionFecha)}
              </span>
            </div>
            <p className="mb-2 text-sm text-slate-700">
              Facturado {formatMoneda(f.importeFacturado)} vs esperado {formatMoneda(calcularImporteEsperado(f))}
            </p>
            <p className="mb-3 text-sm text-slate-600">{f.solicitaExcepcionMotivo}</p>
            <AutorizacionExcepcionalForm facturaId={f.id} />
          </div>
        ))}
        {facturas.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-400">
            No hay pedidos de autorización excepcional pendientes.
          </p>
        )}
      </div>
    </div>
  );
}
