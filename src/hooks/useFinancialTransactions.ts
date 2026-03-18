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

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await financialApi.getFinancialTransactions();
    setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { transactions, loading, refetch };
}
