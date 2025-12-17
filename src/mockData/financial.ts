export interface FinancialTransaction {
  id: string;
  date: string;
  time: string; // Adicionado campo de hora
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  relatedAnimalId?: string;
  relatedClientId?: string;
  paymentMethod?: string; // NEW: método de pagamento

  // NEW FIELDS
  status?: 'paid' | 'partial' | 'pending' | 'cancelled';
  paidAmount?: number; // quanto já foi recebido desta venda
  responsible?: string;
  observations?: string;
  paymentInstallments?: number; // número de parcelas, quando aplicável
  saleId?: string; // para recebimentos vinculados a uma venda específica
}

export interface OverallFinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export let mockFinancialTransactions: FinancialTransaction[] = [
  {
    id: "ft1",
    date: "2024-07-20",
    time: "10:30",
    description: "Consulta de Rotina - Totó",
    type: "income",
    amount: 120.00,
    category: "Atendimento",
    relatedAnimalId: "a1",
    relatedClientId: "1",
  },
  {
    id: "ft2",
    date: "2024-07-20",
    time: "11:00",
    description: "Venda de Ração Premium - Totó",
    type: "income",
    amount: 85.00,
    category: "Venda de Produtos",
    relatedAnimalId: "a1",
    relatedClientId: "1",
  },
  {
    id: "ft3",
    date: "2024-07-18",
    time: "15:45",
    description: "Exame de Sangue - Fido",
    type: "income",
    amount: 150.00,
    category: "Exames",
    relatedAnimalId: "a3",
    relatedClientId: "2",
  },
  {
    id: "ft4",
    date: "2024-07-15",
    time: "09:00",
    description: "Pagamento de Aluguel",
    type: "expense",
    amount: 2500.00,
    category: "Despesas Fixas",
  },
  {
    id: "ft5",
    date: "2024-07-10",
    time: "16:15",
    description: "Vacina V8 - Bolinha",
    type: "income",
    amount: 90.00,
    category: "Vacinação",
    relatedAnimalId: "a2",
    relatedClientId: "1",
  },
  {
    id: "ft6",
    date: "2024-07-05",
    time: "10:00",
    description: "Compra de Medicamentos",
    type: "expense",
    amount: 750.00,
    category: "Estoque",
  },
  {
    id: "ft7",
    date: "2024-06-25",
    time: "13:00",
    description: "Consulta de Retorno - Rex",
    type: "income",
    amount: 80.00,
    category: "Atendimento",
    relatedAnimalId: "a5",
    relatedClientId: "3",
  },
];

export const getOverallFinancialSummary = (): OverallFinancialSummary => {
  const totalRevenue = mockFinancialTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = mockFinancialTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  return { totalRevenue, totalExpenses, netProfit };
};

// Função para adicionar uma nova transação (para uso no mock)
export const addMockFinancialTransaction = (newTransaction: Omit<FinancialTransaction, 'id'>) => {
  const id = `ft${mockFinancialTransactions.length + 1}`;
  mockFinancialTransactions.push({ ...newTransaction, id });
};

// NEW: Atualizar uma transação existente por id
export const updateMockFinancialTransaction = (id: string, changes: Partial<FinancialTransaction>): boolean => {
  const idx = mockFinancialTransactions.findIndex(t => t.id === id);
  if (idx === -1) return false;
  mockFinancialTransactions[idx] = { ...mockFinancialTransactions[idx], ...changes };
  return true;
};

// NEW: Registrar recebimento (income) e atualizar o status/valor pago da venda vinculada, se houver
export const addMockReceipt = (data: {
  saleId?: string;
  amount: number;
  paymentMethod?: string;
  description?: string;
  relatedClientId?: string;
  relatedAnimalId?: string;
}) => {
  const now = new Date();
  const receipt: Omit<FinancialTransaction, 'id'> = {
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    description: data.description || 'Recebimento',
    type: 'income',
    amount: data.amount,
    category: 'Recebimento',
    paymentMethod: data.paymentMethod,
    saleId: data.saleId,
    relatedClientId: data.relatedClientId,
    relatedAnimalId: data.relatedAnimalId,
  };
  addMockFinancialTransaction(receipt);

  if (data.saleId) {
    // Procurar a venda original e atualizar paidAmount/status
    const saleIdx = mockFinancialTransactions.findIndex(
      t => t.id === data.saleId && t.category === 'Venda de Produtos'
    );
    if (saleIdx > -1) {
      const sale = mockFinancialTransactions[saleIdx];
      const alreadyPaid = sale.paidAmount || 0;
      const newPaid = alreadyPaid + data.amount;
      const newStatus = newPaid >= sale.amount ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
      mockFinancialTransactions[saleIdx] = { ...sale, paidAmount: newPaid, status: newStatus };
    }
  }
};