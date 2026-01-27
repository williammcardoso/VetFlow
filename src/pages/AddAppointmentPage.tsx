"use client";

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaStethoscope } from "react-icons/fa";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import AppointmentForm from "@/components/AppointmentForm";

import type { AppointmentEntry } from "@/types/appointment";
import { mockClients } from "@/mockData/clients";
import { mockAppointments } from "@/mockData/appointments";

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
  const initialData = isEditing ? mockAppointments.find((app) => app.id === appointmentId) : undefined;

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
    if (isEditing) {
      const index = mockAppointments.findIndex((app) => app.id === newAppointment.id);
      if (index !== -1) {
        mockAppointments[index] = newAppointment;
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        toast.error("Erro ao atualizar atendimento. Atendimento não encontrado.");
        return;
      }
    } else {
      mockAppointments.push(newAppointment);
      toast.success("Atendimento salvo com sucesso!");
    }

    navigate(`/clients/${clientId}/animals/${animalId}/record`);
  };

  const handleCancel = () => {
    navigate(`/clients/${clientId}/animals/${animalId}/record`);
  };

  const pageTitle = isEditing ? "Editar Atendimento" : "Adicionar Novo Atendimento";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaStethoscope className="h-5 w-5 text-muted-foreground" /> {pageTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {isEditing
                  ? `Editando atendimento de ${animal.name}.`
                  : `Registre um novo atendimento para ${animal.name}.`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
          >
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Prontuário
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt;{" "}
          <Link to="/clients" className="hover:text-primary">
            Clientes
          </Link>{" "}
          &gt;{" "}
          <Link to={`/clients/${client.id}`} className="hover:text-primary">
            {client.name}
          </Link>{" "}
          &gt;{" "}
          <Link to={`/clients/${clientId}/animals/${animalId}/record`} className="hover:text-primary">
            {animal.name}
          </Link>{" "}
          &gt; {pageTitle}
        </p>
      </div>

      <div className="flex-1 p-6">
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
