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
