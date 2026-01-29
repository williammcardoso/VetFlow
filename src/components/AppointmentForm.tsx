"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";

import SaasButton from "@/components/saas/SaasButton";
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

import { CheckCircle2, MoreHorizontal, Save, Thermometer, Weight, X } from "lucide-react";

import type {
  AppointmentEntry,
  ConsultationDetails,
  EmergencyDetails,
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
import EmergencyForm from "@/components/appointments/forms/EmergencyForm";
import DateInputBR, { isoToBR } from "@/components/appointments/inputs/DateInputBR";
import DatePickerBR from "@/components/appointments/inputs/DatePickerBR";
import LegacyConsultationForm from "@/components/appointments/forms/LegacyConsultationForm";

import AppointmentPdfContent from "@/components/AppointmentPdfContent";
import { removeAppointmentDraft, upsertAppointmentDraft } from "@/lib/appointmentDrafts";

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

const VACCINE_NAME_OPTIONS = [
  "V8 (Óctupla)",
  "V10 (Déctupla)",
  "Antirrábica",
  "Gripe Canina (Tosse dos Canis)",
  "Giardia",
  "Leishmaniose",
  "V3 Felina (Tríplice)",
  "V4 Felina (Quadrúpla)",
  "V5 Felina (Quíntupla)",
  "FeLV (Leucemia Felina)",
  "Outra",
] as const;

const VACCINE_DOSE_OPTIONS = [
  "1ª Dose",
  "2ª Dose",
  "3ª Dose",
  "4ª Dose",
  "Reforço Anual",
  "Dose Única",
] as const;

const VACCINE_APPLICATION_SITE_OPTIONS = [
  "Subcutâneo – Região interescapular",
  "Subcutâneo – Flanco direito",
  "Subcutâneo – Flanco esquerdo",
  "Subcutâneo – Membro posterior direito",
  "Subcutâneo – Membro posterior esquerdo",
  "Intramuscular",
  "Intranasal",
  "Oral",
] as const;

type AllowedType = AppointmentEntry["type"]; // Mantém compatibilidade com tipos legados

const PRIMARY_TYPES: Array<
  Extract<
    AppointmentEntry["type"],
    "Consulta" | "Consulta (Modelo Antigo)" | "Cirurgia" | "Retorno" | "Vacina" | "Emergência"
  >
> = ["Consulta", "Consulta (Modelo Antigo)", "Cirurgia", "Retorno", "Vacina", "Emergência"];

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

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addYearsISO(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setFullYear(dt.getFullYear() + years);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isWithinPhysiologicalTemp(temp?: number | "") {
  if (temp === "" || temp === undefined) return false;
  // Faixa segura (simplificada) para pequenos animais
  return temp >= 37.5 && temp <= 39.2;
}

export default function AppointmentForm({
  animalId,
  clientId,
  initialData,
  onSave,
  onCancel,
  mockAppointments,
}: AppointmentFormProps) {
  const [searchParams] = useSearchParams();

  const errClass = (has?: boolean) =>
    has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const lastWeight = useMemo(
    () => getLastKnownWeight(clientId, animalId),
    [clientId, animalId]
  );

  const isDraftInitial = !!initialData?.id && initialData.id.startsWith("draft-");
  // Se está editando um atendimento existente, o rascunho fica como draft-<idReal>
  const draftIdRef = useRef<string | null>(
    isDraftInitial
      ? initialData!.id
      : initialData?.id
        ? `draft-${initialData.id}`
        : null
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

  // Sinais vitais/medidas
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

  const [consultationMode, setConsultationMode] = useState<ConsultationMode>("simplificado");

  // Estado de UI para "Outra" (não salva no registro)
  const [vaccineNameChoice, setVaccineNameChoice] = useState<string>("");

  const hydratedFromDraftRef = useRef(false);
  const skipTypeResetOnceRef = useRef(!!initialData);

  // Carregar rascunho antigo (compatibilidade) somente na criação por querystring.
  useEffect(() => {
    if (initialData) return;

    const saved = safeParseJSON<any>(localStorage.getItem(`systemvet:appointment:draft:${clientId}:${animalId}`));
    if (saved) {
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
      setConsultationMode(saved.consultationMode || "simplificado");
      return;
    }

    const qsType = searchParams.get("type");
    if (qsType && !type) {
      setType(qsType as AllowedType);
    }
  }, [initialData, clientId, animalId, searchParams, type]);

  // Sincroniza estado do select da vacina (para suportar "Outra" sem mostrar o textbox sempre)
  useEffect(() => {
    if (type !== "Vacina") return;
    const v = (details || {}) as VaccinationDetails;
    const nome = (v.tipoVacina || "").trim();

    const isOption = (VACCINE_NAME_OPTIONS as readonly string[]).includes(nome);
    if (isOption) {
      setVaccineNameChoice(nome);
      return;
    }

    if (nome) {
      setVaccineNameChoice("Outra");
      return;
    }

    setVaccineNameChoice("");
  }, [type, details]);

  // Resetar estrutura específica quando o tipo muda
  useEffect(() => {
    if (!type) return;

    // Evita limpar os campos ao abrir o formulário já em modo edição.
    if (skipTypeResetOnceRef.current) {
      skipTypeResetOnceRef.current = false;
      return;
    }

    if (hydratedFromDraftRef.current) {
      hydratedFromDraftRef.current = false;
      return;
    }

    setErrors({});

    if (type === "Consulta") {
      setConsultationMode("simplificado");
      setDetails({} as ConsultationDetails);
      setPesoAtual(lastWeight ?? "");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Consulta (Modelo Antigo)") {
      setDetails({} as ConsultationDetails);
      setPesoAtual(lastWeight ?? "");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Cirurgia") {
      setDetails({ suturas: [] } as SurgeryDetails);
      setPesoAtual(lastWeight ?? "");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Emergência") {
      setDetails({} as EmergencyDetails);
      setPesoAtual(lastWeight ?? "");
      setTemperaturaCorporal("");
      setFrequenciaCardiaca("");
      setFrequenciaRespiratoria("");
      return;
    }

    if (type === "Vacina") {
      setDetails({} as VaccinationDetails);
      setVaccineNameChoice("");
      setPesoAtual(lastWeight ?? "");
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
  }, [type, lastWeight]);

  // Regras inteligentes (UX) para vacinação
  useEffect(() => {
    if (type !== "Vacina") return;
    const v = (details || {}) as VaccinationDetails;

    const nome = (v.tipoVacina || "").trim();
    const dose = (v.dose || "").trim();

    const isAntiRabica = nome === "Antirrábica";
    const isVSeries =
      nome === "V8 (Óctupla)" ||
      nome === "V10 (Déctupla)" ||
      nome === "V3 Felina (Tríplice)" ||
      nome === "V4 Felina (Quadrúpla)" ||
      nome === "V5 Felina (Quíntupla)";

    if (isAntiRabica) {
      const nextDose = dose ? dose : "Dose Única";
      const nextProxima = v.proximaDose ? v.proximaDose : addYearsISO(date, 1);

      if (nextDose !== dose || nextProxima !== v.proximaDose) {
        setDetails({
          ...v,
          dose: nextDose,
          proximaDose: nextProxima,
        });
      }
      return;
    }

    if (isVSeries && dose === "1ª Dose") {
      const suggested = v.proximaDose ? v.proximaDose : addDaysISO(date, 28);
      if (suggested !== v.proximaDose) {
        setDetails({ ...v, proximaDose: suggested });
      }
    }
  }, [type, details, date]);

  const buildDraftAppointment = (): AppointmentEntry => {
    const draftId = draftIdRef.current || `draft-${Date.now()}`;
    draftIdRef.current = draftId;

    const isLegacy = !!type && !isPrimaryType(type);
    const isOldConsult = type === "Consulta (Modelo Antigo)";

    const shouldKeepVitals =
      type === "Consulta" ||
      isOldConsult ||
      type === "Cirurgia" ||
      type === "Emergência" ||
      type === "Vacina" ||
      isLegacy;
    const shouldKeepCardioVitals =
      isOldConsult || type === "Cirurgia" || type === "Emergência" || isLegacy;

    const detailsToSave: AppointmentEntry["details"] =
      type === "Vacina"
        ? ({
            ...(details as VaccinationDetails),
            profissionalAplicou: (details as VaccinationDetails).profissionalAplicou || vet,
          } as VaccinationDetails)
        : details;

    return {
      id: draftId,
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
      details: detailsToSave,
    };
  };

  const upsertDraftNow = () => {
    const draftAppointment = buildDraftAppointment();
    // salvar somente se houver algo para preservar
    const hasAny =
      !!draftAppointment.type ||
      !!draftAppointment.vet ||
      !!draftAppointment.observacoesGerais ||
      Object.keys((draftAppointment.details || {}) as any).length > 0;

    if (!hasAny) return;

    upsertAppointmentDraft(clientId, animalId, {
      id: draftAppointment.id,
      animalId,
      clientId,
      updatedAtISO: new Date().toISOString(),
      appointment: draftAppointment,
    });
  };

  // Auto-salvar rascunho a cada 1 minuto + na desmontagem
  useEffect(() => {
    const t = window.setInterval(() => {
      upsertDraftNow();
    }, 60_000);

    return () => {
      window.clearInterval(t);
      upsertDraftNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, animalId, date, time, type, vet, administrativeNote, pesoAtual, temperaturaCorporal, frequenciaCardiaca, frequenciaRespiratoria, details]);

  const handleCancelClick = () => {
    const hasDraft = !!draftIdRef.current;
    const msg = hasDraft
      ? "Cancelar sem salvar? As alterações serão perdidas."
      : "Cancelar e voltar para o prontuário?";

    const ok = window.confirm(msg);
    if (!ok) return;

    if (draftIdRef.current) {
      removeAppointmentDraft(clientId, animalId, draftIdRef.current);
    }

    onCancel();
  };

  const handleSave = () => {
    const nextErrors: Record<string, boolean> = {};

    if (!date) nextErrors.date = true;
    if (!time) nextErrors.time = true;
    if (!type) nextErrors.type = true;
    if (!vet) nextErrors.vet = true;

    if (type === "Consulta" || type === "Consulta (Modelo Antigo)") {
      const c = details as ConsultationDetails;
      if (!c.queixaPrincipal || !c.queixaPrincipal.trim()) {
        nextErrors.queixaPrincipal = true;
      }

      const hasAnyDiagnosis = !!(
        (c.suspeitaDiagnostica && c.suspeitaDiagnostica.trim()) ||
        (c.diagnosticoPresuntivo && c.diagnosticoPresuntivo.trim()) ||
        (c.diagnosticoDefinitivo && c.diagnosticoDefinitivo.trim())
      );
      if (!hasAnyDiagnosis) {
        nextErrors.diagnostico = true;
      }
    }

    if (type === "Cirurgia") {
      const s = details as SurgeryDetails;
      if (!s.procedimentoRealizado || !s.procedimentoRealizado.trim()) {
        nextErrors.procedimentoRealizado = true;
      }
    }

    if (type === "Emergência") {
      const e = details as EmergencyDetails;
      if (!e.condicaoGeral) {
        nextErrors.condicaoGeral = true;
      }
    }

    if (type === "Retorno") {
      const r = details as ReturnDetails;
      if (!r.atendimentoOrigemId) nextErrors.atendimentoOrigemId = true;
      if (!r.motivoRetorno || !r.motivoRetorno.trim()) nextErrors.motivoRetorno = true;
    }

    if (type === "Vacina") {
      const v = details as VaccinationDetails;
      if (!v.tipoVacina || !v.tipoVacina.trim()) nextErrors.tipoVacina = true;
      if (!v.lote || !v.lote.trim()) nextErrors.lote = true;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Preencha os campos obrigatórios destacados em vermelho.");
      return;
    }

    setErrors({});

    // Se existe um draft em andamento, reaproveita o id do draft.
    const draftId = draftIdRef.current;

    const isLegacy = !!type && !isPrimaryType(type);
    const isOldConsult = type === "Consulta (Modelo Antigo)";
    const shouldKeepVitals =
      type === "Consulta" ||
      isOldConsult ||
      type === "Cirurgia" ||
      type === "Emergência" ||
      type === "Vacina" ||
      isLegacy;
    const shouldKeepCardioVitals =
      isOldConsult || type === "Cirurgia" || type === "Emergência" || isLegacy;

    const detailsToSave: AppointmentEntry["details"] =
      type === "Vacina"
        ? ({
            ...(details as VaccinationDetails),
            profissionalAplicou: (details as VaccinationDetails).profissionalAplicou || vet,
          } as VaccinationDetails)
        : details;

    const newAppointment: AppointmentEntry = {
      id: draftId || initialData?.id || `app-${Date.now()}`,
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
      details: detailsToSave,
    };

    onSave(newAppointment);

    // Atualizar peso do animal (se informado)
    if (newAppointment.pesoAtual !== undefined && !String(newAppointment.id).startsWith("draft-")) {
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
    const shouldKeepVitals =
      type === "Consulta" || type === "Cirurgia" || type === "Emergência" || type === "Vacina" || isLegacy;
    const shouldKeepCardioVitals = type === "Cirurgia" || type === "Emergência" || isLegacy;

    const detailsForPdf: AppointmentEntry["details"] =
      type === "Vacina"
        ? ({
            ...(details as VaccinationDetails),
            profissionalAplicou: (details as VaccinationDetails).profissionalAplicou || vet,
          } as VaccinationDetails)
        : details;

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
      details: detailsForPdf,
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
          errors={errors}
          onClearError={clearError}
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
          errors={errors}
          onClearError={clearError}
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
          errors={errors}
          onClearError={clearError}
        />
      );
    }

    if (type === "Emergência") {
      return (
        <EmergencyForm
          pesoAtual={pesoAtual}
          onPesoAtualChange={setPesoAtual}
          temperaturaCorporal={temperaturaCorporal}
          onTemperaturaCorporalChange={setTemperaturaCorporal}
          frequenciaCardiaca={frequenciaCardiaca}
          onFrequenciaCardiacaChange={setFrequenciaCardiaca}
          frequenciaRespiratoria={frequenciaRespiratoria}
          onFrequenciaRespiratoriaChange={setFrequenciaRespiratoria}
          details={details as EmergencyDetails}
          onDetailsChange={(next) => setDetails(next)}
          errors={errors}
          onClearError={clearError}
        />
      );
    }

    if (type === "Vacina") {
      const v = (details || {}) as VaccinationDetails;
      const tempOk = isWithinPhysiologicalTemp(temperaturaCorporal);

      const doseValue = (v.dose || "").trim();
      const localValue = (v.localAplicacao || "").trim();

      return (
        <div className="space-y-4">
          {/* Seção: Avaliação Pré-Vacinal */}
          <Card className="rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-amber-950">
                Avaliação Pré-Vacinal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temp">Temperatura (°C)</Label>
                  <div className="relative">
                    <Thermometer className="absolute left-3 top-2.5 h-4 w-4 text-amber-700/80" />
                    <Input
                      id="temp"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="Ex: 38.5"
                      value={temperaturaCorporal}
                      onChange={(e) =>
                        setTemperaturaCorporal(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="pl-9 bg-white border-amber-200 focus-visible:ring-amber-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="peso">Peso (kg)</Label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-2.5 h-4 w-4 text-amber-700/80" />
                    <Input
                      id="peso"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="Peso atual"
                      value={pesoAtual}
                      onChange={(e) => setPesoAtual(e.target.value === "" ? "" : Number(e.target.value))}
                      className="pl-9 bg-white border-amber-200 focus-visible:ring-amber-300"
                    />
                  </div>
                </div>
              </div>

              {tempOk ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Animal está saudável para vacinar
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="anamnese">Anamnese Pré-Vacinal</Label>
                <Textarea
                  id="anamnese"
                  placeholder="Estado geral, alimentação, comportamento..."
                  value={v.anamnesePreVacinal || ""}
                  onChange={(e) => setDetails({ ...v, anamnesePreVacinal: e.target.value })}
                  rows={4}
                  className="bg-white border-amber-200 focus-visible:ring-amber-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção: Dados da Vacina */}
          <Card className="premium-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Dados da Vacina</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Vacina *</Label>
                <Select
                  value={vaccineNameChoice}
                  onValueChange={(val) => {
                    clearError("tipoVacina");
                    setVaccineNameChoice(val);
                    if (val !== "Outra") {
                      setDetails({ ...v, tipoVacina: val });
                    } else {
                      // mantém tipoVacina para digitação manual (input abaixo)
                      setDetails({ ...v, tipoVacina: (v.tipoVacina || "").trim() });
                    }
                  }}
                >
                  <SelectTrigger className={errClass(errors.tipoVacina)}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VACCINE_NAME_OPTIONS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {vaccineNameChoice === "Outra" ? (
                  <Input
                    className={errClass(errors.tipoVacina)}
                    value={v.tipoVacina || ""}
                    onChange={(e) => {
                      clearError("tipoVacina");
                      setDetails({ ...v, tipoVacina: e.target.value });
                    }}
                    placeholder="Digite o nome da vacina"
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Dose</Label>
                <Select
                  value={doseValue}
                  onValueChange={(val) => setDetails({ ...v, dose: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VACCINE_DOSE_OPTIONS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome comercial</Label>
                <Input
                  value={v.nomeComercial || ""}
                  onChange={(e) => setDetails({ ...v, nomeComercial: e.target.value })}
                  placeholder="Ex: Recombitek, Vanguard"
                />
              </div>

              <div className="space-y-2">
                <Label>Fabricante</Label>
                <Input
                  value={v.fabricante || ""}
                  onChange={(e) => setDetails({ ...v, fabricante: e.target.value })}
                  placeholder="Ex: Zoetis, MSD"
                />
              </div>

              <div className="space-y-2">
                <Label>Lote *</Label>
                <Input
                  className={errClass(errors.lote)}
                  value={v.lote || ""}
                  onChange={(e) => {
                    clearError("lote");
                    setDetails({ ...v, lote: e.target.value });
                  }}
                  placeholder="Número do lote"
                />
              </div>

              <div className="space-y-2">
                <Label>Validade</Label>
                <DatePickerBR
                  valueISO={v.dataValidade || ""}
                  onChangeISO={(val) => setDetails({ ...v, dataValidade: val || undefined })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção: Aplicação */}
          <Card className="premium-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Aplicação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local de Aplicação</Label>
                <Select
                  value={localValue}
                  onValueChange={(val) => {
                    const via =
                      val.startsWith("Subcutâneo")
                        ? "SC"
                        : val === "Intramuscular"
                          ? "IM"
                          : val === "Intranasal"
                            ? "IN"
                            : val === "Oral"
                              ? "VO"
                              : "";
                    setDetails({ ...v, localAplicacao: val, viaAdministracao: via as any });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VACCINE_APPLICATION_SITE_OPTIONS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Próxima Dose</Label>
                <DatePickerBR
                  valueISO={v.proximaDose || ""}
                  onChangeISO={(val) => setDetails({ ...v, proximaDose: val || undefined })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção: Pós-Vacinação */}
          <Card className="premium-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Pós-Vacinação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Reações Adversas Observadas</Label>
                <Textarea
                  value={v.reacaoAdversaObservada || ""}
                  onChange={(e) => setDetails({ ...v, reacaoAdversaObservada: e.target.value })}
                  rows={3}
                  placeholder='Descreva qualquer reação observada (ou "Nenhuma")...'
                />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (type === "Retorno") {
      const r = details as ReturnDetails;
      const animalAppointmentsForSelect = mockAppointments.filter((app) => app.animalId === animalId);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="atendimentoOrigemId">Atendimento de origem *</Label>
            <Select
              value={r.atendimentoOrigemId || ""}
              onValueChange={(val) => {
                clearError("atendimentoOrigemId");
                setDetails({ ...r, atendimentoOrigemId: val });
              }}
            >
              <SelectTrigger id="atendimentoOrigemId" className={errClass(errors.atendimentoOrigemId)}>
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
            <Label htmlFor="motivoRetorno">Motivo do retorno *</Label>
            <Input
              id="motivoRetorno"
              className={errClass(errors.motivoRetorno)}
              value={r.motivoRetorno || ""}
              onChange={(e) => {
                clearError("motivoRetorno");
                setDetails({ ...r, motivoRetorno: e.target.value });
              }}
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
              : type === "Emergência"
                ? "Emergência"
                : type;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6 pb-24"
    >
      {/* Dados administrativos */}
      <Card className="premium-card rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Dados gerais do atendimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data do atendimento *</Label>
            <DateInputBR
              id="date"
              valueISO={date}
              onChangeISO={(v) => {
                clearError("date");
                setDate(v);
              }}
              required
              className={errClass(errors.date)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Hora do atendimento *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              className={errClass(errors.time)}
              onChange={(e) => {
                clearError("time");
                setTime(e.target.value);
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de atendimento *</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                clearError("type");
                setType(v as AllowedType);
              }}
            >
              <SelectTrigger id="type" className={errClass(errors.type)}>
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
              className={errClass(errors.vet)}
              onChange={(e) => {
                clearError("vet");
                setVet(e.target.value);
              }}
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

      {/* Formulário dinâmico */}
      {type ? (
        <Card className="premium-card rounded-xl">
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

      {/* Rodapé fixo de ações */}
      <div className="sticky bottom-0 z-10 -mx-6 px-6 py-4 border-t border-border bg-background/90 backdrop-blur">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <SaasButton type="button" saasVariant="outline" onClick={handleCancelClick} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" /> Cancelar
          </SaasButton>

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
            </DropdownMenuContent>
          </DropdownMenu>

          <SaasButton type="submit" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> Salvar atendimento
          </SaasButton>
        </div>
      </div>
    </form>
  );
}