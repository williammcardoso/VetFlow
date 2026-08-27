import { useState, useEffect, useCallback } from "react";
import * as appointmentsApi from "@/lib/appointmentsApi";
import type { AppointmentEntry } from "@/types/appointment";

export function useAppointments(
  animalId?: string,
  options?: { skipWhenNoAnimalId?: boolean }
): {
  appointments: AppointmentEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const skip = !!options?.skipWhenNoAnimalId && !animalId;
  const [appointments, setAppointments] = useState<AppointmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Limpa a lista assim que o animalId muda (ex.: usuário navega de um
  // prontuário pro outro, sem remount do componente) — antes, o array antigo
  // ficava visível até a busca nova voltar, misturando dados de pacientes
  // diferentes na tela.
  useEffect(() => {
    setAppointments([]);
  }, [animalId]);

  const refetch = useCallback(async () => {
    // `skipWhenNoAnimalId` existe só pra quem espera um animalId específico
    // (ex.: prontuário) — sem ele, `animalId` undefined cairia no fallback
    // de `getAppointments()` (todos os atendimentos da clínica), que é o
    // comportamento certo só pra quem pede a lista geral de propósito
    // (Dashboard, Header, relatórios).
    if (skip) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = animalId
      ? await appointmentsApi.getAppointmentsByAnimal(animalId)
      : await appointmentsApi.getAppointments();
    setAppointments(data);
    setLoading(false);
  }, [animalId, skip]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { appointments, loading, refetch };
}
