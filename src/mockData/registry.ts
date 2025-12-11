export type RegistryKeySimple =
  | "pathologies"
  | "appointmentTypes"
  | "vaccines"
  | "exams"
  | "examAttributes"
  | "clientOrigins"
  | "documentModels"
  | "recipeModels"
  | "productGroups"
  | "brands";

export interface RegistryItem {
  id: string;
  name: string;
  [key: string]: any;
}

const STORAGE_PREFIX = "registry:";

const loadList = (key: RegistryKeySimple): RegistryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw) as RegistryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveList = (key: RegistryKeySimple, list: RegistryItem[]) => {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(list));
};

export const getRegistryList = (key: RegistryKeySimple): RegistryItem[] => loadList(key);

export const addRegistryItem = (key: RegistryKeySimple, data: Omit<RegistryItem, "id">): RegistryItem => {
  const list = loadList(key);
  const id = `${key}-${Date.now()}`;
  const item: RegistryItem = { id, ...data };
  list.push(item);
  saveList(key, list);
  return item;
};

export const updateRegistryItem = (key: RegistryKeySimple, id: string, changes: Partial<RegistryItem>): boolean => {
  const list = loadList(key);
  const idx = list.findIndex(i => i.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...changes };
  saveList(key, list);
  return true;
};

export const removeRegistryItem = (key: RegistryKeySimple, id: string): boolean => {
  const list = loadList(key);
  const next = list.filter(i => i.id !== id);
  if (next.length === list.length) return false;
  saveList(key, next);
  return true;
};

// Purchase Orders (PO)
export type POStatus = "open" | "approved" | "received" | "cancelled";

export interface PurchaseOrderItem {
  itemId: string;
  name: string;
  qty: number;
}

export interface PurchaseOrder {
  id: string;
  supplier?: string;
  date: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  notes?: string;
}

const PO_KEY = "purchaseOrders";

const loadPOs = (): PurchaseOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + PO_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + PO_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw) as PurchaseOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePOs = (list: PurchaseOrder[]) => {
  localStorage.setItem(STORAGE_PREFIX + PO_KEY, JSON.stringify(list));
};

export const getPurchaseOrders = (): PurchaseOrder[] => loadPOs();

export const addPurchaseOrder = (po: Omit<PurchaseOrder, "id" | "status" | "date"> & { date?: string; status?: POStatus }): PurchaseOrder => {
  const list = loadPOs();
  const id = `po-${Date.now()}`;
  const newPO: PurchaseOrder = {
    id,
    supplier: po.supplier,
    date: po.date || new Date().toISOString().split("T")[0],
    status: po.status || "open",
    items: po.items || [],
    notes: po.notes,
  };
  list.push(newPO);
  savePOs(list);
  return newPO;
};

export const updatePurchaseOrder = (updated: PurchaseOrder): boolean => {
  const list = loadPOs();
  const idx = list.findIndex(p => p.id === updated.id);
  if (idx === -1) return false;
  list[idx] = { ...updated };
  savePOs(list);
  return true;
};

export const updatePurchaseOrderStatus = (id: string, status: POStatus): boolean => {
  const list = loadPOs();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return false;
  list[idx].status = status;
  savePOs(list);
  return true;
};

export const removePurchaseOrder = (id: string): boolean => {
  const list = loadPOs();
  const next = list.filter(p => p.id !== id);
  if (next.length === list.length) return false;
  savePOs(next);
  return true;
};