import { useState, useEffect, useCallback } from "react";
import * as appointmentsApi from "@/lib/appointmentsApi";
import type { AppointmentEntry } from "@/types/appointment";

export function useAppointments(animalId?: string): {
  appointments: AppointmentEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [appointments, setAppointments] = useState<AppointmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = animalId
      ? await appointmentsApi.getAppointmentsByAnimal(animalId)
      : await appointmentsApi.getAppointments();
    setAppointments(data);
    setLoading(false);
  }, [animalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { appointments, loading, refetch };
}
