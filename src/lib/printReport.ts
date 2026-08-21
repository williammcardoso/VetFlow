import { formatDateTime } from "@/lib/utils";

export function getPeriodLabel(periodPreset: string, dateFrom: string, dateTo: string): string {
  if (periodPreset === "this_month") return "Este mês";
  if (periodPreset === "last_month") return "Mês passado";
  if (periodPreset === "last_3") return "Últimos 3 meses";
  return `${formatDateTime(dateFrom)} a ${formatDateTime(dateTo)}`;
}

/** Abre um popup com o HTML do relatório e dispara a impressão — mesmo shell usado pelos relatórios de Vendas e Financeiro. */
export function openPrintReport(title: string, bodyHtml: string): void {
  const popup = window.open("", "_blank", "width=1024,height=768");
  if (!popup) return;
  popup.document.write(`
    <html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} h2{margin:22px 0 8px}
    table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px} th{background:#f8fafc;text-align:left}
    .kpi{display:inline-block;margin-right:16px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
    </style></head><body>
    ${bodyHtml}
    </body></html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}
