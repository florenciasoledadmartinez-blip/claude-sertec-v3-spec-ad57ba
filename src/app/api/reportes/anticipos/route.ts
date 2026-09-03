import { requireRole } from "@/lib/dal";
import { getReporteAnticipos } from "@/lib/reportes";
import { toXlsxBuffer, XLSX_CONTENT_TYPE } from "@/lib/xlsx";
import { formatFecha, diasCorridosTranscurridos } from "@/lib/format";

export async function GET() {
  await requireRole("COMPRAS", "ANALISTA_CXP", "TESORERIA");
  const anticipos = await getReporteAnticipos();

  const buffer = await toXlsxBuffer(
    "Anticipos pendientes de aplicar",
    [
      { header: "Proveedor", key: "proveedor", width: 28 },
      { header: "Nº proforma", key: "numeroProforma", width: 18 },
      { header: "Monto", key: "monto", width: 16, moneda: true },
      { header: "Estado", key: "estado", width: 20 },
      { header: "Fecha de pago", key: "fechaPago", width: 16 },
      { header: "Fecha estimada de entrega", key: "fechaEstimadaEntrega", width: 20 },
      { header: "Días transcurridos", key: "diasTranscurridos", width: 18 },
    ],
    anticipos.map((a) => ({
      proveedor: a.proveedor,
      numeroProforma: a.numeroProforma,
      monto: Number(a.monto),
      estado: a.estado,
      fechaPago: formatFecha(a.fechaPago),
      fechaEstimadaEntrega: formatFecha(a.fechaEstimadaEntrega),
      diasTranscurridos: a.fechaPago ? diasCorridosTranscurridos(a.fechaPago) : "",
    }))
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="anticipos-pendientes.xlsx"`,
    },
  });
}
