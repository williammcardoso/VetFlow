type AnimalForDisplay = { id: string; patientCode?: number | null };

/**
 * Retorna o ID de exibição do paciente em 4 dígitos (ex.: 0001, 0002).
 *
 * Prioriza `patientCode` global (estável no banco) e mantém fallback para
 * comportamento antigo quando necessário.
 */
export function getPatientDisplayId(animalId: string, animals: AnimalForDisplay[]): string {
  const current = animals.find((a) => a.id === animalId);
  const patientCode = current?.patientCode;
  if (typeof patientCode === "number" && Number.isFinite(patientCode) && patientCode > 0) {
    return String(patientCode).padStart(4, "0");
  }

  const sorted = [...animals].sort((a, b) => a.id.localeCompare(b.id));
  const index = sorted.findIndex((a) => a.id === animalId);
  if (index >= 0) return String(index + 1).padStart(4, "0");

  // Último fallback para manter telas funcionais com dados legados.
  return animalId;
}

/**
 * Caminho para o prontuário do paciente. Usa a rota curta /prontuario/:patientCode
 * sempre que o animal já tem um código; cai para a rota antiga (com os dois
 * UUIDs) só quando o código ainda não existe (dado legado).
 */
export function getPatientRecordPath(
  clientId: string,
  animalId: string,
  patientCode?: number | null
): string {
  // Assimétrico de propósito: a rota curta do prontuário em si é
  // /prontuario/:patientCode (SEM sufixo — só as telas "de baixo" dele
  // usam /prontuario/:patientCode/sufixo). Só a rota longa mantém "/record"
  // (nome antigo). Usar getPatientSubPath aqui geraria /prontuario/25/record,
  // que não bate com nenhuma rota registrada (404) — bug real já cometido.
  if (typeof patientCode === "number" && Number.isFinite(patientCode) && patientCode > 0) {
    return `/prontuario/${patientCode}`;
  }
  return `/clients/${clientId}/animals/${animalId}/record`;
}

/**
 * Igual a getPatientRecordPath, mas pra qualquer tela "de baixo" do
 * prontuário (editar/adicionar atendimento, exame, receita, documento,
 * etc.) — `suffix` é o resto do caminho depois do id do paciente, sempre
 * começando com "/" (ex.: "/edit-appointment/app-123", "/add-exam").
 */
export function getPatientSubPath(
  clientId: string,
  animalId: string,
  patientCode: number | null | undefined,
  suffix: string
): string {
  if (typeof patientCode === "number" && Number.isFinite(patientCode) && patientCode > 0) {
    return `/prontuario/${patientCode}${suffix}`;
  }
  return `/clients/${clientId}/animals/${animalId}${suffix}`;
}
