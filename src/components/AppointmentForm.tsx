"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { generateUUID, getTodayLocalISO } from "@/lib/utils";
import { useSystemVets } from "@/hooks/useSystemVets";

import SaasButton from "@/components/saas/SaasButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import WeightInput from "@/components/inputs/WeightInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CheckCircle2, Loader2, MoreHorizontal, Save, Sparkles, Thermometer, Weight, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import type {
  AppointmentEntry,
  ConsultationDetails,
  EmergencyDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
} from "@/types/appointment";
import { mockUserSettings } from "@/mockData/settings";
import { updateAnimalDetails as updateAnimalDetailsInDb } from "@/lib/clientsApi";
import type { Animal } from "@/types/client";
import { useRegistryList } from "@/hooks/useRegistryList";

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
import { buildConsultationContext, fetchAISuggestions, type ChatMessage } from "@/lib/aiAssistant";
import AISuggestionsView from "@/components/AISuggestionsView";
import { createPdfBlob, openPdf } from "@/lib/pdfExport";

interface AppointmentFormProps {
  animalId: string;
  clientId: string;
  clientName?: string;
  animal?: Animal;
  initialData?: AppointmentEntry;
  onSave: (appointment: AppointmentEntry) => void | Promise<void>;
  onCancel: () => void;
  mockAppointments: AppointmentEntry[];
  /** Nome e espécie do animal (opcional), usados pelo assistente de IA */
  animalName?: string;
  animalSpecies?: string;
}


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

function getLastKnownWeight(animal?: Animal): number | undefined {
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
  clientName,
  animal,
  initialData,
  onSave,
  onCancel,
  mockAppointments,
  animalName,
  animalSpecies,
}: AppointmentFormProps) {
  const [searchParams] = useSearchParams();
  const { vets: systemVets } = useSystemVets({ onlyVets: true });
  const { list: vaccinesList } = useRegistryList("vaccines");
  const { list: appointmentTypesList } = useRegistryList("appointmentTypes");

  const errClass = (has?: boolean) =>
    has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const lastWeight = useMemo(
    () => getLastKnownWeight(animal),
    [animal]
  );

  const isDraftInitial = !!initialData?.id && initialData.id.startsWith("draft-");
  /** Um único id de rascunho por sessão (novo atendimento): sobrevive ao Strict Mode via sessionStorage */
  const sessionDraftStorageKey = `systemvet:session-draft-id:${clientId}:${animalId}`;
  const draftIdRef = useRef<string | null>(null);
  if (draftIdRef.current === null) {
    if (isDraftInitial) draftIdRef.current = initialData!.id;
    else if (initialData?.id) draftIdRef.current = `draft-${initialData.id}`;
    else if (typeof sessionStorage !== "undefined") {
      let sid = sessionStorage.getItem(sessionDraftStorageKey);
      if (!sid) {
        sid = `draft-${generateUUID()}`;
        sessionStorage.setItem(sessionDraftStorageKey, sid);
      }
      draftIdRef.current = sid;
    } else {
      draftIdRef.current = `draft-${generateUUID()}`;
    }
  }

  const [date, setDate] = useState(initialData?.date || getTodayLocalISO());
  const [time, setTime] = useState(
    initialData?.time ||
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
  const [type, setType] = useState<AllowedType>((initialData?.type as AllowedType) || "");
  const [vet, setVet] = useState(initialData?.vet || mockUserSettings.userName);
  const [administrativeNote, setAdministrativeNote] = useState(
    initialData?.observacoesGerais || ""
  );

  // Assim que o perfil carrega, assume o nome real do veterinário logado.
  // Só substitui campo vazio ou o nome fixo antigo de mockData/settings —
  // nunca sobrescreve o que o usuário digitou ou um atendimento em edição.
  useEffect(() => {
    if (initialData?.vet) return;
    const primary = systemVets[0];
    if (!primary) return;
    setVet((current) => (!current || current === mockUserSettings.userName ? primary : current));
  }, [systemVets, initialData?.vet]);

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

  // Assistente de IA (consultas) — assistantMessages guarda a conversa
  // inteira (mensagem [0] é o contexto montado automaticamente, não
  // renderizada como "pergunta"; a partir daí alterna resposta da IA e
  // pergunta de acompanhamento do veterinário).
  const [useAssistantIA, setUseAssistantIA] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantFollowUp, setAssistantFollowUp] = useState("");

  // Estado de UI para "Outra" (não salva no registro)
  const [vaccineNameChoice, setVaccineNameChoice] = useState<string>("");

  const hydratedFromDraftRef = useRef(false);
  const skipTypeResetOnceRef = useRef(!!initialData);
  const suppressDraftWriteRef = useRef(false);

  // Carregar rascunho antigo (compatibilidade) somente na criação por querystring.
  useEffect(() => {
    if (initialData) return;

    const qsType = searchParams.get("type");
    // Se o tipo veio por querystring (atalhos de Novo atendimento), ele sempre tem prioridade.
    // Importante: também impede que o rascunho legado sobrescreva o tipo após o primeiro render.
    if (qsType) {
      if (!type) setType(qsType as AllowedType);
      return;
    }

    // Compat: rascunho antigo (chave única)
    const saved = safeParseJSON<any>(
      localStorage.getItem(`systemvet:appointment:draft:${clientId}:${animalId}`)
    );
    if (saved) {
      hydratedFromDraftRef.current = true;

      setDate(saved.date || getTodayLocalISO());
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
    }
  }, [initialData, clientId, animalId, searchParams, type]);

  // Sincroniza estado do select da vacina (para suportar "Outra" sem mostrar o textbox sempre)
  useEffect(() => {
    if (type !== "Vacina") return;
    const v = (details || {}) as VaccinationDetails;
    const nome = (v.tipoVacina || "").trim();

    const isOption =
      (VACCINE_NAME_OPTIONS as readonly string[]).includes(nome) ||
      vaccinesList.some((v) => v.name === nome);
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
  const vaccineDoseValue = useMemo(() => {
    if (type !== "Vacina") return "";
    return (((details || {}) as VaccinationDetails).dose || "").trim();
  }, [type, details]);

  useEffect(() => {
    if (type !== "Vacina") return;
    if (!vaccineDoseValue) return;

    const v = (details || {}) as VaccinationDetails;

    const isNumericDose = /^[1-4]ª Dose$/.test(vaccineDoseValue);
    const isAnnual = vaccineDoseValue === "Reforço Anual";
    const isSingle = vaccineDoseValue === "Dose Única";

    const suggested = isNumericDose
      ? addDaysISO(date, 21)
      : isAnnual || isSingle
        ? addDaysISO(date, 365)
        : "";

    if (!suggested) return;

    // Sugestão automática: quando a dose muda, atualiza a próxima data.
    if ((v.proximaDose || "") !== suggested) {
      setDetails({ ...v, proximaDose: suggested });
    }
  }, [type, date, vaccineDoseValue]);

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

  const buildDraftSnapshotRef = useRef<() => AppointmentEntry>(() => buildDraftAppointment());
  buildDraftSnapshotRef.current = () => buildDraftAppointment();

  // Auto-salvar rascunho a cada 1 minuto + na desmontagem real (não a cada mudança de campo)
  useEffect(() => {
    const cid = clientId;
    const aid = animalId;

    const persistForScope = () => {
      if (suppressDraftWriteRef.current) return;
      const draftAppointment = buildDraftSnapshotRef.current();
      if (draftAppointment.animalId !== aid) return;
      const hasAny =
        !!draftAppointment.type ||
        !!draftAppointment.vet ||
        !!draftAppointment.observacoesGerais ||
        Object.keys((draftAppointment.details || {}) as any).length > 0;
      if (!hasAny) return;
      upsertAppointmentDraft(cid, aid, {
        id: draftAppointment.id,
        animalId: aid,
        clientId: cid,
        updatedAtISO: new Date().toISOString(),
        appointment: draftAppointment,
      });
    };

    const t = window.setInterval(persistForScope, 60_000);

    return () => {
      window.clearInterval(t);
      persistForScope();
    };
  }, [clientId, animalId]);

  const handleCancelClick = () => {
    const hasDraft = !!draftIdRef.current;
    const msg = hasDraft
      ? "Cancelar sem salvar? As alterações serão perdidas."
      : "Cancelar e voltar para o prontuário?";

    const ok = window.confirm(msg);
    if (!ok) return;

    // Evita que o autosave na desmontagem recrie/atualize o rascunho
    suppressDraftWriteRef.current = true;

    if (!initialData && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(sessionDraftStorageKey);
    }

    // Regra: ao cancelar, apagamos o rascunho automático —
    // EXCETO quando estamos editando um rascunho do histórico (ele deve permanecer).
    if (draftIdRef.current && !isDraftInitial) {
      removeAppointmentDraft(clientId, animalId, draftIdRef.current);
    }

    onCancel();
  };

  const handleGenerateAISuggestions = async () => {
    setAssistantError(null);
    setAssistantLoading(true);
    try {
      const draft = buildDraftAppointment();
      const context = buildConsultationContext(draft, {
        name: animalName,
        species: animalSpecies,
      });
      const initialMessages: ChatMessage[] = [
        { role: "user", content: `Contexto da consulta (anamnese e exame já registrados):\n\n${context}` },
      ];
      const result = await fetchAISuggestions(initialMessages);
      if (result.ok) {
        setAssistantMessages([...initialMessages, { role: "assistant", content: result.text }]);
      } else {
        setAssistantMessages([]);
        setAssistantError(result.error);
        toast.error(result.error);
      }
    } finally {
      setAssistantLoading(false);
    }
  };

  // Continua a mesma conversa (manda o histórico inteiro de novo) — antes,
  // cada geração era isolada, sem memória do que já tinha sido respondido,
  // e não dava pra tirar dúvida sobre uma sugestão já gerada.
  const handleAssistantFollowUp = async () => {
    const question = assistantFollowUp.trim();
    if (!question || assistantLoading) return;
    setAssistantError(null);
    setAssistantLoading(true);
    const nextMessages: ChatMessage[] = [...assistantMessages, { role: "user", content: question }];
    setAssistantMessages(nextMessages);
    setAssistantFollowUp("");
    try {
      const result = await fetchAISuggestions(nextMessages);
      if (result.ok) {
        setAssistantMessages([...nextMessages, { role: "assistant", content: result.text }]);
      } else {
        setAssistantError(result.error);
        toast.error(result.error);
      }
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

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
    setIsSaving(true);

    try {

    // Evita que o autosave na desmontagem recrie/atualize o rascunho depois do salvar.
    suppressDraftWriteRef.current = true;

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

    await onSave(newAppointment);

    if (draftId) {
      removeAppointmentDraft(clientId, animalId, draftId);
    }
    if (!initialData && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(sessionDraftStorageKey);
    }

    // Atualizar peso do animal (se informado)
    if (newAppointment.pesoAtual !== undefined) {
      const currentWeight = animal?.weight as number | undefined;

      if (animal && currentWeight !== newAppointment.pesoAtual) {
        const getWeightSourceFromAppointmentType = (t: AllowedType): string => {
          switch (t) {
            case "Vacina":
              return "Vacinação";
            case "Retorno":
              return "Retorno";
            case "Cirurgia":
              return "Cirurgia";
            case "Emergência":
              return "Emergência";
            case "Consulta":
            case "Consulta (Modelo Antigo)":
              return "Atendimento";
            default:
              return "Atendimento";
          }
        };

        const updated = await updateAnimalDetailsInDb(
          clientId,
          animalId,
          {
            weight: newAppointment.pesoAtual,
            lastWeightSource: getWeightSourceFromAppointmentType(newAppointment.type as AllowedType),
          },
          { date, time }
        );
        if (!updated) {
          toast.error("Atendimento salvo, mas não foi possível atualizar o peso do animal no banco.");
        }
      }
    }
    } finally {
      setIsSaving(false);
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

    if (!clientName || !animal) {
      toast.error("Cliente/animal não encontrados para gerar PDF.");
      return;
    }

    const blob = await createPdfBlob(
      <AppointmentPdfContent
        appointment={appointmentForPdf}
        clientName={clientName}
        animalName={animal.name}
        animalSpecies={animal.species}
      />
    );

    await openPdf({
      blob,
      fileName: `atendimento_${animal.name}_${date}.pdf`,
      persistOptions: { folder: "appointments" },
    });
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
                    <WeightInput
                      id="peso"
                      placeholder="Peso atual"
                      value={pesoAtual}
                      onChange={(v) => setPesoAtual(v)}
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
                    {vaccinesList
                      .filter((v) => !(VACCINE_NAME_OPTIONS as readonly string[]).includes(v.name))
                      .map((v) => (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name}
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
                <Select value={doseValue} onValueChange={(val) => setDetails({ ...v, dose: val })}>
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
                <p className="text-xs text-muted-foreground">
                  Sugestão automática da próxima dose: 21 dias (1ª–4ª) • 365 dias (reforço anual / dose única)
                </p>
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

          <div className="space-y-2">
            <Label htmlFor="proximoAcompanhamentoDias">Próximo acompanhamento (dias)</Label>
            <Input
              id="proximoAcompanhamentoDias"
              type="number"
              min={0}
              value={r.retornoRecomendadoEmDias || ""}
              onChange={(e) =>
                setDetails({ ...r, retornoRecomendadoEmDias: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            {r.retornoRecomendadoEmDias ? (
              <p className="text-xs text-muted-foreground">
                Sugestão de data: {isoToBR(addDaysISO(date, r.retornoRecomendadoEmDias))}
              </p>
            ) : null}
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
            <WeightInput
              value={pesoAtual}
              onChange={(v) => setPesoAtual(v)}
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
                {appointmentTypesList
                  .filter((item) => !(PRIMARY_TYPES as string[]).includes(item.name))
                  .map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                {!!type && !isPrimaryType(type) && !appointmentTypesList.some((item) => item.name === type) && (
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
              {systemVets.map((v) => (
                <option key={v} value={v} />
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

          <div className="flex items-center justify-between gap-4 md:col-span-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="useAssistantIA" className="cursor-pointer">
                Usar assistente IA
              </Label>
            </div>
            <Switch
              id="useAssistantIA"
              checked={useAssistantIA}
              onCheckedChange={setUseAssistantIA}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assistente IA (visível quando ativado e há tipo de atendimento) */}
      {type && useAssistantIA && (
        <Card className="premium-card rounded-xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Assistente IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Com base na queixa, anamnese e exame já preenchidos, o assistente pode sugerir perguntas ao tutor,
              hipóteses diagnósticas, exames e condutas. Valide sempre as sugestões com seu julgamento clínico.
            </p>
            {assistantMessages.length === 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateAISuggestions}
                disabled={assistantLoading}
              >
                {assistantLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando sugestões...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar sugestões
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAssistantMessages([]); setAssistantError(null); }}>
                Recomeçar
              </Button>
            )}

            {assistantError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {assistantError}
              </div>
            )}

            {/* Mensagem [0] é o contexto montado automaticamente, não uma
                pergunta do veterinário — nunca renderizada. */}
            {assistantMessages.slice(1).map((msg, i) =>
              msg.role === "assistant" ? (
                <AISuggestionsView key={i} text={msg.content} />
              ) : (
                <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <span className="font-semibold text-primary">Você perguntou: </span>
                  {msg.content}
                </div>
              )
            )}

            {assistantMessages.length > 0 && (
              <div className="flex gap-2">
                <Input
                  value={assistantFollowUp}
                  onChange={(e) => setAssistantFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleAssistantFollowUp();
                    }
                  }}
                  placeholder="Tirar uma dúvida sobre essa sugestão..."
                  disabled={assistantLoading}
                  className="bg-card"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAssistantFollowUp}
                  disabled={assistantLoading || !assistantFollowUp.trim()}
                >
                  {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Perguntar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <SaasButton type="button" saasVariant="outline" onClick={handleCancelClick} disabled={isSaving} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" /> Cancelar
          </SaasButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={isSaving} className="w-full sm:w-auto">
                <MoreHorizontal className="h-4 w-4 mr-2" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => generatePdf()}>
                Gerar PDF do atendimento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <SaasButton type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Salvar atendimento
              </>
            )}
          </SaasButton>
        </div>
      </div>
    </form>
  );
}