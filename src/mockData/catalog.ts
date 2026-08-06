export type CatalogItemType = 'product' | 'service';
export type CatalogCategory =
  | 'produto'
  | 'servico'
  | 'cirurgia'
  | 'exame_interno'
  | 'exame_externo'
  | 'especialista'
  | 'vacina';

export interface CatalogItem {
  id: string;
  name: string;
  type: CatalogItemType;
  price: number;
  cost?: number;      // Valor a repassar (custo do prestador/fornecedor)
  costProvider?: string; // Quem recebe o repasse (ex.: Cardiologista, Lab externo)
  category?: CatalogCategory; // Categoria do item
  sku?: string;
  unit?: string;
  stockQty?: number; // Apenas para produto
  brand?: string;
  group?: string;
  active: boolean;
  recommended?: boolean; // NEW
}

const STORAGE_KEY = 'catalogItems';

const defaultItems: CatalogItem[] = [
  { id: 'prod1', name: 'Ração Premium 1kg', type: 'product', price: 50, sku: 'RAC-1KG', unit: 'un', stockQty: 20, brand: 'PetPlus', group: 'Alimentos', active: true, recommended: true, category: 'produto' },
  { id: 'prod2', name: 'Brinquedo para Cachorro', type: 'product', price: 25, sku: 'BRI-DOG', unit: 'un', stockQty: 30, brand: 'PetFun', group: 'Acessórios', active: true, recommended: false, category: 'produto' },
  { id: 'serv1', name: 'Consulta de Rotina', type: 'service', price: 120, unit: 'serviço', active: true, category: 'servico' },
  { id: 'serv2', name: 'Vacina V8', type: 'service', price: 90, unit: 'dose', active: true, category: 'vacina' },
  { id: 'serv3', name: 'Exame de Sangue', type: 'service', price: 150, unit: 'exame', active: true, category: 'exame_externo', cost: 60, costProvider: 'Laboratório externo' },
  { id: 'serv4', name: 'Consulta Cardiológica', type: 'service', price: 250, unit: 'serviço', active: true, category: 'especialista', cost: 200, costProvider: 'Cardiologista' },
];

const load = (): CatalogItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultItems));
      return [...defaultItems];
    }
    const parsed = JSON.parse(raw) as CatalogItem[];
    // Garantir id único e estrutura mínima
    return parsed.map((it, idx) => ({
      id: it.id || `item-${idx + 1}`,
      name: it.name,
      type: it.type,
      price: Number(it.price) || 0,
      sku: it.sku,
      unit: it.unit,
      stockQty: it.type === 'product' ? (typeof it.stockQty === 'number' ? it.stockQty : 0) : undefined,
      brand: it.brand,
      group: it.group,
      active: it.active !== false,
      recommended: it.recommended === true,
      cost: typeof it.cost === 'number' ? it.cost : undefined,
      costProvider: typeof it.costProvider === 'string' ? it.costProvider : undefined,
      category: it.category ?? undefined,
    }));
  } catch {
    return [...defaultItems];
  }
};

const save = (items: CatalogItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getCatalog = (): CatalogItem[] => load();

export const getCatalogByType = (type: CatalogItemType): CatalogItem[] =>
  load().filter(it => it.type === type && it.active);

export const findCatalogItem = (id: string): CatalogItem | undefined =>
  load().find(it => it.id === id);

export const addCatalogItem = (item: Omit<CatalogItem, 'id' | 'active'> & { active?: boolean }): CatalogItem => {
  const list = load();
  const id = `${item.type === 'product' ? 'prod' : 'serv'}-${Date.now()}`;
  const newItem: CatalogItem = {
    id,
    name: item.name,
    type: item.type,
    price: Number(item.price) || 0,
    sku: item.sku,
    unit: item.unit,
    stockQty: item.type === 'product' ? (item.stockQty ?? 0) : undefined,
    brand: item.brand,
    group: item.group,
    active: item.active ?? true,
    cost: item.cost,
    costProvider: item.costProvider,
    category: item.category,
  };
  list.push(newItem);
  save(list);
  return newItem;
};

export const updateCatalogItem = (updated: CatalogItem): boolean => {
  const list = load();
  const idx = list.findIndex(it => it.id === updated.id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...updated };
  save(list);
  return true;
};

export const removeCatalogItem = (id: string): boolean => {
  const list = load();
  const next = list.filter(it => it.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
};

// Retorna o lucro líquido de um item (preço - custo do fornecedor)
export const getProfit = (item: CatalogItem): number => {
  return item.price - (item.cost ?? 0);
};

export const adjustStock = (id: string, delta: number): boolean => {
  const list = load();
  const idx = list.findIndex(it => it.id === id);
  if (idx === -1) return false;
  const item = list[idx];
  if (item.type !== 'product') return false;
  const current = item.stockQty || 0;
  item.stockQty = Math.max(0, current + delta);
  list[idx] = item;
  save(list);
  return true;
};