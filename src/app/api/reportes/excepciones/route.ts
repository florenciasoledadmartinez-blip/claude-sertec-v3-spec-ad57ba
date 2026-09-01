import { requireRole } from "@/lib/dal";
import { getReporteExcepciones } from "@/lib/reportes";
import { toXlsxBuffer, XLSX_CONTENT_TYPE } from "@/lib/xlsx";
import { formatFecha } from "@/lib/format";

export async function GET() {
  await requireRole("ANALISTA_CXP", "GERENCIA");
  const filas = await getReporteExcepciones();

  const buffer = await toXlsxBuffer(
    "Excepciones abiertas",
    [
      { header: "Proveedor", key: "proveedor", width: 28 },
      { header: "Nº factura", key: "numeroFactura", width: 18 },
      { header: "Tipo de excepción", key: "tipoExcepcion", width: 30 },
      { header: "Días abierta", key: "diasAbierta", width: 14 },
      { header: "Responsable", key: "responsable", width: 22 },
      { header: "Observación", key: "observacion", width: 40 },
      { header: "Fecha límite SLA", key: "fechaLimite", width: 18 },
    ],
    filas.map((f) => ({
      proveedor: f.proveedor,
      numeroFactura: f.numeroFactura,
      tipoExcepcion: f.tipoExcepcion,
      diasAbierta: f.diasAbierta,
      responsable: f.responsable,
      observacion: f.observacion,
      fechaLimite: f.fechaLimite ? formatFecha(f.fechaLimite) : "",
    }))
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="excepciones-abiertas.xlsx"`,
    },
  });
}
