import { requireRole } from "@/lib/dal";
import { getReporteExcepciones } from "@/lib/reportes";
import { toCsv } from "@/lib/csv";
import { formatFecha } from "@/lib/format";

export async function GET() {
  await requireRole("ANALISTA_CXP", "GERENCIA");
  const filas = await getReporteExcepciones();

  const csv = toCsv(
    ["Proveedor", "Nº factura", "Tipo de excepción", "Días abierta", "Responsable", "Observación", "Fecha límite SLA"],
    filas.map((f) => [
      f.proveedor,
      f.numeroFactura,
      f.tipoExcepcion,
      f.diasAbierta,
      f.responsable,
      f.observacion,
      f.fechaLimite ? formatFecha(f.fechaLimite) : "",
    ])
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="excepciones-abiertas.csv"`,
    },
  });
}
