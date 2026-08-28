import { useParams } from "react-router-dom";
import { useAnimalRefByPatientCode } from "@/hooks/useSupabaseClients";

/**
 * Resolve clientId/animalId tanto da rota longa
 * (/clients/:clientId/animals/:animalId/...) quanto da rota curta
 * (/prontuario/:patientCode/...) — usado por toda tela "de baixo" do
 * prontuário (editar/adicionar atendimento, exame, receita, documento,
 * etc.), mesmo padrão já usado em PatientRecordPage.tsx pra rota do
 * prontuário em si. Cada tela continua lendo seu próprio param extra
 * (appointmentId, examId, ...) com o próprio useParams().
 */
export function usePatientRouteParams() {
  const {
    clientId: clientIdParam,
    animalId: animalIdParam,
    patientCode: patientCodeParam,
  } = useParams<{ clientId?: string; animalId?: string; patientCode?: string }>();

  const parsedPatientCode = patientCodeParam ? Number(patientCodeParam) : undefined;
  const {
    data: animalRef,
    isLoading: isAnimalRefLoading,
    isError: isAnimalRefError,
    error: animalRefError,
  } = useAnimalRefByPatientCode(parsedPatientCode);

  const clientId = clientIdParam || animalRef?.clientId;
  const animalId = animalIdParam || animalRef?.animalId;

  // Só está "carregando" de verdade se a rota depende do patientCode pra
  // resolver e ele ainda não voltou — na rota longa, clientId/animalId já
  // vêm prontos da URL, sem espera nenhuma.
  const isLoading = !clientIdParam && !animalIdParam && !!patientCodeParam && isAnimalRefLoading;

  return { clientId, animalId, isLoading, isError: isAnimalRefError, error: animalRefError };
}
