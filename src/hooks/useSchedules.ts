import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as schedulesApi from "@/lib/schedulesApi";
import type { ScheduleUI } from "@/lib/schedulesApi";

const QUERY_KEY = ["schedules"] as const;

// Agendamentos de um paciente específico — usado pela Linha do Tempo do
// prontuário. Mesmo padrão de useAppointments/useObservations (não usa
// react-query) pra ficar consistente com os outros hooks que o prontuário
// já consome.
export function useAnimalSchedules(animalId?: string): {
  schedules: ScheduleUI[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [schedules, setSchedules] = useState<ScheduleUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSchedules([]);
  }, [animalId]);

  const refetch = useCallback(async () => {
    if (!animalId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await schedulesApi.getSchedulesByAnimal(animalId);
    setSchedules(data);
    setLoading(false);
  }, [animalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { schedules, loading, refetch };
}

export function useSchedulesList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => schedulesApi.listSchedules(),
  });
}

export function useScheduleMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (entry: Omit<ScheduleUI, "id"> & { id?: string }) => schedulesApi.createSchedule(entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const update = useMutation({
    mutationFn: (entry: ScheduleUI) => schedulesApi.updateSchedule(entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { create, update, remove };
}
