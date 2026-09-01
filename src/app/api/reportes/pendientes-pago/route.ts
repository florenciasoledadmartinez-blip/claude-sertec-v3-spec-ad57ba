import { requireRole } from "@/lib/dal";
import { getPendientesDePago } from "@/lib/reportes";
import { toXlsxBuffer, XLSX_CONTENT_TYPE } from "@/lib/xlsx";
import { formatFecha } from "@/lib/format";

export async function GET(request: Request) {
  await requireRole("TESORERIA");
  const { searchParams } = new URL(request.url);
  const proveedor = searchParams.get("proveedor") ?? undefined;

  const { facturas, total, cantidad } = await getPendientesDePago(proveedor);

  const buffer = await toXlsxBuffer(
    "Pendientes de pago",
    [
      { header: "Proveedor", key: "proveedor", width: 28 },
      { header: "Nº factura", key: "numeroFactura", width: 18 },
      { header: "CUIT", key: "cuit", width: 16 },
      { header: "Importe", key: "importe", width: 16, moneda: true },
      { header: "Autorizada por", key: "autorizadoPor", width: 22 },
      { header: "Fecha de autorización", key: "fechaAutorizacion", width: 18 },
    ],
    facturas.map((f) => ({
      proveedor: f.servicio.proveedor,
      numeroFactura: f.numeroFactura,
      cuit: f.servicio.cuit,
      importe: Number(f.importeFacturado),
      autorizadoPor: f.autorizadoPor?.nombre ?? "",
      fechaAutorizacion: formatFecha(f.autorizadoFecha),
    })),
    { resumen: [{ label: "Total", value: total }, { label: "Cantidad de facturas", value: cantidad }] }
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="pendientes-de-pago.xlsx"`,
    },
  });
}
