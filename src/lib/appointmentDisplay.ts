import type { AppointmentEntry } from "@/types/appointment";

/**
 * "Consulta (Modelo Antigo)" existe só pro sistema saber qual formulário usar
 * ao abrir/editar o atendimento (ver LegacyConsultationForm.tsx) — não é um
 * tipo de atendimento de verdade e nunca deve aparecer pro usuário fora da
 * hora de escolher o modelo ao criar a consulta. Em qualquer relatório,
 * lista, contagem ou dropdown, os dois modelos contam como "Consulta".
 */
export function displayAppointmentType(
  type: AppointmentEntry["type"] | string | undefined | null
): string {
  if (!type) return "Outros";
  if (type === "Consulta (Modelo Antigo)") return "Consulta";
  return type;
}
