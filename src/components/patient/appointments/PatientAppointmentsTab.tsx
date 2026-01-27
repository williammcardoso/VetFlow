import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import SaasButton from "@/components/saas/SaasButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertTriangle,
  Calendar,
  Eye,
  Plus,
  Repeat2,
  Scissors,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";

import type {
  AppointmentEntry,
  BaseAppointmentDetails,
  ConsultationDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
  EmergencyDetails,
} from "@/types/appointment";
import { mockAppointments } from "@/mockData/appointments";
import { formatDateTime } from "@/lib/utils";

const displayType = (type: AppointmentEntry["type"]) => {
  if (type === "Consulta" || type === "Consulta (Modelo Antigo)") return "Consulta";
  if (type === "Vacina") return "Vacinação";
  return type;
};

const typeMeta = (type: AppointmentEntry["type"]) => {
  const t = displayType(type);
  if (t === "Consulta") {
    return {
      label: "Consulta",
      icon: Stethoscope,
      badge: "badge-soft-blue",
      left: "bg-blue-400",
    };
  }
  if (t === "Cirurgia") {
    return {
      label: "Cirurgia",
      icon: Scissors,
      badge: "badge-soft-purple",
      left: "bg-purple-400",
    };
  }
  if (t === "Vacinação") {
    return {
      label: "Vacinação",
      icon: Syringe,
      badge: "badge-soft-teal",
      left: "bg-teal-400",
    };
  }
  if (t === "Retorno") {
    return {
      label: "Retorno",
      icon: Repeat2,
      badge: "badge-soft-amber",
      left: "bg-amber-400",
    };
  }
  if (t === "Emergência") {
    return {
      label: "Emergência",
      icon: AlertTriangle,
      badge: "bg-red-100 text-red-800",
      left: "bg-red-400",
    };
  }
  return {
    label: t,
    icon: Calendar,
    badge: "badge-soft-gray",
    left: "bg-slate-300",
  };
};

function buildSummary(app: AppointmentEntry) {
  const type = displayType(app.type);
  const base = app.details as BaseAppointmentDetails;

  if (type === "Consulta") {
    const c = app.details as ConsultationDetails;
    return (
      c.suspeitaDiagnostica ||
      c.diagnosticoPresuntivo ||
      c.diagnosticoDefinitivo ||
      c.condutaTratamento ||
      c.queixaPrincipal ||
      app.observacoesGerais ||
      "Consulta"
    );
  }

  if (type === "Cirurgia") {
    const s = app.details as SurgeryDetails;
    return (
      s.procedimentoRealizado ||
      s.diagnostico ||
      s.tecnicaCirurgica ||
      app.observacoesGerais ||
      "Cirurgia"
    );
  }

  if (type === "Vacinação") {
    const v = app.details as VaccinationDetails;
    const main = v.tipoVacina || "Vacinação";
    const dose = v.dose ? ` • ${v.dose}` : "";
    const local = v.localAplicacao ? ` • ${v.localAplicacao}` : "";
    return `${main}${dose}${local}`;
  }

  if (type === "Retorno") {
    const r = app.details as ReturnDetails;
    return r.motivoRetorno || r.evolucaoObservada || "Retorno";
  }

  if (type === "Emergência") {
    const e = app.details as EmergencyDetails;
    return e.condicaoGeral || app.observacoesGerais || "Emergência";
  }

  return base.suspeitaDiagnostica || base.condutaTratamento || app.observacoesGerais || `Atendimento de ${type}`;
}

export default function PatientAppointmentsTab({
  clientId,
  animalId,
  animalAppointments,
  setAnimalAppointments,
}: {
  clientId: string;
  animalId: string;
  animalAppointments: AppointmentEntry[];
  setAnimalAppointments: (next: AppointmentEntry[]) => void;
}) {
  const navigate = useNavigate();
  const [consultDialogOpen, setConsultDialogOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...animalAppointments].sort(
      (a, b) =>
        new Date(`${b.date}T${b.time || "00:00"}`).getTime() -
        new Date(`${a.date}T${a.time || "00:00"}`).getTime()
    );
  }, [animalAppointments]);

  const goNew = (type: AppointmentEntry["type"]) => {
    const qp = new URLSearchParams();
    qp.set("type", type);
    navigate(`/clients/${clientId}/animals/${animalId}/add-appointment?${qp.toString()}`);
  };

  const removeAppointment = (id: string) => {
    const index = mockAppointments.findIndex((a) => a.id === id);
    if (index > -1) {
      mockAppointments.splice(index, 1);
      setAnimalAppointments(mockAppointments.filter((a) => a.animalId === animalId));
      toast.info("Atendimento excluído.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="premium-card rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Novo atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <SaasButton
              saasVariant="outline"
              className="justify-start gap-2"
              onClick={() => setConsultDialogOpen(true)}
            >
              <Stethoscope className="h-4 w-4 text-primary" /> Consulta
            </SaasButton>
            <SaasButton saasVariant="outline" className="justify-start gap-2" onClick={() => goNew("Cirurgia")}>
              <Scissors className="h-4 w-4 text-primary" /> Cirurgia
            </SaasButton>
            <SaasButton saasVariant="outline" className="justify-start gap-2" onClick={() => goNew("Vacina")}>
              <Syringe className="h-4 w-4 text-primary" /> Vacina
            </SaasButton>
            <SaasButton saasVariant="outline" className="justify-start gap-2" onClick={() => goNew("Retorno")}>
              <Repeat2 className="h-4 w-4 text-primary" /> Retorno
            </SaasButton>
            <SaasButton
              saasVariant="outline"
              className="justify-start gap-2"
              onClick={() => goNew("Emergência")}
            >
              <AlertTriangle className="h-4 w-4 text-destructive" /> Emergência
            </SaasButton>
          </div>
        </CardContent>
      </Card>

      <Dialog open={consultDialogOpen} onOpenChange={setConsultDialogOpen}>
        <DialogContent className="premium-card rounded-xl">
          <DialogHeader>
            <DialogTitle>Consulta</DialogTitle>
            <DialogDescription>Selecione qual modelo de consulta deseja utilizar.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SaasButton onClick={() => { setConsultDialogOpen(false); goNew("Consulta"); }}>
              Consulta (Novo Modelo)
            </SaasButton>
            <SaasButton
              saasVariant="outline"
              onClick={() => { setConsultDialogOpen(false); goNew("Consulta (Modelo Antigo)"); }}
            >
              Consulta (Modelo Antigo)
            </SaasButton>
          </div>
          <DialogFooter>
            <SaasButton saasVariant="outline" onClick={() => setConsultDialogOpen(false)}>
              Cancelar
            </SaasButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="premium-card rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Histórico de atendimentos</CardTitle>
          <SaasButton
            saasVariant="soft"
            size="sm"
            onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/add-appointment`)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Novo
          </SaasButton>
        </CardHeader>
        <CardContent className="pt-0">
          {sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((app) => {
                const meta = typeMeta(app.type);
                const Icon = meta.icon;
                const summary = buildSummary(app);

                return (
                  <div
                    key={app.id}
                    className="premium-card premium-card--soft card-hover relative rounded-xl overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.left}`} />
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`chip-soft ${meta.badge}`}>
                              <Icon className="h-3.5 w-3.5" /> {meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(app.date, app.time)} • {app.vet}
                            </span>
                          </div>
                          <div className="mt-2 text-[15px] font-semibold text-foreground leading-snug truncate">
                            {summary}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <SaasButton
                            saasVariant="ghost"
                            size="icon"
                            onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${app.id}`)}
                            className="rounded-md"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </SaasButton>
                          <SaasButton
                            saasVariant="ghost"
                            size="icon"
                            onClick={() => removeAppointment(app.id)}
                            className="rounded-md"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </SaasButton>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-4">Nenhum atendimento registrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}