import React from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReportTablePdfProps } from "@/components/ReportTablePdfContent";
import { openPdf, renderPdf } from "@/lib/pdfExport";

/** Botão "PDF" no cabeçalho de um cartão do relatório. */
export function ReportPdfButton({
  build,
  fileName,
  disabled,
}: {
  build: () => ReportTablePdfProps | Promise<ReportTablePdfProps>;
  fileName: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const props = await build();
      const blob = await renderPdf((K) => <K.ReportTablePdfContent {...props} />);
      await openPdf({ blob, fileName: `${fileName}.pdf`, persist: false });
    } catch (err) {
      console.error("[relatorio] PDF", err);
      toast.error("Não consegui gerar o PDF.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1 px-2 text-xs print:hidden"
      onClick={() => void generate()}
      disabled={disabled || busy}
      title="Gerar PDF deste cartão"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileDown className="h-3.5 w-3.5 text-rose-600" aria-hidden />}
      PDF
    </Button>
  );
}
