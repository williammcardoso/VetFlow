"use client";

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "@/components/icons/fa";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import AppointmentForm from "@/components/AppointmentForm";

import type { AppointmentEntry } from "@/types/appointment";
import { findAppointmentDraft, removeAppointmentDraft } from "@/lib/appointmentDrafts";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { usePatientRouteParams } from "@/hooks/usePatientRouteParams";
import { useAppointments } from "@/hooks/useAppointments";
import * as appointmentsApi from "@/lib/appointmentsApi";
import { PageShell } from "@/components/saas/PageShell";
import { getPatientRecordPath } from "@/utils/patientDisplayId";

const AddAppointmentPage = () => {
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const { clientId, animalId } = usePatientRouteParams();
  const navigate = useNavigate();
  const { data: clientData, isLoading: isClientLoading, isError: isClientError, error: clientError } = useClientWithAnimals(clientId);
  // skipWhenNoAnimalId: na rota curta (/prontuario/:patientCode/...), animalId
  // fica undefined por 1 render enquanto o código é resolvido — sem essa
  // opção, cairia no fallback de "todos os atendimentos da clínica" (mesmo
  // bug já corrigido no prontuário).
  const { appointments: dbAppointments, loading: isAppointmentsLoading } = useAppointments(animalId, { skipWhenNoAnimalId: true });

  const client = clientData ?? undefined;
  const animal = client?.animals.find((a) => a.id === animalId);

  const isEditing = !!appointmentId;

  const initialFromDb = isEditing ? dbAppointments.find((app) => app.id === appointmentId) : undefined;
  const initialFromDraft =
    isEditing && !initialFromDb && appointmentId
      ? findAppointmentDraft(clientId!, animalId!, appointmentId)?.appointment
      : undefined;

  const initialData = initialFromDb || initialFromDraft;

  if (isClientLoading || isAppointmentsLoading) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Carregando atendimento...</h1>
        <p className="text-muted-foreground">Buscando cliente, animal e histórico no Supabase.</p>
      </div>
    );
  }

  if (!client || !animal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">
          {isClientError
            ? `Erro ao carregar cliente/animal do Supabase: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}.`
            : "Animal ou Cliente não encontrado."}
        </h1>
        <Link to="/clients">
          <Button variant="outline">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const handleSaveAppointment = async (newAppointment: AppointmentEntry) => {
    if (!clientId || !animalId) {
      toast.error("Parâmetros inválidos para salvar o atendimento.");
      return;
    }

    const isDraftId = (newAppointment.id || "").startsWith("draft-");
    const baseIdCandidate = isDraftId ? newAppointment.id.replace(/^draft-/, "") : newAppointment.id;

    if (isEditing) {
      const targetId = appointmentId && !appointmentId.startsWith("draft-") ? appointmentId : baseIdCandidate;
      if (!targetId) {
        toast.error("Erro ao atualizar atendimento: ID inválido.");
        return;
      }

      const ok = await appointmentsApi.updateAppointment({ ...newAppointment, id: targetId, animalId });
      if (!ok) {
        toast.error("Erro ao atualizar atendimento no Supabase.");
        return;
      }

      if (isDraftId) removeAppointmentDraft(clientId, animalId, newAppointment.id);
      removeAppointmentDraft(clientId, animalId, `draft-${targetId}`);
      toast.success("Atendimento atualizado com sucesso!");
    } else {
      const created = await appointmentsApi.addAppointment({
        animalId,
        date: newAppointment.date,
        time: newAppointment.time,
        type: newAppointment.type,
        vet: newAppointment.vet,
        pesoAtual: newAppointment.pesoAtual,
        temperaturaCorporal: newAppointment.temperaturaCorporal,
        frequenciaCardiaca: newAppointment.frequenciaCardiaca,
        frequenciaRespiratoria: newAppointment.frequenciaRespiratoria,
        observacoesGerais: newAppointment.observacoesGerais,
        details: newAppointment.details,
        attachments: newAppointment.attachments,
      });

      if (!created) {
        toast.error("Erro ao salvar atendimento no Supabase.");
        return;
      }

      if (isDraftId) removeAppointmentDraft(clientId, animalId, newAppointment.id);
      toast.success("Atendimento salvo com sucesso!");
    }

    navigate(getPatientRecordPath(clientId, animalId, animal.patientCode));
  };

  const handleCancel = () => {
    navigate(getPatientRecordPath(clientId, animalId, animal.patientCode));
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl">
        <AppointmentForm
          animalId={animal.id}
          clientId={client.id}
          clientName={client.name}
          animal={animal}
          initialData={initialData}
          onSave={handleSaveAppointment}
          onCancel={handleCancel}
          mockAppointments={dbAppointments}
        />
      </div>
    </PageShell>
  );
};

export default AddAppointmentPage;