import type { SaleItem } from "@/lib/saleItemsApi";

// Discriminação das vendas do período (Financeiro › Relatórios): por item
// ("5 hemogramas, 10 consultas") e dia a dia. Puro — a página resolve quem é
// o cliente/paciente de cada venda e passa em `SaleRef`.

export interface SaleRef {
  saleId: string;
  date: string;
  time?: string;
  /** Valor da venda (já com desconto/acréscimo). */
  amount: number;
  clientName: string;
  animalName: string;
  clientId?: string;
  animalId?: string;
  patientCode?: number;
}

export interface ItemSaleLine extends SaleRef {
  quantity: number;
  /** Valor do item nessa venda (preço × quantidade). */
  subtotal: number;
}

export interface ItemGroup {
  key: string;
  name: string;
  category?: string;
  quantity: number;
  total: number;
  lines: ItemSaleLine[];
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const chrono = (a: { date: string; time?: string }, b: { date: string; time?: string }) =>
  `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`);

/** Agrupa por item do catálogo (ou pelo nome, para itens sem cadastro). Mais vendidos primeiro. */
export function groupSaleItemsByItem(
  items: SaleItem[],
  saleRef: (saleId: string) => SaleRef | undefined,
  categoryOf?: (item: SaleItem) => string | undefined
): ItemGroup[] {
  const groups = new Map<string, ItemGroup & { lastAt: string }>();
  for (const item of items) {
    const ref = saleRef(item.saleId);
    if (!ref) continue;
    const key = item.catalogItemId ? `cat:${item.catalogItemId}` : `name:${normalize(item.name)}`;
    const at = `${ref.date}T${ref.time || "00:00"}`;
    const group = groups.get(key) ?? {
      key,
      name: item.name,
      category: categoryOf?.(item) ?? item.category,
      quantity: 0,
      total: 0,
      lines: [],
      lastAt: "",
    };
    group.quantity += item.quantity;
    group.total += item.subtotal;
    group.lines.push({ ...ref, quantity: item.quantity, subtotal: item.subtotal });
    // O nome mais recente vale (item renomeado no cadastro).
    if (at >= group.lastAt) {
      group.lastAt = at;
      group.name = item.name;
    }
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .map(({ lastAt: _lastAt, ...g }) => ({ ...g, total: Math.round(g.total * 100) / 100, lines: g.lines.sort(chrono) }))
    .sort((a, b) => b.quantity - a.quantity || b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
}

export interface DaySale extends SaleRef {
  items: { name: string; quantity: number; subtotal: number }[];
}

export interface DayGroup {
  date: string;
  total: number;
  /** Itens do dia somados: [{ "Consulta", 2 }, { "Hemograma completo", 1 }]. */
  items: { name: string; quantity: number }[];
  sales: DaySale[];
}

/** Lista corrida do período: cada dia com os itens vendidos e as vendas dele (em ordem de data). */
export function groupSalesByDay(items: SaleItem[], saleRef: (saleId: string) => SaleRef | undefined): DayGroup[] {
  const sales = new Map<string, DaySale>();
  for (const item of items) {
    const ref = saleRef(item.saleId);
    if (!ref) continue;
    const sale = sales.get(item.saleId) ?? { ...ref, items: [] };
    sale.items.push({ name: item.name, quantity: item.quantity, subtotal: item.subtotal });
    sales.set(item.saleId, sale);
  }
  const days = new Map<string, DayGroup>();
  for (const sale of sales.values()) {
    const day = days.get(sale.date) ?? { date: sale.date, total: 0, items: [], sales: [] };
    day.sales.push(sale);
    day.total += sale.amount;
    for (const it of sale.items) {
      const existing = day.items.find((x) => normalize(x.name) === normalize(it.name));
      if (existing) existing.quantity += it.quantity;
      else day.items.push({ name: it.name, quantity: it.quantity });
    }
    days.set(sale.date, day);
  }
  return Array.from(days.values())
    .map((d) => ({
      ...d,
      total: Math.round(d.total * 100) / 100,
      items: d.items.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "pt-BR")),
      sales: d.sales.sort(chrono),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "2× Consulta" / "Hemograma completo" (quantidade 1 fica sem número). */
export const formatQtyName = (name: string, quantity: number) =>
  quantity === 1 ? name : `${Number.isInteger(quantity) ? quantity : quantity.toLocaleString("pt-BR")}× ${name}`;
