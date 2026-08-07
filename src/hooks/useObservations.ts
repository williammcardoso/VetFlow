import { useState, useEffect, useCallback } from "react";
import * as observationsApi from "@/lib/observationsApi";
import type { ObservationEntry } from "@/lib/observationsApi";

export function useObservations(animalId?: string): {
  observations: ObservationEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await observationsApi.getObservations(animalId);
    setObservations(data);
    setLoading(false);
  }, [animalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { observations, loading, refetch };
}
