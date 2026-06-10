import { useState, useEffect, useCallback } from "react";
import * as registryApi from "@/lib/registryApi";
import type { RegistryKeySimple, RegistryItem } from "@/mockData/registry";

export function useRegistryList(key: RegistryKeySimple): {
  list: RegistryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [list, setList] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await registryApi.getRegistryList(key);
      setList(data);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar dados.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { list, loading, error, refetch };
}
