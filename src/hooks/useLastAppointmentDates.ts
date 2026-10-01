import { useQuery } from "@tanstack/react-query";
import { listLastAppointmentDates } from "@/lib/appointmentsApi";
import { listLastVisits } from "@/lib/lastVisits";

/** Último atendimento por animal (animal_id → "aaaa-mm-dd"), compartilhado entre a lista e a ficha do cliente. */
export function useLastAppointmentDates() {
  return useQuery({
    queryKey: ["appointments-last-dates"],
    queryFn: listLastAppointmentDates,
    staleTime: 60 * 1000,
  });
}

/** Última visita (atendimento ou venda) por pet e por cliente — lista e ficha do cliente. */
export function useLastVisits() {
  return useQuery({
    queryKey: ["last-visits"],
    queryFn: listLastVisits,
    staleTime: 60 * 1000,
  });
}
