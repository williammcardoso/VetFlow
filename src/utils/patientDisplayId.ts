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
