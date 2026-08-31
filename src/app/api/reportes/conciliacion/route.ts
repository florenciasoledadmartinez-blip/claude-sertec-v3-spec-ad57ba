import { requireRole } from "@/lib/dal";
import { getReporteConciliacion } from "@/lib/reportes";
import { toCsv } from "@/lib/csv";
import { formatFecha } from "@/lib/format";

export async function GET(request: Request) {
  await requireRole("TESORERIA", "ANALISTA_CXP");
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const facturas = await getReporteConciliacion(desde ? new Date(desde) : undefined, hasta ? new Date(hasta) : undefined);

  const csv = toCsv(
    ["Proveedor", "Nº factura", "CUIT", "Importe", "Fecha de autorización", "Fecha de pago", "Nº comprobante"],
    facturas.map((f) => [
      f.servicio.proveedor,
      f.numeroFactura,
      f.servicio.cuit,
      f.importeFacturado.toString(),
      formatFecha(f.autorizadoFecha),
      formatFecha(f.comprobanteFecha),
      f.comprobanteNumero ?? "",
    ])
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conciliacion-pagos.csv"`,
    },
  });
}
