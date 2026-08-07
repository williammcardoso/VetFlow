/**
 * Marca um documento (patient_documents.content) como "Pedido de Exame" —
 * usado por AddExamRequestPage (grava) e PatientRecordPage (detecta, para
 * usar o PDF dedicado ExamRequestPdfContent em vez do conversor genérico).
 */
export const EXAM_REQUEST_MARKER = "EXAM_REQUEST_DATA";
