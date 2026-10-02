// Todos os modelos de PDF num lugar só, carregado SOB DEMANDA por
// `renderPdf` (lib/pdfExport.ts) — só na hora de imprimir/baixar/enviar.
// Importar um modelo direto numa tela puxa junto a biblioteca de PDF
// (~1,3 MB) toda vez que a tela abre, mesmo sem ninguém imprimir nada.
export { default as AppointmentPdfContent } from "@/components/AppointmentPdfContent";
export { default as BudgetReportPdfContent } from "@/components/BudgetReportPdfContent";
export { default as DocumentPdfContent } from "@/components/DocumentPdfContent";
export { default as DocumentTemplatePdfContent } from "@/components/DocumentTemplatePdfContent";
export { ExamReportPdfContent } from "@/components/ExamReportPdfContent";
export { default as ExamReportPdfContentBioquimicoOnePage } from "@/components/ExamReportPdfContent_Bioquimico_OnePage";
export { default as ExamReportPdfContentCitologiaOnePage } from "@/components/ExamReportPdfContent_Citologia_OnePage";
export { default as ExamReportPdfContentHemogramaOnePage } from "@/components/ExamReportPdfContent_Hemograma_OnePage";
export { default as ExamReportPdfContentTesteRapidoOnePage } from "@/components/ExamReportPdfContent_TesteRapido_OnePage";
export { default as ExamRequestPdfContent } from "@/components/ExamRequestPdfContent";
export { default as FinancialOverviewPdfContent } from "@/components/FinancialOverviewPdfContent";
export { default as FinancialReportPdfContent } from "@/components/FinancialReportPdfContent";
export { default as MonthlyClosingPdfContent } from "@/components/MonthlyClosingPdfContent";
export { PrescriptionPdfContent } from "@/components/PrescriptionPdfContent";
export { default as PriceListPdfContent } from "@/components/PriceListPdfContent";
export { default as PurchaseReceiptPdfContent } from "@/components/PurchaseReceiptPdfContent";
export { default as SaleCancellationPdfContent } from "@/components/SaleCancellationPdfContent";
export { default as SaleReceiptPdfContent } from "@/components/SaleReceiptPdfContent";
export { ExamEvolutionPdfContent } from "@/components/ExamEvolutionPdfContent";
export { ExamReportPdfContentOutrosOnePage } from "@/components/ExamReportPdfContent_Outros_OnePage";
export { ProviderPayoutPdfContent } from "@/components/ProviderPayoutPdfContent";
