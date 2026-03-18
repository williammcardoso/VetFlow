/**
 * Retorna um ID de exibição do paciente em 4 dígitos (ex.: 0001, 0002),
 * baseado na posição do animal na lista do cliente (ordem estável por id).
 */
export function getPatientDisplayId(
  animalId: string,
  animals: { id: string }[]
): string {
  const sorted = [...animals].sort((a, b) => a.id.localeCompare(b.id));
  const index = sorted.findIndex((a) => a.id === animalId);
  const oneBased = index >= 0 ? index + 1 : 0;
  return String(oneBased).padStart(4, "0");
}
