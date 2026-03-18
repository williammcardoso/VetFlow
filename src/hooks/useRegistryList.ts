import { useState, useEffect, useCallback } from "react";
import * as registryApi from "@/lib/registryApi";
import type { RegistryKeySimple, RegistryItem } from "@/mockData/registry";

export function useRegistryList(key: RegistryKeySimple): {
  list: RegistryItem[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [list, setList] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await registryApi.getRegistryList(key);
    setList(data);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { list, loading, refetch };
}
