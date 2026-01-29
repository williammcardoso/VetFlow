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
  UserRound,
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
import { cn, formatDateTime } from "@/lib/utils";

const displayType = (type: AppointmentEntry["type"]) => {
  if (type === "Consulta" || type === "Consulta (Modelo Antigo)") return "Consulta";
  if (type === "Vacina") return "Vacinação";
  return type;
};

type TypeMeta = {
  label: string;
  icon: React.ElementType;
  buttonClass: string;
  iconClass: string;
  cardBorderClass: string;
  cardHoverShadowClass: string;
  iconWrapBgClass: string;
};

const typeMeta = (type: AppointmentEntry["type"]): TypeMeta => {
  const t = displayType(type);

  // Paleta premium (mesmas cores nos botões e nos cards)
  if (t === "Consulta") {
    return {
      label: "Consulta",
      icon: Stethoscope,
      buttonClass:
        "border-2 border-teal-300 bg-teal-50/40 text-teal-900 hover:bg-teal-50/70 hover:shadow-lg hover:shadow-teal-200/70 hover:-translate-y-0.5",
      iconClass: "text-teal-600",
      cardBorderClass: "border-teal-300",
      cardHoverShadowClass: "hover:shadow-teal-200/70",
      iconWrapBgClass: "bg-teal-50",
    };
  }

  if (t === "Cirurgia") {
    return {
      label: "Cirurgia",
      icon: Scissors,
      buttonClass:
        "border-2 border-rose-300 bg-rose-50/40 text-rose-900 hover:bg-rose-50/70 hover:shadow-lg hover:shadow-rose-200/70 hover:-translate-y-0.5",
      iconClass: "text-rose-600",
      cardBorderClass: "border-rose-300",
      cardHoverShadowClass: "hover:shadow-rose-200/70",
      iconWrapBgClass: "bg-rose-50",
    };
  }

  if (t === "Vacinação") {
    return {
      label: "Vacinação",
      icon: Syringe,
      buttonClass:
        "border-2 border-sky-300 bg-sky-50/40 text-sky-900 hover:bg-sky-50/70 hover:shadow-lg hover:shadow-sky-200/70 hover:-translate-y-0.5",
      iconClass: "text-sky-600",
      cardBorderClass: "border-sky-300",
      cardHoverShadowClass: "hover:shadow-sky-200/70",
      iconWrapBgClass: "bg-sky-50",
    };
  }

  if (t === "Retorno") {
    return {
      label: "Retorno",
      icon: Repeat2,
      buttonClass:
        "border-2 border-slate-300 bg-slate-50/60 text-slate-900 hover:bg-slate-50/80 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5",
      iconClass: "text-slate-600",
      cardBorderClass: "border-slate-300",
      cardHoverShadowClass: "hover:shadow-slate-200/70",
      iconWrapBgClass: "bg-slate-50",
    };
  }

  if (t === "Emergência") {
    return {
      label: "Emergência",
      icon: AlertTriangle,
      // Único com fundo levemente mais forte
      buttonClass:
        "border-2 border-orange-300 bg-orange-100/70 text-orange-950 hover:bg-orange-100 hover:shadow-lg hover:shadow-orange-200/80 hover:-translate-y-0.5",
      iconClass: "text-orange-700",
      cardBorderClass: "border-orange-300",
      cardHoverShadowClass: "hover:shadow-orange-200/80",
      iconWrapBgClass: "bg-orange-100/70",
    };
  }

  return {
    label: t,
    icon: Calendar,
    buttonClass:
      "border-2 border-border bg-white hover:bg-white hover:shadow-lg hover:shadow-muted-foreground/10 hover:-translate-y-0.5",
    iconClass: "text-muted-foreground",
    cardBorderClass: "border-border",
    cardHoverShadowClass: "hover:shadow-muted-foreground/10",
    iconWrapBgClass: "bg-muted/30",
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
    const nomeVacina = (v.tipoVacina || "-").trim() || "-";
    const dose = (v.dose || "-").trim() || "-";
    const nomeComercial = (v.nomeComercial || "-").trim() || "-";
    return `Vacina: ${nomeVacina} - ${dose} - ${nomeComercial}`;
  }

  if (type === "Retorno") {
    const r = app.details as ReturnDetails;
    return r.motivoRetorno || r.evolucaoObservada || "Retorno";
  }

  if (type === "Emergência") {
    const e = app.details as EmergencyDetails;
    return e.condicaoGeral || app.observacoesGerais || "Emergência";
  }

  return (
    base.suspeitaDiagnostica ||
    base.condutaTratamento ||
    app.observacoesGerais ||
    `Atendimento de ${type}`
  );
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

  const metaConsulta = typeMeta("Consulta");
  const metaCirurgia = typeMeta("Cirurgia");
  const metaVacina = typeMeta("Vacina");
  const metaRetorno = typeMeta("Retorno");
  const metaEmerg = typeMeta("Emergência");

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
              className={cn(
                "justify-start gap-2 transition-all duration-200",
                metaConsulta.buttonClass
              )}
              onClick={() => setConsultDialogOpen(true)}
            >
              <Stethoscope className={cn("h-4 w-4", metaConsulta.iconClass)} /> Consulta
            </SaasButton>

            <SaasButton
              saasVariant="outline"
              className={cn(
                "justify-start gap-2 transition-all duration-200",
                metaCirurgia.buttonClass
              )}
              onClick={() => goNew("Cirurgia")}
            >
              <Scissors className={cn("h-4 w-4", metaCirurgia.iconClass)} /> Cirurgia
            </SaasButton>

            <SaasButton
              saasVariant="outline"
              className={cn(
                "justify-start gap-2 transition-all duration-200",
                metaVacina.buttonClass
              )}
              onClick={() => goNew("Vacina")}
            >
              <Syringe className={cn("h-4 w-4", metaVacina.iconClass)} /> Vacinação
            </SaasButton>

            <SaasButton
              saasVariant="outline"
              className={cn(
                "justify-start gap-2 transition-all duration-200",
                metaRetorno.buttonClass
              )}
              onClick={() => goNew("Retorno")}
            >
              <Repeat2 className={cn("h-4 w-4", metaRetorno.iconClass)} /> Retorno
            </SaasButton>

            <SaasButton
              saasVariant="outline"
              className={cn(
                "justify-start gap-2 transition-all duration-200",
                metaEmerg.buttonClass
              )}
              onClick={() => goNew("Emergência")}
            >
              <AlertTriangle className={cn("h-4 w-4", metaEmerg.iconClass)} /> Emergência
            </SaasButton>
          </div>
        </CardContent>
      </Card>

      <Dialog open={consultDialogOpen} onOpenChange={setConsultDialogOpen}>
        <DialogContent className="premium-card rounded-xl">
          <DialogHeader>
            <DialogTitle>Consulta</DialogTitle>
            <DialogDescription>
              Selecione qual modelo de consulta deseja utilizar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SaasButton
              onClick={() => {
                setConsultDialogOpen(false);
                goNew("Consulta");
              }}
            >
              Consulta (Novo Modelo)
            </SaasButton>
            <SaasButton
              saasVariant="outline"
              onClick={() => {
                setConsultDialogOpen(false);
                goNew("Consulta (Modelo Antigo)");
              }}
            >
              Consulta (Modelo Antigo)
            </SaasButton>
          </div>
          <DialogFooter>
            <SaasButton
              saasVariant="outline"
              onClick={() => setConsultDialogOpen(false)}
            >
              Cancelar
            </SaasButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="premium-card rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            Histórico de atendimentos
          </CardTitle>
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
                const timeSafe = app.time || "00:00";
                const dateLabel = `${formatDateTime(app.date)} às ${timeSafe}`;

                return (
                  <div
                    key={app.id}
                    className={cn(
                      "rounded-xl border-2 bg-white p-4 transition-all duration-200",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      meta.cardHoverShadowClass,
                      meta.cardBorderClass
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-11 w-11 shrink-0 rounded-2xl border-2 flex items-center justify-center",
                            meta.cardBorderClass,
                            meta.iconWrapBgClass
                          )}
                        >
                          <Icon className={cn("h-5 w-5", meta.iconClass)} />
                        </div>

                        <div className="min-w-0">
                          <div className={cn("text-base font-bold", meta.iconClass)}>
                            {meta.label}
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {summary}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {dateLabel}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                              <UserRound className="h-4 w-4" />
                              {app.vet}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <SaasButton
                          saasVariant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${app.id}`)
                          }
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