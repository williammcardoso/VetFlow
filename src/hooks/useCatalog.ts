import { useState, useEffect, useCallback } from "react";
import * as catalogApi from "@/lib/catalogApi";
import type { CatalogItem } from "@/mockData/catalog";

export function useCatalog(): {
  items: CatalogItem[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await catalogApi.getCatalog();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}
