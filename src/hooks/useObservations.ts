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

  // Limpa a lista assim que o animalId muda — sem isso, observações do
  // prontuário anterior ficavam visíveis até a busca nova voltar.
  useEffect(() => {
    setObservations([]);
  }, [animalId]);

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
