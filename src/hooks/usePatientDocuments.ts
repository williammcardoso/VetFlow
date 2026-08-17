import { useQuery } from "@tanstack/react-query";
import { getDocumentsByPatient } from "@/lib/documentEmissionApi";

export function usePatientDocuments(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ["patient-documents", pacienteId],
    queryFn: () => getDocumentsByPatient(pacienteId as string),
    enabled: !!pacienteId,
    staleTime: 1000 * 30,
  });
}
