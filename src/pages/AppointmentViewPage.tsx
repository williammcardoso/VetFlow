"use client";

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import SaasButton from "@/components/saas/SaasButton";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import AppointmentPdfContent from "@/components/AppointmentPdfContent";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Clipboard,
  Edit,
  FileText,
  Scissors,
  Stethoscope,
} from "lucide-react";

import type {
  AppointmentEntry,
  ConsultationDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
} from "@/types/appointment";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { usePatientRouteParams } from "@/hooks/usePatientRouteParams";
import { getPatientRecordPath, getPatientSubPath } from "@/utils/patientDisplayId";
import { getAppointmentById, getAppointmentsByAnimal } from "@/lib/appointmentsApi";

const formatDateBR = (dateISO?: string) => {
  if (!dateISO) return "-";
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
};

const formatDateTimeBR = (dateISO?: string, time?: string) => {
  if (!dateISO) return "-";
  return `${formatDateBR(dateISO)}${time ? ` • ${time}` : ""}`;
};

const renderField = (label: string, value: any) => {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  const text = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "boolean"
      ? value
        ? "Sim"
        : "Não"
      : String(value);

  const isMultiline = text.includes("\n");

  if (isMultiline) {
    return (
      <div className="text-sm">
        <div className="font-medium text-foreground mb-0.5">{label}</div>
        <div className="text-muted-foreground whitespace-pre-wrap">{text}</div>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span>{" "}
      <span className="whitespace-pre-wrap">{text}</span>
    </div>
  );
};

const typeLabel = (t: AppointmentEntry["type"]) => {
  if (t === "Consulta") return "Consulta Clínica (Novo Modelo)";
  if (t === "Consulta (Modelo Antigo)") return "Consulta Clínica (Modelo Antigo)";
  if (t === "Vacina") return "Vacinação";
  return t;
};

export default function AppointmentViewPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { clientId, animalId } = usePatientRouteParams();
  const navigate = useNavigate();

  const { data: client, isLoading: isClientLoading } = useClientWithAnimals(clientId);
  const animal = client?.animals.find((a) => a.id === animalId);

  const [appointment, setAppointment] = useState<AppointmentEntry | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [originAppointment, setOriginAppointment] = useState<AppointmentEntry | null>(null);
  const [originResolved, setOriginResolved] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!appointmentId || !animalId) {
      setAppointment(null);
      setLoadingAppointment(false);
      return;
    }
    let cancelled = false;
    setLoadingAppointment(true);
    (async () => {
      let appt = await getAppointmentById(appointmentId);
      if (!appt) {
        const list = await getAppointmentsByAnimal(animalId);
        appt = list.find((a) => a.id === appointmentId) ?? null;
      }
      if (cancelled) return;
      if (appt && appt.animalId !== animalId) {
        setAppointment(null);
      } else {
        setAppointment(appt);
      }
      setLoadingAppointment(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, animalId]);

  useEffect(() => {
    if (!appointment || appointment.type !== "Retorno" || !animalId) {
      setOriginAppointment(null);
      setOriginResolved(true);
      return;
    }
    const d = appointment.details as ReturnDetails;
    const oid = d?.atendimentoOrigemId;
    if (!oid) {
      setOriginAppointment(null);
      setOriginResolved(true);
      return;
    }
    let cancelled = false;
    setOriginResolved(false);
    (async () => {
      let origin = await getAppointmentById(oid);
      if (!origin) {
        const list = await getAppointmentsByAnimal(animalId);
        origin = list.find((a) => a.id === oid) ?? null;
      }
      if (!cancelled) {
        setOriginAppointment(origin);
        setOriginResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointment, animalId]);

  if (isClientLoading || loadingAppointment) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  if (!client || !animal || !appointment) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Atendimento não encontrado.</h1>
        <Link to={getPatientRecordPath(clientId, animalId, animal?.patientCode)}>
          <SaasButton saasVariant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Prontuário
          </SaasButton>
        </Link>
      </div>
    );
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await createPdfBlob(
        <AppointmentPdfContent
          appointment={appointment}
          clientName={client.name}
          animalName={animal.name}
          animalSpecies={animal.species}
        />
      );
      await openPdf({
        blob,
        fileName: `atendimento_${animal.name}_${appointment.date}.pdf`,
        persistOptions: { folder: "appointments" },
      });
    } catch {
      toast.error("Erro ao gerar PDF do atendimento.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderTypeDetails = () => {
    if (appointment.type === "Consulta" || appointment.type === "Consulta (Modelo Antigo)") {
      const d = appointment.details as ConsultationDetails;
      const vacStatus = d.vacinacaoEmDia || d.vacinacaoPaciente;
      const mucosasFallback = (d.mucosasResumo as any) || (d.mucosas as any);
      const isOld = appointment.type === "Consulta (Modelo Antigo)";

      const showComplete =
        !isOld &&
        (!!d.sec_digestorio_status ||
          !!d.sec_digestorio_obs ||
          !!d.sec_respiratorio_status ||
          !!d.sec_respiratorio_obs ||
          !!d.sec_cabeca_pescoco_status ||
          !!d.sec_cabeca_pescoco_obs ||
          !!d.sec_torax_abdomen_status ||
          !!d.sec_torax_abdomen_obs ||
          !!d.sec_linfonodos_pele_status ||
          !!d.sec_linfonodos_pele_obs ||
          !!d.observacoesComplementares);

      return (
        <div className="space-y-4">
          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-vf-clinical" /> Queixa e Anamnese
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Queixa principal", d.queixaPrincipal)}
              {renderField("História / evolução", d.historicoClinico)}
              {renderField("Vacinação", vacStatus)}
              {!isOld && renderField("Obs. vacinação", (d as any).vacinacaoEmDiaObs)}
              {renderField("Uso de medicação", d.usoMedicacao)}
              {d.usoMedicacao === "sim" && renderField("Medicação (quais)", d.usoMedicacaoQuais)}
              {renderField("Alergias", d.alergiasPaciente)}
              {d.alergiasPaciente === "sim" && renderField("Alergias (descrição)", d.alergiasPacienteObs)}
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sinais vitais / Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Peso (kg)", appointment.pesoAtual)}
              {renderField("Temperatura (°C)", appointment.temperaturaCorporal)}
              {renderField("FC", appointment.frequenciaCardiaca)}
              {renderField("FR", appointment.frequenciaRespiratoria)}
              {!isOld && renderField("Estado geral", d.estadoGeral)}
              {!isOld && renderField("Mucosas", mucosasFallback)}
              {!isOld && renderField("Hidratação", d.hidratacao)}
              {!isOld &&
                renderField(
                  "Dor",
                  d.dor === "escala" ? `Escala ${d.dorEscala ?? 0}/10` : d.dor
                )}
              {renderField("Observações do exame físico", d.exameFisicoObs)}
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Diagnóstico e Conduta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Suspeita diagnóstica", d.suspeitaDiagnostica)}
              {renderField("Diagnóstico presuntivo", d.diagnosticoPresuntivo)}
              {renderField("Diagnóstico definitivo", d.diagnosticoDefinitivo)}
              {renderField("Diagnósticos diferenciais", d.diagnosticoDiferencial)}
              {renderField("Exames solicitados", d.examesSolicitados)}
              {renderField("Conduta / tratamento", d.condutaTratamento)}
              {renderField("Próximo acompanhamento (dias)", d.retornoRecomendadoEmDias)}
              {renderField("Próximos passos", d.proximosPassos)}

              {showComplete && (
                <div className="pt-3">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="completo">
                      <AccordionTrigger className="text-sm">Exame clínico completo</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {renderField("Sistema digestório", d.sec_digestorio_status)}
                          {renderField("Obs. digestório", d.sec_digestorio_obs)}
                          {renderField("Sistema respiratório", d.sec_respiratorio_status)}
                          {renderField("Obs. respiratório", d.sec_respiratorio_obs)}
                          {renderField("Cabeça e pescoço", d.sec_cabeca_pescoco_status)}
                          {renderField("Obs. cabeça e pescoço", d.sec_cabeca_pescoco_obs)}
                          {renderField("Tórax e abdômen", d.sec_torax_abdomen_status)}
                          {renderField("Obs. tórax e abdômen", d.sec_torax_abdomen_obs)}
                          {renderField("Linfonodos e pele", d.sec_linfonodos_pele_status)}
                          {renderField("Obs. linfonodos e pele", d.sec_linfonodos_pele_obs)}
                          {renderField("Observações complementares", d.observacoesComplementares)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (appointment.type === "Cirurgia") {
      const d = appointment.details as SurgeryDetails;
      return (
        <div className="space-y-4">
          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-4 w-4 text-vf-clinical" /> Dados básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Início", d.horaInicio)}
              {renderField("Término", d.horaTermino)}
              {renderField("Anestesista", d.anestesista)}
              {renderField("Instrumentador", d.instrumentador)}
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Avaliação pré-operatória</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Peso (kg)", appointment.pesoAtual)}
              {renderField("Temperatura (°C)", appointment.temperaturaCorporal)}
              {renderField("FC", appointment.frequenciaCardiaca)}
              {renderField("FR", appointment.frequenciaRespiratoria)}
              {renderField("Mucosas", d.mucosas)}
              {renderField("TPC (s)", d.tpcSeg)}
              {renderField("Estado geral", d.estadoGeral)}
              {renderField("Jejum adequado", d.jejumAdequado)}
              {renderField("Exames pré-op avaliados", d.examesPreOperatoriosAvaliados)}
              {renderField("Observações pré-op", d.observacoesPreOperatorias)}
            </CardContent>
          </Card>

          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Procedimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Procedimento realizado", d.procedimentoRealizado)}
              {renderField("Diagnóstico", d.diagnostico)}
              {renderField("Técnica cirúrgica", d.tecnicaCirurgica)}
              {renderField("Protocolo anestésico", d.protocoloAnestesico)}
              {renderField("Intercorrências", d.intercorrenciaIntraOperatoria)}
              {d.intercorrenciaIntraOperatoria && renderField("Descrição", d.intercorrenciaDescricao)}
            </CardContent>
          </Card>

          {d.suturas && d.suturas.length > 0 && (
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Materiais & suturas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.suturas.map((s) => (
                  <div key={s.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {renderField("Tipo", s.tipo)}
                      {renderField("Calibre", s.calibre)}
                      {renderField("Plano", s.plano)}
                      {renderField("Padrão", s.padrao)}
                      {renderField("Qtd", s.quantidade)}
                    </div>
                    {renderField("Uso/local", s.usoLocal)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pós-operatório e alta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderField("Condição ao final", d.condicaoFinal)}
              {renderField("Prescrição (resumo)", d.prescricaoPosOperatoria)}
              {renderField("Orientações ao tutor", d.orientacoesTutor)}
              {renderField("Complicações imediatas", d.complicacoesImediatas)}
              {renderField("Observações pós-op", d.observacoesPosOperatorias)}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (appointment.type === "Vacina") {
      const d = appointment.details as VaccinationDetails;
      return (
        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vacinação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderField("Vacina", d.tipoVacina)}
            {renderField("Dose", d.dose)}
            {renderField("Local", d.localAplicacao)}
            {renderField("Via", d.viaAdministracao)}
            {renderField("Próxima dose", formatDateBR(d.proximaDose))}
            {renderField("Nome comercial", d.nomeComercial)}
            {renderField("Lote", d.lote)}
            {renderField("Fabricante", d.fabricante)}
            {renderField("Fabricação", formatDateBR(d.dataFabricacao))}
            {renderField("Validade", formatDateBR(d.dataValidade))}
            {renderField("Dose (mL)", d.doseAplicada)}
            {renderField("Reação adversa", d.reacaoAdversaObservada)}
          </CardContent>
        </Card>
      );
    }

    if (appointment.type === "Retorno") {
      const d = appointment.details as ReturnDetails;

      return (
        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Retorno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderField(
              "Atendimento de origem",
              originAppointment
                ? `${formatDateTimeBR(originAppointment.date, originAppointment.time)} • ${originAppointment.type}`
                : d.atendimentoOrigemId
                  ? !originResolved
                    ? "Carregando origem…"
                    : "Registro de origem não encontrado"
                  : undefined
            )}
            {renderField("Motivo", d.motivoRetorno)}
            {renderField("Evolução", d.evolucaoObservada)}
            {renderField("Novo diagnóstico/conduta", d.novoDiagnosticoConduta)}
            {renderField("Próximo acompanhamento (dias)", d.retornoRecomendadoEmDias)}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <PageShell>
      <PageHeader
        title="Detalhes do Atendimento"
        description={`${animal.name} • ${typeLabel(appointment.type)}`}
        icon={Clipboard}
        module="clinical"
        breadcrumb={
          <>
            Painel &gt;{" "}
            <Link to="/clients" className="hover:text-primary">
              Clientes
            </Link>{" "}
            &gt;{" "}
            <Link to={`/clients/${client.id}`} className="hover:text-primary">
              {client.name}
            </Link>{" "}
            &gt;{" "}
            <Link
              to={getPatientRecordPath(clientId, animalId, animal.patientCode)}
              className="hover:text-primary"
            >
              {animal.name}
            </Link>{" "}
            &gt; Detalhes do Atendimento
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <SaasButton
              saasVariant="outline"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              <FileText className="mr-2 h-4 w-4" />
              {generatingPdf ? "Gerando..." : "Gerar PDF"}
            </SaasButton>
            <SaasButton
              saasVariant="outline"
              onClick={() =>
                navigate(getPatientSubPath(clientId ?? "", animalId ?? "", animal?.patientCode, `/edit-appointment/${appointmentId}`))
              }
            >
              <Edit className="mr-2 h-4 w-4" /> Editar
            </SaasButton>
            <Link to={getPatientRecordPath(clientId, animalId, animal.patientCode)}>
              <SaasButton saasVariant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </SaasButton>
            </Link>
          </div>
        }
      />

      <div>
        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações administrativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{typeLabel(appointment.type)}</Badge>
              <Badge variant="outline">{formatDateTimeBR(appointment.date, appointment.time)}</Badge>
              <Badge variant="outline">{appointment.vet}</Badge>
            </div>
            {appointment.observacoesGerais && renderField("Nota administrativa", appointment.observacoesGerais)}
          </CardContent>
        </Card>

        <div className="mt-4">{renderTypeDetails()}</div>
      </div>
    </PageShell>
  );
}