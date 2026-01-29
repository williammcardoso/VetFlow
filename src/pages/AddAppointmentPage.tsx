"use client";

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import AppointmentForm from "@/components/AppointmentForm";

import type { AppointmentEntry } from "@/types/appointment";
import { mockClients } from "@/mockData/clients";
import { mockAppointments } from "@/mockData/appointments";
import { findAppointmentDraft, removeAppointmentDraft } from "@/lib/appointmentDrafts";

const AddAppointmentPage = () => {
  const { clientId, animalId, appointmentId } = useParams<{
    clientId: string;
    animalId: string;
    appointmentId?: string;
  }>();
  const navigate = useNavigate();

  const client = mockClients.find((c) => c.id === clientId);
  const animal = client?.animals.find((a) => a.id === animalId);

  const isEditing = !!appointmentId;

  const initialFromMock = isEditing ? mockAppointments.find((app) => app.id === appointmentId) : undefined;
  const initialFromDraft =
    isEditing && !initialFromMock && appointmentId
      ? findAppointmentDraft(clientId!, animalId!, appointmentId)?.appointment
      : undefined;

  const initialData = initialFromMock || initialFromDraft;

  if (!client || !animal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Animal ou Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const handleSaveAppointment = (newAppointment: AppointmentEntry) => {
    const isDraftId = (newAppointment.id || "").startsWith("draft-");
    const baseIdCandidate = isDraftId ? newAppointment.id.replace(/^draft-/, "") : "";
    const baseIdx = baseIdCandidate ? mockAppointments.findIndex((a) => a.id === baseIdCandidate) : -1;

    // Se estávamos editando um rascunho de um atendimento existente (draft-app1), salvar atualizando o atendimento real.
    if (isDraftId && baseIdx >= 0) {
      const updated: AppointmentEntry = { ...newAppointment, id: baseIdCandidate };
      mockAppointments[baseIdx] = updated;
      removeAppointmentDraft(clientId!, animalId!, newAppointment.id);
      toast.success("Atendimento atualizado com sucesso!");
      navigate(`/clients/${clientId}/animals/${animalId}/record`);
      return;
    }

    // Se o formulário está salvando um rascunho de NOVO atendimento, transforma em definitivo.
    if (isDraftId) {
      const definitive: AppointmentEntry = { ...newAppointment, id: `app-${Date.now()}` };
      mockAppointments.push(definitive);
      removeAppointmentDraft(clientId!, animalId!, newAppointment.id);
      toast.success("Atendimento salvo com sucesso!");
      navigate(`/clients/${clientId}/animals/${animalId}/record`);
      return;
    }

    // Fluxo normal (editar ou criar sem rascunho)
    if (isEditing) {
      const index = mockAppointments.findIndex((app) => app.id === newAppointment.id);
      if (index !== -1) {
        mockAppointments[index] = newAppointment;
        // se existia rascunho para este atendimento, limpa
        removeAppointmentDraft(clientId!, animalId!, `draft-${newAppointment.id}`);
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        toast.error("Erro ao atualizar atendimento. Atendimento não encontrado.");
        return;
      }
    } else {
      mockAppointments.push(newAppointment);
      // se a tela tinha um rascunho de criação, ele será removido no próprio formulário; aqui é fallback
      toast.success("Atendimento salvo com sucesso!");
    }

    navigate(`/clients/${clientId}/animals/${animalId}/record`);
  };

  const handleCancel = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/record`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <AppointmentForm
          animalId={animal.id}
          clientId={client.id}
          initialData={initialData}
          onSave={handleSaveAppointment}
          onCancel={handleCancel}
          mockAppointments={mockAppointments}
        />
      </div>
    </div>
  );
};

export default AddAppointmentPage;