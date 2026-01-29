import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import SaasButton from "@/components/saas/SaasButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Calendar, Plus, Syringe, Eye } from "lucide-react";

import type { AppointmentEntry, VaccinationDetails } from "@/types/appointment";
import { formatDateTime } from "@/lib/utils";
import { isoToBR } from "@/components/appointments/inputs/DateInputBR";
import { cn } from "@/lib/utils";

export default function PatientVaccinesTab({
  clientId,
  animalId,
  animalAppointments,
}: {
  clientId: string;
  animalId: string;
  animalAppointments: AppointmentEntry[];
}) {
  const navigate = useNavigate();

  const vaccines = useMemo(() => {
    return [...animalAppointments]
      .filter((a) => a.type === "Vacina")
      .sort(
        (a, b) =>
          new Date(`${b.date}T${b.time || "00:00"}`).getTime() -
          new Date(`${a.date}T${a.time || "00:00"}`).getTime()
      );
  }, [animalAppointments]);

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
              navigate(`/clients/${clientId}/animals/${animalId}/add-appointment?type=${encodeURIComponent("Vacina")}`)
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

                return (
                  <div
                    key={v.id}
                    className={cn(
                      "rounded-xl border bg-white p-4 transition-all duration-200",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      "border-sky-300 hover:shadow-sky-200/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-sky-50/70 flex items-center justify-center">
                          <Syringe className="h-6 w-6 text-sky-600" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-base font-bold text-sky-900">
                            <span>{nomeVacina}</span>
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {doseLabel}
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

                      <SaasButton
                        saasVariant="ghost"
                        size="icon"
                        onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${v.id}`)}
                        className="rounded-md"
                        title="Ver"
                      >
                        <Eye className="h-4 w-4" />
                      </SaasButton>
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
    </div>
  );
}