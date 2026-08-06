export type BudgetStatus = "draft" | "approved" | "converted" | "cancelled";

export interface BudgetItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Budget {
  id: string;
  clientId?: string;
  animalId?: string;
  clientName?: string;
  animalName?: string;
  clientPhone?: string;
  date: string;
  status: BudgetStatus;
  items: BudgetItem[];
  notes?: string;
  /** Forma de pagamento usada na conversão em venda. */
  paymentMethod?: string;
  /** Negociação: abatido do subtotal dos itens. */
  discountAmount?: number;
  /** Negociação: somado ao subtotal dos itens. */
  surchargeAmount?: number;
}

const STORAGE_KEY = "budgets";

const loadBudgets = (): Budget[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw) as Budget[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBudgets = (list: Budget[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const getBudgets = (): Budget[] => loadBudgets();

export const addBudget = (data: Omit<Budget, "id" | "status" | "date"> & { status?: BudgetStatus; date?: string }): Budget => {
  const list = loadBudgets();
  const id = `bud-${Date.now()}`;
  const newBudget: Budget = {
    id,
    clientId: data.clientId,
    animalId: data.animalId,
    clientName: (data as Partial<Budget>).clientName,
    animalName: (data as Partial<Budget>).animalName,
    clientPhone: (data as Partial<Budget>).clientPhone,
    date: data.date || new Date().toISOString().split("T")[0],
    status: data.status || "draft",
    items: data.items || [],
    notes: data.notes,
  };
  list.push(newBudget);
  saveBudgets(list);
  return newBudget;
};

export const updateBudget = (updated: Budget): boolean => {
  const list = loadBudgets();
  const idx = list.findIndex(b => b.id === updated.id);
  if (idx === -1) return false;
  list[idx] = { ...updated };
  saveBudgets(list);
  return true;
};

export const updateBudgetStatus = (id: string, status: BudgetStatus): boolean => {
  const list = loadBudgets();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return false;
  list[idx].status = status;
  saveBudgets(list);
  return true;
};

export const removeBudget = (id: string): boolean => {
  const list = loadBudgets();
  const next = list.filter(b => b.id !== id);
  if (next.length === list.length) return false;
  saveBudgets(next);
  return true;
};