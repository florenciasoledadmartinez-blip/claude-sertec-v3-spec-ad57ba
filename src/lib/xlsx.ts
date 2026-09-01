import "server-only";
import ExcelJS from "exceljs";

export type ColumnaXlsx = {
  header: string;
  key: string;
  width?: number;
  moneda?: boolean;
};

export async function toXlsxBuffer(
  hojaNombre: string,
  columnas: ColumnaXlsx[],
  filas: Record<string, string | number | Date | null | undefined>[],
  opts: { resumen?: { label: string; value: string | number }[] } = {}
): Promise<Uint8Array<ArrayBuffer>> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SERTEC";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(hojaNombre);
  sheet.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

  for (const fila of filas) {
    const row = sheet.addRow(fila);
    columnas.forEach((c, idx) => {
      if (c.moneda) {
        row.getCell(idx + 1).numFmt = '"$"#,##0.00';
      }
    });
  }

  if (opts.resumen && opts.resumen.length > 0) {
    sheet.addRow({});
    for (const r of opts.resumen) {
      const row = sheet.addRow({ [columnas[0].key]: r.label, [columnas[1]?.key ?? columnas[0].key]: r.value });
      row.font = { bold: true };
    }
  }

  const raw = await workbook.xlsx.writeBuffer();
  // Copiamos a un ArrayBuffer nuevo y no compartido para que el tipo sea compatible con BlobPart/BodyInit.
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(new Uint8Array(raw));
  return bytes;
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
