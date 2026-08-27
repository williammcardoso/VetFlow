import { useState, useEffect, useCallback } from "react";
import * as prescriptionsApi from "@/lib/prescriptionsApi";
import type { PrescriptionEntry } from "@/types/medication";

export function usePrescriptions(animalId?: string): {
  prescriptions: PrescriptionEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [prescriptions, setPrescriptions] = useState<PrescriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Limpa a lista assim que o animalId muda — sem isso, receitas do
  // prontuário anterior ficavam visíveis até a busca nova voltar.
  useEffect(() => {
    setPrescriptions([]);
  }, [animalId]);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await prescriptionsApi.getPrescriptions(animalId);
    setPrescriptions(data);
    setLoading(false);
  }, [animalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { prescriptions, loading, refetch };
}
