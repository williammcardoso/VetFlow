import type { AppointmentEntry, ConsultationDetails } from "@/types/appointment";

export interface AnimalInfo {
  name?: string;
  species?: string;
}

/**
 * Monta um texto de contexto a partir do atendimento para enviar ao assistente de IA.
 */
export function buildContextFromAppointment(
  appointment: Pick<
    AppointmentEntry,
    "type" | "pesoAtual" | "temperaturaCorporal" | "frequenciaCardiaca" | "frequenciaRespiratoria" | "details"
  >,
  animalInfo?: AnimalInfo
): string {
  const parts: string[] = [];

  if (animalInfo?.name || animalInfo?.species) {
    parts.push("## Paciente");
    if (animalInfo.name) parts.push(`- Nome: ${animalInfo.name}`);
    if (animalInfo.species) parts.push(`- Espécie: ${animalInfo.species}`);
    parts.push("");
  }

  parts.push("## Tipo de atendimento");
  parts.push(appointment.type || "Não informado");
  parts.push("");

  if (
    appointment.pesoAtual != null ||
    appointment.temperaturaCorporal != null ||
    appointment.frequenciaCardiaca != null ||
    appointment.frequenciaRespiratoria != null
  ) {
    parts.push("## Sinais vitais / medidas");
    if (appointment.pesoAtual != null) parts.push(`- Peso: ${appointment.pesoAtual} kg`);
    if (appointment.temperaturaCorporal != null)
      parts.push(`- Temperatura: ${appointment.temperaturaCorporal} °C`);
    if (appointment.frequenciaCardiaca != null)
      parts.push(`- FC: ${appointment.frequenciaCardiaca} bpm`);
    if (appointment.frequenciaRespiratoria != null)
      parts.push(`- FR: ${appointment.frequenciaRespiratoria} ipm`);
    parts.push("");
  }

  const details = appointment.details as Record<string, unknown> | undefined;
  if (!details || Object.keys(details).length === 0) {
    parts.push("## Anamnese e exame");
    parts.push("(Nenhum dado preenchido ainda.)");
    return parts.join("\n");
  }

  const c = details as ConsultationDetails;

  parts.push("## Queixa principal");
  parts.push(c.queixaPrincipal?.trim() || "(Não informada)");
  parts.push("");

  const anamneseLines: string[] = [];
  if (c.historicoClinico?.trim()) anamneseLines.push(`Histórico clínico: ${c.historicoClinico}`);
  if (c.alimentacao?.trim()) anamneseLines.push(`Alimentação: ${c.alimentacao}`);
  if (c.vacinacaoEmDia) anamneseLines.push(`Vacinação em dia: ${c.vacinacaoEmDia}${c.vacinacaoEmDiaObs ? ` (${c.vacinacaoEmDiaObs})` : ""}`);
  if (c.usoMedicacoes?.trim()) anamneseLines.push(`Uso de medicações: ${c.usoMedicacoes}`);
  if (c.ambiente) anamneseLines.push(`Ambiente: ${c.ambiente}`);
  if (c.contatoOutrosAnimais) anamneseLines.push(`Contato com outros animais: ${c.contatoOutrosAnimais}`);

  if (anamneseLines.length > 0) {
    parts.push("## Anamnese");
    parts.push(anamneseLines.join("\n"));
    parts.push("");
  }

  const exameLines: string[] = [];
  if (c.estadoGeral) exameLines.push(`Estado geral: ${c.estadoGeral}`);
  if (c.mucosasResumo) exameLines.push(`Mucosas: ${c.mucosasResumo}`);
  if (c.hidratacao) exameLines.push(`Hidratação: ${c.hidratacao}`);
  if (c.dor) exameLines.push(`Dor: ${c.dor}${c.dorEscala != null ? ` (escala ${c.dorEscala})` : ""}`);
  if (c.sec_digestorio_status) exameLines.push(`Digestório: ${c.sec_digestorio_status}${c.sec_digestorio_obs ? ` – ${c.sec_digestorio_obs}` : ""}`);
  if (c.sec_respiratorio_status) exameLines.push(`Respiratório: ${c.sec_respiratorio_status}${c.sec_respiratorio_obs ? ` – ${c.sec_respiratorio_obs}` : ""}`);
  if (c.sec_cabeca_pescoco_status) exameLines.push(`Cabeça e pescoço: ${c.sec_cabeca_pescoco_status}${c.sec_cabeca_pescoco_obs ? ` – ${c.sec_cabeca_pescoco_obs}` : ""}`);
  if (c.sec_torax_abdomen_status) exameLines.push(`Tórax e abdômen: ${c.sec_torax_abdomen_status}${c.sec_torax_abdomen_obs ? ` – ${c.sec_torax_abdomen_obs}` : ""}`);
  if (c.sec_linfonodos_pele_status) exameLines.push(`Linfonodos e pele: ${c.sec_linfonodos_pele_status}${c.sec_linfonodos_pele_obs ? ` – ${c.sec_linfonodos_pele_obs}` : ""}`);
  if (c.observacoesComplementares?.trim()) exameLines.push(`Observações: ${c.observacoesComplementares}`);
  if (c.auscultaCardiaca?.trim()) exameLines.push(`Ausculta cardíaca: ${c.auscultaCardiaca}`);
  if (c.auscultaPulmonar?.trim()) exameLines.push(`Ausculta pulmonar: ${c.auscultaPulmonar}`);
  if (c.abdomen?.trim()) exameLines.push(`Abdômen: ${c.abdomen}`);
  if (c.peleAnexos?.trim()) exameLines.push(`Pele e anexos: ${c.peleAnexos}`);
  if (c.linfonodos?.trim()) exameLines.push(`Linfonodos: ${c.linfonodos}`);
  if (c.mucosas?.trim()) exameLines.push(`Mucosas (obs): ${c.mucosas}`);
  if (c.outrosAchadosClinicos?.trim()) exameLines.push(`Outros achados: ${c.outrosAchadosClinicos}`);

  if (exameLines.length > 0) {
    parts.push("## Exame físico / avaliação clínica");
    parts.push(exameLines.join("\n"));
    parts.push("");
  }

  if (c.suspeitaDiagnostica?.trim() || c.diagnosticoPresuntivo?.trim() || c.diagnosticoDiferencial?.trim()) {
    parts.push("## Diagnóstico (já registrado)");
    if (c.suspeitaDiagnostica?.trim()) parts.push(`- Suspeita: ${c.suspeitaDiagnostica}`);
    if (c.diagnosticoPresuntivo?.trim()) parts.push(`- Presuntivo: ${c.diagnosticoPresuntivo}`);
    if (c.diagnosticoDiferencial?.trim()) parts.push(`- Diferencial: ${c.diagnosticoDiferencial}`);
    parts.push("");
  }

  if (c.examesSolicitados?.trim()) {
    parts.push("## Exames já solicitados");
    parts.push(c.examesSolicitados);
    parts.push("");
  }

  return parts.join("\n").trim();
}

// Proxy serverless em api/ai-suggestions.ts — a chamada à OpenAI acontece no
// servidor (Vercel), não no navegador. Evita expor a chave da API no bundle
// público (antes ia em VITE_OPENAI_API_KEY, visível pra qualquer um no
// DevTools) e evita o "Failed to fetch" de chamar api.openai.com direto do
// navegador (CORS/extensões). Requer OPENAI_API_KEY (sem prefixo VITE_) nas
// variáveis de ambiente do projeto no Vercel.
const AI_SUGGESTIONS_ENDPOINT = "/api/ai-suggestions";

export interface FetchSuggestionsResult {
  ok: true;
  text: string;
}

export interface FetchSuggestionsError {
  ok: false;
  error: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Pede sugestões de IA, via proxy serverless — `messages` é o histórico
 * completo da conversa (contexto inicial + perguntas de acompanhamento já
 * feitas, se houver), permitindo continuar perguntando sobre a mesma
 * sugestão em vez de cada geração ser isolada.
 */
export async function fetchConsultationSuggestions(
  messages: ChatMessage[]
): Promise<FetchSuggestionsResult | FetchSuggestionsError> {
  try {
    const res = await fetch(AI_SUGGESTIONS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = (await res.json().catch(() => null)) as
      | { ok: true; text: string }
      | { ok: false; error: string }
      | null;

    if (!data) {
      return { ok: false, error: `Erro na API: ${res.status}` };
    }
    return data;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Falha na requisição: ${message}`,
    };
  }
}

/** Aliases para compatibilidade com o AppointmentForm. */
export const buildConsultationContext = buildContextFromAppointment;
export const fetchAISuggestions = fetchConsultationSuggestions;
