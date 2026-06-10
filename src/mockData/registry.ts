/**
 * Registry (combos) e Purchase Orders: API Supabase.
 * Para listar por key use o hook useRegistryList(key) ou getRegistryList(key) async.
 */
export type RegistryKeySimple =
  | "species"
  | "breeds"
  | "coatTypes"
  | "pathologies"
  | "examAttributes"
  | "clientOrigins"
  | "recipeModels"
  | "appointmentTypes"
  | "vaccines"
  | "exams"
  | "documentModels"
  | "productGroups"
  | "brands"
  | "paymentMethods"
  | "accessProfiles";

export interface RegistryItem {
  id: string;
  name: string;
  [key: string]: any;
}

// Re-export async API (dados no Supabase)
export {
  getRegistryList,
  addRegistryItem,
  updateRegistryItem,
  removeRegistryItem,
} from "@/lib/registryApi";

// Purchase Orders: tipos e API
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
export {
  getPurchaseOrders,
  addPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  removePurchaseOrder,
} from "@/lib/purchaseOrdersApi";
