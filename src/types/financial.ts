export interface FinancialTransaction {
  id: string;
  date: string;
  time: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  relatedClientId?: string;
  relatedAnimalId?: string;
  paymentMethod?: string;
  status?: 'paid' | 'partial' | 'pending' | 'cancelled';
  paidAmount?: number;
  responsible?: string;
  observations?: string;
  paymentInstallments?: number;
  saleId?: string;
}