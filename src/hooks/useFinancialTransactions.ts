import { useState, useEffect, useCallback } from "react";
import * as financialApi from "@/lib/financialApi";
import type { FinancialTransaction } from "@/mockData/financial";

export function useFinancialTransactions(): {
  transactions: FinancialTransaction[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Recarrega em segundo plano: `loading` só no primeiro carregamento — antes
  // a lista inteira sumia ("Carregando...") a cada venda/recebimento salvo.
  const refetch = useCallback(async () => {
    const data = await financialApi.getFinancialTransactions();
    setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { transactions, loading, refetch };
}
