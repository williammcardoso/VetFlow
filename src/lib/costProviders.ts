/**
 * Destino do repasse (quem recebe o custo do item).
 * Independente da categoria do serviço: um exame cardiológico
 * pode ter categoria "exame_interno" e prestador "Cardiologista".
 */
export const COST_PROVIDER_PRESETS = [
  "Laboratório externo",
  "Cardiologista",
  "Ultrassonografista",
  "Radiologista",
  "Anestesista",
  "Especialista",
  "Fornecedor",
] as const;

export type CostProviderPreset = (typeof COST_PROVIDER_PRESETS)[number];

/** Resolve o nome do prestador para exibição/relatório. */
export function resolveCostProvider(
  provider?: string | null,
  category?: string | null,
  cost?: number | null
): string | undefined {
  const trimmed = provider?.trim();
  if (trimmed) return trimmed;
  if (cost == null || cost <= 0) return undefined;
  if (category === "exame_externo") return "Laboratório externo";
  return "Prestador externo";
}

/** Agrupa valores de repasse por prestador. */
export function groupRepassesByProvider(
  items: Array<{ cost: number; quantity: number; costProvider?: string | null; category?: string | null }>
): Array<{ provider: string; amount: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const line = (item.cost || 0) * (item.quantity || 0);
    if (line <= 0) continue;
    const provider = resolveCostProvider(item.costProvider, item.category, item.cost) || "Prestador externo";
    map.set(provider, (map.get(provider) || 0) + line);
  }
  return Array.from(map.entries())
    .map(([provider, amount]) => ({ provider, amount }))
    .sort((a, b) => b.amount - a.amount);
}
