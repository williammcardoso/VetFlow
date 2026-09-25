import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import SaasButton from "@/components/saas/SaasButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Calendar, Plus, Syringe, Eye, Pencil, Trash2 } from "lucide-react";

import type { AppointmentEntry, VaccinationDetails } from "@/types/appointment";
import { formatDateTime } from "@/lib/utils";
import { isoToBR } from "@/components/appointments/inputs/DateInputBR";
import { cn } from "@/lib/utils";
import * as appointmentsApi from "@/lib/appointmentsApi";
import { getPatientSubPath } from "@/utils/patientDisplayId";

export default function PatientVaccinesTab({
  clientId,
  animalId,
  patientCode,
  animalAppointments,
  setAnimalAppointments,
}: {
  clientId: string;
  animalId: string;
  patientCode?: number;
  animalAppointments: AppointmentEntry[];
  setAnimalAppointments: (next?: AppointmentEntry[]) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const vaccines = useMemo(() => {
    return [...animalAppointments]
      .filter((a) => a.type === "Vacina")
      .sort(
        (a, b) =>
          new Date(`${b.date}T${b.time || "00:00"}`).getTime() -
          new Date(`${a.date}T${a.time || "00:00"}`).getTime()
      );
  }, [animalAppointments]);

  const removeVaccineAppointment = async (id: string) => {
    const ok = await appointmentsApi.removeAppointment(id);
    if (ok) {
      await setAnimalAppointments();
      toast.info("Vacina excluída.");
    } else {
      toast.error("Falha ao excluir.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    await removeVaccineAppointment(deleteTargetId);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="premium-card rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" /> Vacinação
          </CardTitle>
          <SaasButton
            saasVariant="soft"
            size="sm"
            onClick={() =>
              navigate(getPatientSubPath(clientId, animalId, patientCode, `/add-appointment?type=${encodeURIComponent("Vacina")}`))
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Registrar vacina
          </SaasButton>
        </CardHeader>
        <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
          {vaccines.length > 0 ? (
            <div className="space-y-3">
              {vaccines.map((v) => {
                const d = v.details as VaccinationDetails;
                const doseLabel = d.dose || "";
                const nomeVacina = d.tipoVacina || "Vacina";
                const titulo = `${nomeVacina}${doseLabel ? ` • ${doseLabel}` : ""}`;

                return (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-xl border bg-white p-3 sm:p-4 transition-all duration-200",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                    )}
                  >
                    {/* Celular: ações numa faixa embaixo, igual às outras abas. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-[hsl(var(--vf-clinical))]/12 flex items-center justify-center">
                          <Syringe className="h-5 w-5 sm:h-6 sm:w-6 text-vf-clinical" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-base font-bold text-vf-clinical">
                            <span className="min-w-0 break-words">{titulo}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDateTime(v.date, v.time)}
                            </span>
                          </div>

                          {(d.nomeComercial || d.lote) && (
                            <div className="mt-2 break-words text-sm text-muted-foreground">
                              {d.nomeComercial ? `Comercial: ${d.nomeComercial}` : ""}
                              {d.nomeComercial && d.lote ? " • " : ""}
                              {d.lote ? `Lote: ${d.lote}` : ""}
                            </div>
                          )}

                          {d.profissionalAplicou && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              Aplicado por: {d.profissionalAplicou}
                            </div>
                          )}

                          {d.proximaDose && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              Próxima dose: {isoToBR(d.proximaDose)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2 sm:shrink-0 sm:flex-nowrap sm:gap-2 sm:border-0 sm:pt-0">
                        <SaasButton
                          saasVariant="ghost"
                          size="icon"
                          onClick={() => navigate(getPatientSubPath(clientId, animalId, patientCode, `/view-appointment/${v.id}`))}
                          className="rounded-md"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
                        </SaasButton>

                        <SaasButton
                          saasVariant="ghost"
                          size="icon"
                          onClick={() => navigate(getPatientSubPath(clientId, animalId, patientCode, `/edit-appointment/${v.id}`))}
                          className="rounded-md"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </SaasButton>

                        <SaasButton
                          saasVariant="ghost"
                          size="icon"
                          onClick={() => setDeleteTargetId(v.id)}
                          className="rounded-md"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </SaasButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-4">Nenhuma vacina registrada via atendimentos.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta vacina? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}