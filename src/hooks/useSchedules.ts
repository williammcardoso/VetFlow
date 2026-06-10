import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as schedulesApi from "@/lib/schedulesApi";
import type { ScheduleUI } from "@/lib/schedulesApi";

const QUERY_KEY = ["schedules"] as const;

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
