import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Calendar, Plus, Syringe } from "lucide-react";

import type { AppointmentEntry, VaccinationDetails } from "@/types/appointment";
import { formatDateTime } from "@/lib/utils";

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
      <Card className="bg-card shadow-sm border border-border rounded-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" /> Vacinação
          </CardTitle>
          <Button
            size="sm"
            onClick={() =>
              navigate(`/clients/${clientId}/animals/${animalId}/add-appointment?type=${encodeURIComponent("Vacina")}`)
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Registrar vacina
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {vaccines.length > 0 ? (
            <div className="space-y-3">
              {vaccines.map((v) => {
                const d = v.details as VaccinationDetails;
                return (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="chip-soft badge-soft-teal">
                            <Syringe className="h-3.5 w-3.5" /> {d.tipoVacina || "Vacina"}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {formatDateTime(v.date, v.time)} • {v.vet}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {d.nomeComercial ? `Comercial: ${d.nomeComercial}` : ""}
                          {d.nomeComercial && d.lote ? " • " : ""}
                          {d.lote ? `Lote: ${d.lote}` : ""}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {d.viaAdministracao ? `Via: ${d.viaAdministracao}` : ""}
                          {d.viaAdministracao && d.localAplicacao ? " • " : ""}
                          {d.localAplicacao ? `Local: ${d.localAplicacao}` : ""}
                        </div>
                        {d.proximaDose && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Próxima dose: {d.proximaDose}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${v.id}`)}
                      >
                        Ver atendimento
                      </Button>
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
