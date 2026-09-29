// Rótulos das categorias do catálogo (valor gravado → texto). Há valores
// fora do tipo CatalogCategory já gravados no banco (ex.: "medicamento",
// "Insumos"), então aceita qualquer texto e usa um rótulo legível.
const LABELS: Record<string, string> = {
  cirurgia: "Cirurgia",
  exame_externo: "Exame externo",
  exame_interno: "Exame interno",
  especialista: "Especialista",
  vacina: "Vacina",
  servico: "Serviço",
  produto: "Produto",
  medicamento: "Medicamento",
  racao: "Ração",
  acessorio: "Acessório",
  insumos: "Insumos",
};

export function catalogCategoryLabel(category?: string | null): string {
  if (!category) return "Sem categoria";
  const known = LABELS[category] ?? LABELS[category.toLowerCase()];
  if (known) return known;
  const text = category.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
