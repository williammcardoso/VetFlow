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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
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
        <CardContent className="pt-0">
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
                      "rounded-xl border bg-white p-4 transition-all duration-200",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      "border-[hsl(var(--vf-clinical))]/35 hover:shadow-[hsl(var(--vf-clinical))]/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-[hsl(var(--vf-clinical))]/12 flex items-center justify-center">
                          <Syringe className="h-6 w-6 text-vf-clinical" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-base font-bold text-vf-clinical">
                            <span>{titulo}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDateTime(v.date, v.time)}
                            </span>
                          </div>

                          {(d.nomeComercial || d.lote) && (
                            <div className="mt-2 text-sm text-muted-foreground">
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

                      <div className="flex gap-2">
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