import { useQuery } from "@tanstack/react-query";
import { listLastAppointmentDates } from "@/lib/appointmentsApi";

/** Último atendimento por animal (animal_id → "aaaa-mm-dd"), compartilhado entre a lista e a ficha do cliente. */
export function useLastAppointmentDates() {
  return useQuery({
    queryKey: ["appointments-last-dates"],
    queryFn: listLastAppointmentDates,
    staleTime: 60 * 1000,
  });
}
