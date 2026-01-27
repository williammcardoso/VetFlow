"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreHorizontal, Save, X } from "lucide-react";

import type {
  AppointmentEntry,
  ConsultationDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
} from "@/types/appointment";
import { mockUserSettings } from "@/mockData/settings";
import { mockClients, updateAnimalDetails } from "@/mockData/clients";

import ConsultationClinicalForm, {
  type ConsultationMode,
} from "@/components/appointments/forms/ConsultationClinicalForm";
import SurgeryForm from "@/components/appointments/forms/SurgeryForm";
import DateInputBR, { isoToBR } from "@/components/appointments/inputs/DateInputBR";
import LegacyConsultationForm from "@/components/appointments/forms/LegacyConsultationForm";

import AttachmentsSection, {
  type Attachment,
} from "@/components/appointments/forms/AttachmentsSection";

import AppointmentPdfContent from "@/components/AppointmentPdfContent";

interface AppointmentFormProps {
  animalId: string;
  clientId: string;
  initialData?: AppointmentEntry;
  onSave: (appointment: AppointmentEntry) => void;
  onCancel: () => void;
  mockAppointments: AppointmentEntry[];
}

const mockVets = [
  { id: "1", name: "Dr. William Cardoso" },
  { id: "2", name: "Dra. Ana Paula" },
  { id: "3", name: "Dr. Carlos Eduardo" },
];

const draftKey = (clientId: string, animalId: string) =>
  `systemvet:appointment:draft:${clientId}:${animalId}`;

type AllowedType = AppointmentEntry["type"]; // Mantém compatibilidade com tipos legados

const PRIMARY_TYPES: Array<
  Extract<
    AppointmentEntry["type"],
    "Consulta" | "Consulta (Modelo Antigo)" | "Cirurgia" | "Retorno" | "Vacina"
  >
> = ["Consulta", "Consulta (Modelo Antigo)", "Cirurgia", "Retorno", "Vacina"];

const isPrimaryType = (t: AppointmentEntry["type"]) => (PRIMARY_TYPES as string[]).includes(t);

function safeParseJSON<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function getLastKnownWeight(clientId: string, animalId: string): number | undefined {
  const client = mockClients.find((c) => c.id === clientId);
  const animal = client?.animals.find((a) => a.id === animalId);
  if (!animal) return undefined;

  // Preferir histórico se existir
  const history = (animal as any).weightHistory as
    | { date: string; time?: string; weight: number }[]
    | undefined;

  if (history && history.length > 0) {
    const sorted = [...history].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
    return sorted[0]?.weight;
  }

  return (animal as any).weight as number | undefined;
}

export default function AppointmentForm({
  animalId,
  clientId,
  initialData,
  onSave,
  onCancel,
  mockAppointments,
}: AppointmentFormProps) {
  const lastWeight = useMemo(
    () => getLastKnownWeight(clientId, animalId),
    [clientId, animalId]
  );

  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(
    initialData?.time ||
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
  const [type, setType] = useState<AllowedType>((initialData?.type as AllowedType) || "");
  const [vet, setVet] = useState(initialData?.vet || mockUserSettings.userName);
  const [administrativeNote, setAdministrativeNote] = useState(
    initialData?.observacoesGerais || ""
  );

  // Sinais vitais/medidas (aparecem apenas após seleção do tipo e apenas nos fluxos que usam)
  const [pesoAtual, setPesoAtual] = useState<number | "">(initialData?.pesoAtual ?? "");
  const [temperaturaCorporal, setTemperaturaCorporal] = useState<number | "">(
    initialData?.temperaturaCorporal ?? ""
  );
  const [frequenciaCardiaca, setFrequenciaCardiaca] = useState<number | "">(
    initialData?.frequenciaCardiaca ?? ""
  );
  const [frequenciaRespiratoria, setFrequenciaRespiratoria] = useState<number | "">(
    initialData?.frequenciaRespiratoria ?? ""
  );

  const [details, setDetails] = useState<AppointmentEntry["details"]>(
    (initialData?.details as any) || {}
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    (initialData?.attachments as any) || []
  );

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>("simplificado");

  const hydratedFromDraftRef = useRef(false);

  // Carregar rascunho (apenas em criação)
  useEffect(() => {
    if (initialData) return;
    const saved = safeParseJSON<any>(localStorage.getItem(draftKey(clientId, animalId)));
    if (!saved) return;

    hydratedFromDraftRef.current = true;

    setDate(saved.date || new Date().toISOString().split("T")[0]);
    setTime(
      saved.time ||
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
    setType(saved.type || "");
    setVet(saved.vet || mockUserSettings.userName);
    setAdministrativeNote(saved.administrativeNote || "");

    setPesoAtual(saved.pesoAtual ?? "");
    setTemperaturaCorporal(saved.temperaturaCorporal ?? "");
    setFrequenciaCardiaca(saved.frequenciaCardiaca ?? "");
    setFrequenciaRespiratoria(saved.frequenciaRespiratoria ?? "");

    setDetails(saved.details || {});
    setAttachments(saved.attachments || []);
    setConsultationMode(saved.consultationMode || "simplificado");
  }, [initialData, clientId, animalId]);

  // Resetar estrutura específica quando o tipo muda (exceto quando o tipo veio do rascunho)
  useEffect(() => {
    if (!type) return;
    if (hydratedFromDraftRef.current) {
      hydratedFromDraftRef.current = false;
      return;
    }

    // Ao trocar de tipo, reconstruir apenas o bloco abaixo do administrativo
    if (type === "Consulta") {
      setConsultationMode("simplificado");
      setDetails({} as ConsultationDetails);
      setPesoAtual(initialData?.type === "Consulta" ? initialData.pesoAtual ?? "" : lastWeight ?? "");
      setTemperaturaCorporal(
        initialData?.type === "Consulta" ? initialData.temperaturaCorporal ?? "" : ""
      );
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Consulta (Modelo Antigo)") {
      setDetails({} as ConsultationDetails);
      setPesoAtual(
        initialData?.type === "Consulta (Modelo Antigo)"
          ? initialData.pesoAtual ?? ""
          : lastWeight ?? ""
      );
      setTemperaturaCorporal(
        initialData?.type === "Consulta (Modelo Antigo)"
          ? initialData.temperaturaCorporal ?? ""
          : ""
      );
      setFrequenciaCardiaca(
        initialData?.type === "Consulta (Modelo Antigo)"
          ? initialData.frequenciaCardiaca ?? ""
          : ""
      );
      setFrequenciaRespiratoria(
        initialData?.type === "Consulta (Modelo Antigo)"
          ? initialData.frequenciaRespiratoria ?? ""
          : ""
      );
      return;
    }

    if (type === "Cirurgia") {
      setDetails({ suturas: [] } as SurgeryDetails);
      setPesoAtual(initialData?.type === "Cirurgia" ? initialData.pesoAtual ?? "" : lastWeight ?? "");
      setTemperaturaCorporal(
        initialData?.type === "Cirurgia" ? initialData.temperaturaCorporal ?? "" : ""
      );
      setFrequenciaCardiaca(
        initialData?.type === "Cirurgia" ? initialData.frequenciaCardiaca ?? "" : ""
      );
      setFrequenciaRespiratoria(
        initialData?.type === "Cirurgia" ? initialData.frequenciaRespiratoria ?? "" : ""
      );
      return;
    }

    if (type === "Vacina") {
      setDetails({} as VaccinationDetails);
      setPesoAtual("");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Retorno") {
      setDetails({} as ReturnDetails);
      setPesoAtual("");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    // Tipos legados: mantemos o conteúdo atual (sem reconstrução automática)
  }, [type, initialData, lastWeight]);

  const saveDraft = () => {
    const payload = {
      date,
      time,
      type,
      vet,
      administrativeNote,
      pesoAtual,
      temperaturaCorporal,
      frequenciaCardiaca,
      frequenciaRespiratoria,
      details,
      attachments,
      consultationMode,
    };
    localStorage.setItem(draftKey(clientId, animalId), JSON.stringify(payload));
    toast.success("Rascunho salvo.");
  };

  const handleSave = () => {
    if (!date || !time || !type || !vet) {
      toast.error("Preencha: data, hora, tipo e veterinário responsável.");
      return;
    }

    if (type === "Consulta") {
      const c = details as ConsultationDetails;
      if (!c.queixaPrincipal || !c.queixaPrincipal.trim()) {
        toast.error("Na Consulta Clínica (Novo Modelo), a queixa principal é obrigatória.");
        return;
      }
    }

    if (type === "Consulta (Modelo Antigo)") {
      const c = details as ConsultationDetails;
      if (!c.queixaPrincipal || !c.queixaPrincipal.trim()) {
        toast.error("Na Consulta Clínica (Modelo Antigo), a queixa principal é obrigatória.");
        return;
      }
    }

    const isLegacy = !!type && !isPrimaryType(type);
    const isOldConsult = type === "Consulta (Modelo Antigo)";
    const shouldKeepVitals = type === "Consulta" || isOldConsult || type === "Cirurgia" || isLegacy;
    const shouldKeepCardioVitals = isOldConsult || type === "Cirurgia" || isLegacy;

    const newAppointment: AppointmentEntry = {
      id: initialData?.id || `app-${Date.now()}`,
      animalId,
      date,
      time,
      type,
      vet,
      observacoesGerais: administrativeNote.trim() || undefined,
      pesoAtual: shouldKeepVitals && pesoAtual !== "" ? Number(pesoAtual) : undefined,
      temperaturaCorporal:
        shouldKeepVitals && temperaturaCorporal !== "" ? Number(temperaturaCorporal) : undefined,
      frequenciaCardiaca:
        shouldKeepCardioVitals && frequenciaCardiaca !== "" ? Number(frequenciaCardiaca) : undefined,
      frequenciaRespiratoria:
        shouldKeepCardioVitals && frequenciaRespiratoria !== ""
          ? Number(frequenciaRespiratoria)
          : undefined,
      details,
      // Regra: não remover dados existentes. No modelo clássico, apenas ocultamos UI de anexos.
      attachments,
    };

    onSave(newAppointment);
    localStorage.removeItem(draftKey(clientId, animalId));

    // Atualizar peso do animal (se informado)
    if (newAppointment.pesoAtual !== undefined) {
      const currentClient = mockClients.find((c) => c.id === clientId);
      const currentAnimal = currentClient?.animals.find((a) => a.id === animalId);
      const currentWeight = (currentAnimal as any)?.weight as number | undefined;

      if (currentAnimal && currentWeight !== newAppointment.pesoAtual) {
        updateAnimalDetails(clientId, animalId, {
          weight: newAppointment.pesoAtual,
          lastWeightSource: "Atendimento",
        });
      }
    }
  };

  const generatePdf = async () => {
    if (!date || !time || !type || !vet) {
      toast.error("Para gerar PDF, preencha: data, hora, tipo e veterinário.");
      return;
    }

    const isLegacy = !!type && !isPrimaryType(type);
    const shouldKeepVitals = type === "Consulta" || type === "Cirurgia" || isLegacy;
    const shouldKeepCardioVitals = type === "Cirurgia" || isLegacy;

    const appointmentForPdf: AppointmentEntry = {
      id: initialData?.id || `tmp-${Date.now()}`,
      animalId,
      date,
      time,
      type,
      vet,
      observacoesGerais: administrativeNote.trim() || undefined,
      pesoAtual: shouldKeepVitals && pesoAtual !== "" ? Number(pesoAtual) : undefined,
      temperaturaCorporal:
        shouldKeepVitals && temperaturaCorporal !== "" ? Number(temperaturaCorporal) : undefined,
      frequenciaCardiaca:
        shouldKeepCardioVitals && frequenciaCardiaca !== "" ? Number(frequenciaCardiaca) : undefined,
      frequenciaRespiratoria:
        shouldKeepCardioVitals && frequenciaRespiratoria !== ""
          ? Number(frequenciaRespiratoria)
          : undefined,
      details,
      attachments,
    };

    const client = mockClients.find((c) => c.id === clientId);
    const animal = client?.animals.find((a) => a.id === animalId);

    if (!client || !animal) {
      toast.error("Cliente/animal não encontrados para gerar PDF.");
      return;
    }

    const blob = await pdf(
      <AppointmentPdfContent
        appointment={appointmentForPdf}
        clientName={client.name}
        animalName={animal.name}
        animalSpecies={animal.species}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const renderTypeSpecific = () => {
    if (!type) return null;

    if (type === "Consulta") {
      return (
        <ConsultationClinicalForm
          dateISO={date}
          mode={consultationMode}
          onModeChange={setConsultationMode}
          pesoAtual={pesoAtual}
          onPesoAtualChange={setPesoAtual}
          temperaturaCorporal={temperaturaCorporal}
          onTemperaturaCorporalChange={setTemperaturaCorporal}
          details={details as ConsultationDetails}
          onDetailsChange={(next) => setDetails(next)}
        />
      );
    }

    if (type === "Consulta (Modelo Antigo)") {
      return (
        <LegacyConsultationForm
          dateISO={date}
          pesoAtual={pesoAtual}
          onPesoAtualChange={setPesoAtual}
          temperaturaCorporal={temperaturaCorporal}
          onTemperaturaCorporalChange={setTemperaturaCorporal}
          frequenciaCardiaca={frequenciaCardiaca}
          onFrequenciaCardiacaChange={setFrequenciaCardiaca}
          frequenciaRespiratoria={frequenciaRespiratoria}
          onFrequenciaRespiratoriaChange={setFrequenciaRespiratoria}
          details={details as ConsultationDetails}
          onDetailsChange={(next) => setDetails(next)}
        />
      );
    }

    if (type === "Cirurgia") {
      return (
        <SurgeryForm
          appointmentDateISO={date}
          vetResponsavel={vet}
          pesoAtual={pesoAtual}
          onPesoAtualChange={setPesoAtual}
          temperaturaCorporal={temperaturaCorporal}
          onTemperaturaCorporalChange={setTemperaturaCorporal}
          frequenciaCardiaca={frequenciaCardiaca}
          onFrequenciaCardiacaChange={setFrequenciaCardiaca}
          frequenciaRespiratoria={frequenciaRespiratoria}
          onFrequenciaRespiratoriaChange={setFrequenciaRespiratoria}
          details={details as SurgeryDetails}
          onDetailsChange={(next) => setDetails(next)}
        />
      );
    }

    if (type === "Vacina") {
      const v = details as VaccinationDetails;
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipoVacina">Tipo de vacina</Label>
            <Input
              id="tipoVacina"
              value={v.tipoVacina || ""}
              onChange={(e) => setDetails({ ...v, tipoVacina: e.target.value })}
              placeholder="Ex.: Polivalente, Antirrábica"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nomeComercial">Nome comercial</Label>
            <Input
              id="nomeComercial"
              value={v.nomeComercial || ""}
              onChange={(e) => setDetails({ ...v, nomeComercial: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lote">Lote</Label>
            <Input
              id="lote"
              value={v.lote || ""}
              onChange={(e) => setDetails({ ...v, lote: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fabricante">Fabricante</Label>
            <Input
              id="fabricante"
              value={v.fabricante || ""}
              onChange={(e) => setDetails({ ...v, fabricante: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataFabricacao">Data de fabricação</Label>
            <DateInputBR
              id="dataFabricacao"
              valueISO={v.dataFabricacao || ""}
              onChangeISO={(val) => setDetails({ ...v, dataFabricacao: val || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataValidade">Data de validade</Label>
            <DateInputBR
              id="dataValidade"
              valueISO={v.dataValidade || ""}
              onChangeISO={(val) => setDetails({ ...v, dataValidade: val || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doseAplicada">Dose (mL)</Label>
            <Input
              id="doseAplicada"
              type="number"
              step="0.1"
              value={v.doseAplicada ?? ""}
              onChange={(e) =>
                setDetails({
                  ...v,
                  doseAplicada: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viaAdministracao">Via de administração</Label>
            <Select
              value={(v.viaAdministracao as any) || ""}
              onValueChange={(val) => setDetails({ ...v, viaAdministracao: val as any })}
            >
              <SelectTrigger id="viaAdministracao">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SC">Subcutânea (SC)</SelectItem>
                <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                <SelectItem value="VO">Via oral (VO)</SelectItem>
                <SelectItem value="IN">Intranasal (IN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="localAplicacao">Local de aplicação</Label>
            <Input
              id="localAplicacao"
              value={v.localAplicacao || ""}
              onChange={(e) => setDetails({ ...v, localAplicacao: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="reacao">Reação adversa observada</Label>
            <Textarea
              id="reacao"
              value={v.reacaoAdversaObservada || ""}
              onChange={(e) => setDetails({ ...v, reacaoAdversaObservada: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      );
    }

    if (type === "Retorno") {
      const r = details as ReturnDetails;
      const animalAppointmentsForSelect = mockAppointments.filter((app) => app.animalId === animalId);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="atendimentoOrigemId">Atendimento de origem</Label>
            <Select
              value={r.atendimentoOrigemId || ""}
              onValueChange={(val) => setDetails({ ...r, atendimentoOrigemId: val })}
            >
              <SelectTrigger id="atendimentoOrigemId">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {animalAppointmentsForSelect.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {isoToBR(app.date)} • {app.type} • {app.vet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivoRetorno">Motivo do retorno</Label>
            <Input
              id="motivoRetorno"
              value={r.motivoRetorno || ""}
              onChange={(e) => setDetails({ ...r, motivoRetorno: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="evolucao">Evolução observada</Label>
            <Textarea
              id="evolucao"
              value={r.evolucaoObservada || ""}
              onChange={(e) => setDetails({ ...r, evolucaoObservada: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="novoDiag">Novo diagnóstico / conduta</Label>
            <Textarea
              id="novoDiag"
              value={r.novoDiagnosticoConduta || ""}
              onChange={(e) => setDetails({ ...r, novoDiagnosticoConduta: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      );
    }

    // Legado: manter compatibilidade sem expor um formulário gigante.
    const legacyDetails = (details || {}) as Record<string, any>;
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Este tipo de atendimento é <span className="font-medium text-foreground">legado</span>. Para não perder
          informações, você pode revisar/ajustar os campos abaixo.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={pesoAtual}
              onChange={(e) => setPesoAtual(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Temperatura (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperaturaCorporal}
              onChange={(e) => setTemperaturaCorporal(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>FC</Label>
            <Input
              type="number"
              value={frequenciaCardiaca}
              onChange={(e) => setFrequenciaCardiaca(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>FR</Label>
            <Input
              type="number"
              value={frequenciaRespiratoria}
              onChange={(e) => setFrequenciaRespiratoria(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição clínica</Label>
            <Textarea
              value={(legacyDetails.historicoClinico as string) || ""}
              onChange={(e) => setDetails({ ...legacyDetails, historicoClinico: e.target.value } as any)}
              rows={4}
              placeholder="Registre aqui a descrição clínica do atendimento legado."
            />
          </div>
        </div>
      </div>
    );
  };

  const typeLabel =
    type === "Consulta"
      ? "Consulta Clínica (Novo Modelo)"
      : type === "Consulta (Modelo Antigo)"
        ? "Consulta Clínica (Modelo Antigo)"
        : type === "Cirurgia"
          ? "Cirurgia"
          : type === "Retorno"
            ? "Retorno"
            : type === "Vacina"
              ? "Vacinação"
              : type;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6 pb-24"
    >
      {/* ETAPA 1 — Dados administrativos (sem campos clínicos) */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Dados gerais do atendimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data do atendimento *</Label>
            <DateInputBR id="date" valueISO={date} onChangeISO={setDate} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Hora do atendimento *</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de atendimento *</Label>
            <Select value={type} onValueChange={(v) => setType(v as AllowedType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "Consulta"
                      ? "Consulta Clínica (Novo Modelo)"
                      : t === "Consulta (Modelo Antigo)"
                        ? "Consulta Clínica (Modelo Antigo)"
                        : t === "Vacina"
                          ? "Vacinação"
                          : t}
                  </SelectItem>
                ))}

                {/* Compatibilidade: exibir o tipo atual se for legado */}
                {!!type && !isPrimaryType(type) && (
                  <SelectItem value={type}>{`${type} (legado)`}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vet">Veterinário responsável *</Label>
            <Input
              id="vet"
              list="systemvet-vets"
              value={vet}
              onChange={(e) => setVet(e.target.value)}
              placeholder="Selecione ou digite"
              required
            />
            <datalist id="systemvet-vets">
              {mockVets.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">Padrão: usuário logado. Você pode trocar manualmente.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="adminNote">Nota administrativa rápida (opcional)</Label>
            <Input
              id="adminNote"
              value={administrativeNote}
              onChange={(e) => setAdministrativeNote(e.target.value)}
              placeholder="Ex.: Tutor com pressa, retorno por WhatsApp, pendência financeira..."
              maxLength={160}
            />
          </div>
        </CardContent>
      </Card>

      {/* ETAPA 2 — Formulário dinâmico por tipo */}
      {type ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{typeLabel}</CardTitle>
          </CardHeader>
          <CardContent>{renderTypeSpecific()}</CardContent>
        </Card>
      ) : (
        <div className="text-sm text-muted-foreground">
          Selecione o tipo de atendimento para carregar a ficha clínica correspondente.
        </div>
      )}

      {/* Anexos (somente após seleção do tipo) */}
      {type && type !== "Consulta" && <AttachmentsSection attachments={attachments} onChange={setAttachments} />}

      {/* Rodapé fixo de ações */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-4 border-t border-border bg-background/90 backdrop-blur">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>

          <Button type="button" variant="secondary" onClick={saveDraft} className="w-full sm:w-auto">
            Salvar rascunho
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                <MoreHorizontal className="h-4 w-4 mr-2" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => generatePdf()}>
                Gerar PDF do atendimento
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/clients/${clientId}/animals/${animalId}/add-prescription`}>
                  Gerar prescrição
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="submit" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Salvar atendimento
          </Button>
        </div>
      </div>
    </form>
  );
}