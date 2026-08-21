import * as XLSX from "xlsx";

export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
  /** Índices de coluna (0-based) que são valor em R$ — ganham formato de moeda. */
  currencyColumns?: number[];
}

const MIN_WIDTH = 8;
const MAX_WIDTH = 45;

function computeColumnWidths(headers: string[], rows: (string | number)[][]): { wch: number }[] {
  return headers.map((header, col) => {
    let max = String(header).length;
    for (const row of rows) {
      const cell = row[col];
      const len = cell == null ? 0 : String(cell).length;
      if (len > max) max = len;
    }
    return { wch: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, max + 2)) };
  });
}

/** Gera e baixa um .xlsx de verdade (era um .csv disfarçado de Excel antes) — largura de coluna calculada pelo conteúdo e moeda formatada, pra não abrir truncado no Excel. */
export function exportRowsToXlsx(fileNameBase: string, sheets: XlsxSheet[]): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    ws["!cols"] = computeColumnWidths(sheet.headers, sheet.rows);

    if (sheet.currencyColumns?.length) {
      sheet.rows.forEach((_, rowIdx) => {
        sheet.currencyColumns!.forEach((col) => {
          const ref = XLSX.utils.encode_cell({ r: rowIdx + 1, c: col });
          const cell = ws[ref];
          if (cell && typeof cell.v === "number") cell.z = '"R$" #,##0.00';
        });
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
}
