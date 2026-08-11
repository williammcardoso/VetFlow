import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTimes, FaSave, FaFlask, FaMicroscope, FaFileMedicalAlt, FaNotesMedical, FaUserMd, FaPlus, FaTrash } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamEntry, BiochemicalEntry, HemogramReference } from "@/types/exam";
import { addExam, updateExam, getExamById } from "@/lib/examsApi";
import {
  fetchHemogramReferences,
  fetchBiochemicalReferences,
  hemogramReferences as defaultHemogramReferencesFallback,
  type BiochemicalReferenceEntry,
} from "@/constants/examReferences";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { useSystemVets } from "@/hooks/useSystemVets";

// Tipos de exame
const mockExamTypes = [
  { id: "1", name: "Hemograma Completo" },
  { id: "2", name: "Exame de Fezes" },
  { id: "3", name: "Urinálise" },
  { id: "4", name: "Raio-X" },
  { id: "5", name: "Bioquímico" },
  { id: "6", name: "Ultrassonografia" },
  { id: "7", name: "Outro" },
];


// Analitos/Enzimas comuns em rotina (cães e gatos)
const biochemicalEnzymeOptions = [
  "ALT (TGP)",
  "AST (TGO)",
  "ALP (Fosfatase Alcalina)",
  "GGT",
  "CK (CPK)",
  "Amilase",
  "Lipase",
  "Ureia",
  "Creatinina",
  "Glicose",
  "Colesterol",
  "Triglicerídeos",
  "Bilirrubina total",
  "Bilirrubina direta",
  "Proteínas totais",
  "Albumina",
  "Cálcio",
  "Fósforo",
  "Frutosamina",
  "Outro",
];

// Componentes auxiliares (hemograma/leucograma)
interface ExamFieldWithReferenceProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  referenceKey: string;
  unit: string;
  placeholder?: string;
  getReference: (param: string, type?: 'relative' | 'absolute' | 'full') => string;
}

const ExamFieldWithReference = React.memo(({
  id,
  label,
  value,
  onChange,
  onBlur,
  referenceKey,
  unit,
  placeholder = "",
  getReference,
}: ExamFieldWithReferenceProps) => (
  <div className="flex items-center gap-x-2 w-full flex-nowrap">
    <Label htmlFor={id} className="w-[90px] text-left text-muted-foreground font-medium flex-shrink-0">
      {label}
    </Label>
    <Input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className="w-[90px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 flex-shrink-0"
    />
    <span className="text-xs text-muted-foreground w-[50px] text-left flex-shrink-0 whitespace-nowrap">{unit}</span>
    <div className="flex-1 flex items-center p-1 border border-border rounded-md bg-background text-xs text-foreground overflow-hidden whitespace-nowrap text-ellipsis">
      {getReference(referenceKey, 'full')}
    </div>
  </div>
));

interface LeukocyteFieldWithReferenceProps {
  idPrefix: string;
  label: string;
  relativeValue: string;
  onRelativeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  absoluteValue: string;
  onAbsoluteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAbsoluteBlur?: () => void;
  referenceKey: string;
  getReference: (param: string, type?: 'relative' | 'absolute' | 'full') => string;
}

const LeukocyteFieldWithReference = React.memo(({
  idPrefix,
  label,
  relativeValue,
  onRelativeChange,
  absoluteValue,
  onAbsoluteChange,
  onAbsoluteBlur,
  referenceKey,
  getReference,
}: LeukocyteFieldWithReferenceProps) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 w-full">
    <Label className="min-w-[90px] text-left text-muted-foreground font-medium flex-shrink-0">{label}</Label>
    <Input id={`${idPrefix}-relative`} type="text" value={relativeValue} onChange={onRelativeChange} className="w-[50px] bg-input flex-shrink-0" />
    <span className="text-xs text-muted-foreground flex-shrink-0">%</span>
    <Input id={`${idPrefix}-absolute`} type="text" value={absoluteValue} onChange={onAbsoluteChange} onBlur={onAbsoluteBlur} className="w-[70px] bg-input flex-shrink-0" />
    <span className="text-xs text-muted-foreground flex-shrink-0">/µL</span>

    <div className="flex-1 flex flex-wrap gap-1 justify-end">
      <div className="flex-1 flex flex-col items-start p-1 border border-border rounded-md bg-background text-xs text-foreground overflow-hidden">
        <span className="font-medium flex-shrink-0">Relativo:</span>
        <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
          {getReference(referenceKey, 'relative')}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-start p-1 border border-border rounded-md bg-background text-xs text-foreground overflow-hidden">
        <span className="font-medium flex-shrink-0">Absoluto:</span>
        <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
          {getReference(referenceKey, 'absolute')}
        </span>
      </div>
    </div>
  </div>
));

const AddExamPage = () => {
  const { clientId, animalId, examId } = useParams<{ clientId: string; animalId: string; examId?: string }>();
  const navigate = useNavigate();

  const isEditing = !!examId;

  const { vets: systemVets } = useSystemVets({ onlyVets: true });
  const { data: currentClient } = useClientWithAnimals(clientId);
  const currentAnimal = currentClient?.animals.find(a => a.id === animalId); // Corrigido para encontrar o animal corretamente
  const animalSpecies = currentAnimal?.species === "Canino" ? "dog" : currentAnimal?.species === "Felino" ? "cat" : undefined;

  // Vêm do Cadastro de Referências de Exame no Supabase — antes a tela usava
  // a constante estática hemogramReferences (ignorava qualquer edição feita
  // em Cadastros) e, depois, o localStorage (divergia entre dispositivos).
  const [hemogramReferences, setHemogramReferences] = useState<Record<string, HemogramReference>>(defaultHemogramReferencesFallback);
  const [biochemicalReferences, setBiochemicalReferences] = useState<Record<string, BiochemicalReferenceEntry>>({});
  useEffect(() => {
    let cancelled = false;
    fetchHemogramReferences().then((refs) => { if (!cancelled) setHemogramReferences(refs); });
    fetchBiochemicalReferences().then((refs) => { if (!cancelled) setBiochemicalReferences(refs); });
    return () => { cancelled = true; };
  }, []);

  // Exame carregado do banco (modo edição). Substitui a busca no array em
  // memória, que não sobrevivia a um reload da página.
  const [loadedExam, setLoadedExam] = useState<ExamEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado principal
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [examTime, setExamTime] = useState<string>(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [examType, setExamType] = useState<string | undefined>(undefined);
  const [examResult, setExamResult] = useState<string>("");
  const [examVet, setExamVet] = useState<string | undefined>(undefined);

  // Gerais (alguns tipos)
  const [material, setMaterial] = useState<string>("");
  const [equipamento, setEquipamento] = useState<string>("");

  // Eritrograma
  const [eritrocitos, setEritrocitos] = useState<string>("");
  const [hemoglobina, setHemoglobina] = useState<string>("");
  const [hematocrito, setHematocrito] = useState<string>("");
  const [vcm, setVcm] = useState<string>("");
  const [hcm, setHcm] = useState<string>("");
  const [chcm, setChcm] = useState<string>("");
  const [proteinaTotal, setProteinaTotal] = useState<string>("");
  const [hemaciasNucleadas, setHemaciasNucleadas] = useState<string>("");
  const [observacoesSerieVermelha, setObservacoesSerieVermelha] = useState<string>("");

  // Leucograma
  const [leucocitosTotais, setLeucocitosTotais] = useState<string>("");
  const [mielocitosRelativo, setMielocitosRelativo] = useState<string>("");
  const [mielocitosAbsoluto, setMielocitosAbsoluto] = useState<string>("");
  const [metamielocitosRelativo, setMetamielocitosRelativo] = useState<string>("");
  const [metamielocitosAbsoluto, setMetamielocitosAbsoluto] = useState<string>("");
  const [bastonetesRelativo, setBastonetesRelativo] = useState<string>("");
  const [bastonetesAbsoluto, setBastonetesAbsoluto] = useState<string>("");
  const [segmentadosRelativo, setSegmentadosRelativo] = useState<string>("");
  const [segmentadosAbsoluto, setSegmentadosAbsoluto] = useState<string>("");
  const [eosinofilosRelativo, setEosinofilosRelativo] = useState<string>("");
  const [eosinofilosAbsoluto, setEosinofilosAbsoluto] = useState<string>("");
  const [basofilosRelativo, setBasofilosRelativo] = useState<string>("");
  const [basofilosAbsoluto, setBasofilosAbsoluto] = useState<string>("");
  const [linfocitosRelativo, setLinfocitosRelativo] = useState<string>("");
  const [linfocitosAbsoluto, setLinfocitosAbsoluto] = useState<string>("");
  const [monocitosRelativo, setMonocitosRelativo] = useState<string>("");
  const [monocitosAbsoluto, setMonocitosAbsoluto] = useState<string>("");
  const [observacoesSerieBranca, setObservacoesSerieBranca] = useState<string>("");

  // Plaquetas
  const [contagemPlaquetaria, setContagemPlaquetaria] = useState<string>("");
  const [avaliacaoPlaquetaria, setAvaliacaoPlaquetaria] = useState<string>("");

  // Bioquímico
  const [biochemicalEntries, setBiochemicalEntries] = useState<BiochemicalEntry[]>([]);
  const [selectedEnzyme, setSelectedEnzyme] = useState<string | undefined>(undefined);
  const [customEnzyme, setCustomEnzyme] = useState<string>("");
  const [bioMaterial, setBioMaterial] = useState<string>("Soro ou plasma");
  const [bioMethodology, setBioMethodology] = useState<string>("Colorimétrico enzimático");
  const [bioEquipment, setBioEquipment] = useState<string>("Bioclin 2200");
  const [bioResult, setBioResult] = useState<string>("");
  const [bioMinReference, setBioMinReference] = useState<string>(""); // Novo
  const [bioMaxReference, setBioMaxReference] = useState<string>(""); // Novo
  const [bioReferenceUnit, setBioReferenceUnit] = useState<string>(""); // Novo

  // Adicionais
  const [nota, setNota] = useState<string>("");
  const [laboratory, setLaboratory] = useState<string>("");
  const [laboratoryDate, setLaboratoryDate] = useState<string>("");
  const [observacoesGeraisExame, setObservacoesGeraisExame] = useState<string>("");
  const [liberadoPor, setLiberadoPor] = useState<string>("WILLIAM DE MORAES CARDOSO CRMV-SP 56895");

  const resetExamSpecificFields = () => {
    setExamResult("");
    setMaterial("");
    setEquipamento("");
    setEritrocitos("");
    setHemoglobina("");
    setHematocrito("");
    setVcm("");
    setHcm("");
    setChcm("");
    setProteinaTotal("");
    setHemaciasNucleadas("");
    setObservacoesSerieVermelha("");
    setLeucocitosTotais("");
    setMielocitosRelativo("");
    setMielocitosAbsoluto("");
    setMetamielocitosRelativo("");
    setMetamielocitosAbsoluto("");
    setBastonetesRelativo("");
    setBastonetesAbsoluto("");
    setSegmentadosRelativo("");
    setSegmentadosAbsoluto("");
    setEosinofilosRelativo("");
    setEosinofilosAbsoluto("");
    setBasofilosRelativo("");
    setBasofilosAbsoluto("");
    setLinfocitosRelativo("");
    setLinfocitosAbsoluto("");
    setMonocitosRelativo("");
    setMonocitosAbsoluto("");
    setObservacoesSerieBranca("");
    setContagemPlaquetaria("");
    setAvaliacaoPlaquetaria("");
    setNota("");
    setLaboratory("");
    setLaboratoryDate("");
    setObservacoesGeraisExame("");
    setLiberadoPor("WILLIAM DE MORAES CARDOSO CRMV-SP 56895");

    // Bioquímico
    setBiochemicalEntries([]);
    setSelectedEnzyme(undefined);
    setCustomEnzyme("");
    setBioResult("");
    setBioMinReference(""); // Resetar
    setBioMaxReference(""); // Resetar
    setBioReferenceUnit(""); // Resetar
  };

  // Carregar dados ao editar
  useEffect(() => {
    let cancelled = false;
    if (isEditing && examId) {
      void (async () => {
      const examToEdit = await getExamById(examId);
      if (cancelled) return;
      setLoadedExam(examToEdit);
      if (examToEdit) {
        setExamDate(examToEdit.date);
        setExamTime(examToEdit.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setExamType(examToEdit.type);
        setExamVet(examToEdit.vet);
        setMaterial(examToEdit.material || "");
        setEquipamento(examToEdit.equipamento || "");
        setEritrocitos(examToEdit.eritrocitos || "");
        setHemoglobina(examToEdit.hemoglobina || "");
        setHematocrito(examToEdit.hematocrito || "");
        setVcm(examToEdit.vcm || "");
        setHcm(examToEdit.hcm || "");
        setChcm(examToEdit.chcm || "");
        setProteinaTotal(examToEdit.proteinaTotal || "");
        setHemaciasNucleadas(examToEdit.hemaciasNucleadas || "");
        setObservacoesSerieVermelha(examToEdit.observacoesSerieVermelha || "");
        setLeucocitosTotais(examToEdit.leucocitosTotais || "");
        setMielocitosRelativo(examToEdit.mielocitosRelativo || "");
        setMielocitosAbsoluto(examToEdit.mielocitosAbsoluto || "");
        setMetamielocitosRelativo(examToEdit.metamielocitosRelativo || "");
        setMetamielocitosAbsoluto(examToEdit.metamielocitosAbsoluto || "");
        setBastonetesRelativo(examToEdit.bastonetesRelativo || "");
        setBastonetesAbsoluto(examToEdit.bastonetesAbsoluto || "");
        setSegmentadosRelativo(examToEdit.segmentadosRelativo || "");
        setSegmentadosAbsoluto(examToEdit.segmentadosAbsoluto || "");
        setEosinofilosRelativo(examToEdit.eosinofilosRelativo || "");
        setEosinofilosAbsoluto(examToEdit.eosinofilosAbsoluto || "");
        setBasofilosRelativo(examToEdit.basofilosRelativo || "");
        setBasofilosAbsoluto(examToEdit.basofilosAbsoluto || "");
        setLinfocitosRelativo(examToEdit.linfocitosRelativo || "");
        setLinfocitosAbsoluto(examToEdit.linfocitosAbsoluto || "");
        setMonocitosRelativo(examToEdit.monocitosRelativo || "");
        setMonocitosAbsoluto(examToEdit.monocitosAbsoluto || "");
        setObservacoesSerieBranca(examToEdit.observacoesSerieBranca || "");
        setContagemPlaquetaria(examToEdit.contagemPlaquetaria || "");
        setAvaliacaoPlaquetaria(examToEdit.avaliacaoPlaquetaria || "");
        setNota(examToEdit.nota || "");
        setLaboratory(examToEdit.laboratory || "");
        setLaboratoryDate(examToEdit.laboratoryDate || "");
        setObservacoesGeraisExame(examToEdit.observacoesGeraisExame || "");
        setExamResult(examToEdit.result || "");
        setLiberadoPor(examToEdit.liberadoPor || "WILLIAM DE MORAES CARDOSO CRMV-SP 56895");
        setBiochemicalEntries(examToEdit.biochemicalEntries || []);
      } else {
        toast.error("Exame não encontrado para edição.");
        navigate(`/clients/${clientId}/animals/${animalId}/record`);
      }
      })();
    } else {
      setLoadedExam(null);
      resetExamSpecificFields();
      setExamDate(new Date().toISOString().split('T')[0]);
      setExamTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setExamType(undefined);
      setExamVet(undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [isEditing, examId, clientId, animalId, navigate]);

  // Reset ao trocar tipo
  useEffect(() => {
    if (!isEditing || (isEditing && examType !== loadedExam?.type)) {
      resetExamSpecificFields();
      if (examType === "Hemograma Completo") {
        setMaterial("SANGUE COM E.D.T.A.");
      }
      if (examType === "Bioquímico") {
        setBioMaterial("Soro ou plasma");
        setBioMethodology("Colorimétrico enzimático");
        setBioEquipment("Bioclin 2200");
      }
    }
  }, [examType, isEditing, examId, loadedExam]);

  const getReference = (param: string, type?: 'relative' | 'absolute' | 'full') => {
    if (!animalSpecies || !hemogramReferences[param]) return "N/A";
    const refData = hemogramReferences[param][animalSpecies];
    if (type === 'full' && refData.full) return refData.full;
    if (type === 'relative' && refData.relative) return refData.relative;
    if (type === 'absolute' && refData.absolute) return refData.absolute;
    return "N/A";
  };

  // Alguns laboratórios só informam o valor absoluto (/µL) do leucograma,
  // sem o percentual — nesse caso o relativo precisa ser calculado à mão
  // (absoluto ÷ leucócitos totais × 100). Preenche sozinho quando o campo
  // Relativo estiver vazio, sem nunca sobrescrever um valor que o usuário já
  // tenha digitado. Calcula no onBlur (ao sair do campo), não a cada tecla:
  // um useEffect por tecla calculava sobre o valor ainda incompleto (ex.: só
  // o "2" de "250") e já preenchia Relativo com "0" — como "0" não é string
  // vazia, o guard de "não sobrescrever" travava ali, mesmo terminando de
  // digitar o valor certo depois.
  const parseLeukoNumber = (raw: string): number | undefined => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return undefined;
    let cleaned = trimmed.replace(/[^0-9.,]/g, "");
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (lastDot !== -1) {
      const dotCount = (cleaned.match(/\./g) || []).length;
      const decimalsAfterLastDot = cleaned.length - lastDot - 1;
      if (dotCount > 1 || decimalsAfterLastDot === 3) {
        cleaned = cleaned.replace(/\./g, "");
      }
    }
    const n = Number(cleaned);
    return Number.isNaN(n) ? undefined : n;
  };

  const recomputeLeukocyteRelatives = () => {
    const total = parseLeukoNumber(leucocitosTotais);
    if (!total || total <= 0) return;
    const pairs: Array<{ absoluto: string; relativo: string; setRelativo: (v: string) => void }> = [
      { absoluto: mielocitosAbsoluto, relativo: mielocitosRelativo, setRelativo: setMielocitosRelativo },
      { absoluto: metamielocitosAbsoluto, relativo: metamielocitosRelativo, setRelativo: setMetamielocitosRelativo },
      { absoluto: bastonetesAbsoluto, relativo: bastonetesRelativo, setRelativo: setBastonetesRelativo },
      { absoluto: segmentadosAbsoluto, relativo: segmentadosRelativo, setRelativo: setSegmentadosRelativo },
      { absoluto: eosinofilosAbsoluto, relativo: eosinofilosRelativo, setRelativo: setEosinofilosRelativo },
      { absoluto: basofilosAbsoluto, relativo: basofilosRelativo, setRelativo: setBasofilosRelativo },
      { absoluto: linfocitosAbsoluto, relativo: linfocitosRelativo, setRelativo: setLinfocitosRelativo },
      { absoluto: monocitosAbsoluto, relativo: monocitosRelativo, setRelativo: setMonocitosRelativo },
    ];
    for (const pair of pairs) {
      if (pair.relativo.trim() !== "") continue;
      const abs = parseLeukoNumber(pair.absoluto);
      if (abs === undefined) continue;
      const pct = Math.round((abs / total) * 1000) / 10;
      pair.setRelativo(String(pct));
    }
  };

  // Ao escolher (ou digitar, se "Outro") o analito, preenche mín./máx./
  // unidade a partir do que foi configurado em Cadastros > Referências de
  // Exame > Bioquímico para a espécie do paciente — antes esses 3 campos
  // não tinham nenhum preenchimento automático, sempre em branco. Segue
  // editável manualmente depois de preenchido.
  useEffect(() => {
    const enzymeName = selectedEnzyme === "Outro" ? customEnzyme.trim() : (selectedEnzyme || "").trim();
    if (!enzymeName || !animalSpecies) {
      setBioMinReference("");
      setBioMaxReference("");
      setBioReferenceUnit("");
      return;
    }
    const entry = biochemicalReferences[enzymeName];
    const ref = entry?.[animalSpecies];
    setBioMinReference(ref?.min !== undefined ? String(ref.min) : "");
    setBioMaxReference(ref?.max !== undefined ? String(ref.max) : "");
    setBioReferenceUnit(entry?.unit || "");
  }, [selectedEnzyme, customEnzyme, animalSpecies, biochemicalReferences]);

  // Bioquímico: adicionar/remover/atualizar
  const handleAddBiochemical = () => {
    const enzymeName = selectedEnzyme === "Outro" ? customEnzyme.trim() : (selectedEnzyme || "").trim();
    if (!enzymeName) {
      toast.error("Selecione ou informe a enzima/analito.");
      return;
    }
    if (!bioResult.trim()) {
      toast.error("Informe o resultado.");
      return;
    }
    if (!bioMinReference.trim() || !bioMaxReference.trim() || !bioReferenceUnit.trim()) {
      toast.error("Informe os valores de referência (mínimo, máximo e unidade).");
      return;
    }

    const entry: BiochemicalEntry = {
      id: `bio-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      enzyme: enzymeName,
      material: bioMaterial.trim() || "Soro ou plasma",
      methodology: bioMethodology.trim() || "Colorimétrico enzimático",
      equipment: bioEquipment.trim() || "Bioclin 2200",
      result: bioResult.trim(),
      minReference: bioMinReference.trim(), // Novo
      maxReference: bioMaxReference.trim(), // Novo
      referenceUnit: bioReferenceUnit.trim(), // Novo
    };
    setBiochemicalEntries(prev => [...prev, entry]);
    setSelectedEnzyme(undefined);
    setCustomEnzyme("");
    setBioResult("");
    setBioMinReference(""); // Resetar
    setBioMaxReference(""); // Resetar
    setBioReferenceUnit(""); // Resetar
    toast.success("Analito adicionado.");
  };

  const handleRemoveBiochemical = (id: string) => {
    setBiochemicalEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateBiochemical = (id: string, field: keyof BiochemicalEntry, value: string) => {
    setBiochemicalEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSaveExam = async () => {
    if (!examDate || !examTime || !examType || !examVet) {
      toast.error("Por favor, preencha a data, hora, tipo de exame e veterinário.");
      return;
    }

    if (examType === "Bioquímico" && biochemicalEntries.length === 0) {
      toast.error("Adicione pelo menos um analito bioquímico.");
      return;
    }

    const examData: ExamEntry = {
      id: examId || `exam-${Date.now()}`,
      // Sem animalId a API grava animal_id = null e o exame nunca aparece
      // no prontuário do paciente (getExams filtra por animal_id).
      animalId,
      date: examDate,
      time: examTime,
      type: examType,
      vet: examVet,
      material: material.trim() || undefined,
      equipamento: equipamento.trim() || undefined,
      laboratory: laboratory.trim() || undefined,
      laboratoryDate: laboratoryDate.trim() || undefined,
      observacoesGeraisExame: observacoesGeraisExame.trim() || undefined,
      liberadoPor: liberadoPor.trim() || undefined,
    };

    if (examType === "Hemograma Completo") {
      Object.assign(examData, {
        eritrocitos: eritrocitos.trim() || undefined,
        hemoglobina: hemoglobina.trim() || undefined,
        hematocrito: hematocrito.trim() || undefined,
        vcm: vcm.trim() || undefined,
        hcm: hcm.trim() || undefined,
        chcm: chcm.trim() || undefined,
        proteinaTotal: proteinaTotal.trim() || undefined,
        hemaciasNucleadas: hemaciasNucleadas.trim() || undefined,
        observacoesSerieVermelha: observacoesSerieVermelha.trim() || undefined,
        leucocitosTotais: leucocitosTotais.trim() || undefined,
        mielocitosRelativo: mielocitosRelativo.trim() || undefined,
        mielocitosAbsoluto: mielocitosAbsoluto.trim() || undefined,
        metamielocitosRelativo: metamielocitosRelativo.trim() || undefined,
        metamielocitosAbsoluto: metamielocitosAbsoluto.trim() || undefined,
        bastonetesRelativo: bastonetesRelativo.trim() || undefined,
        bastonetesAbsoluto: bastonetesAbsoluto.trim() || undefined,
        segmentadosRelativo: segmentadosRelativo.trim() || undefined,
        segmentadosAbsoluto: segmentadosAbsoluto.trim() || undefined,
        eosinofilosRelativo: eosinofilosRelativo.trim() || undefined,
        eosinofilosAbsoluto: eosinofilosAbsoluto.trim() || undefined,
        basofilosRelativo: basofilosRelativo.trim() || undefined,
        basofilosAbsoluto: basofilosAbsoluto.trim() || undefined,
        linfocitosRelativo: linfocitosRelativo.trim() || undefined,
        linfocitosAbsoluto: linfocitosAbsoluto.trim() || undefined,
        monocitosRelativo: monocitosRelativo.trim() || undefined,
        monocitosAbsoluto: monocitosAbsoluto.trim() || undefined,
        observacoesSerieBranca: observacoesSerieBranca.trim() || undefined,
        contagemPlaquetaria: contagemPlaquetaria.trim() || undefined,
        avaliacaoPlaquetaria: avaliacaoPlaquetaria.trim() || undefined,
        nota: nota.trim() || undefined,
      });
    } else if (examType === "Bioquímico") {
      Object.assign(examData, {
        biochemicalEntries: biochemicalEntries.length ? biochemicalEntries : undefined,
      });
    } else {
      examData.result = examResult.trim() || undefined;
    }

    setSaving(true);
    try {
      if (isEditing && examId) {
        const ok = await updateExam(examData);
        if (!ok) {
          toast.error("Falha ao atualizar o exame. Tente novamente.");
          return;
        }
        toast.success("Exame atualizado com sucesso!");
      } else {
        // A API gera o id; o do examData é descartado no insert.
        const { id: _generatedId, ...entry } = examData;
        const created = await addExam(entry);
        if (!created) {
          toast.error("Falha ao salvar o exame. Tente novamente.");
          return;
        }
        toast.success("Exame salvo com sucesso!");
      }
      navigate(`/clients/${clientId}/animals/${animalId}/record`);
    } catch {
      toast.error("Erro ao salvar o exame.");
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEditing ? "Editar Exame" : "Adicionar Exame";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaFlask className="h-5 w-5 text-vf-clinical" /> {pageTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {isEditing ? "Edite os detalhes do exame para o animal." : "Registre um novo exame para o animal."}
              </p>
            </div>
          </div>
          <Link to={`/clients/${clientId}/animals/${animalId}/record`}>
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Prontuário
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; Clientes &gt; Animal &gt; Prontuário &gt; {pageTitle}
        </p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6">
        <Card className="vf-surface-card vf-tone-clinical card-hover rounded-2xl border border-border/80">
          <CardContent className="grid gap-4 py-4">
            {/* Passo 1: Data, Hora, Tipo, Veterinário - na mesma linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDate">Data do Exame</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examTime">Hora do Exame</Label>
                <Input
                  id="examTime"
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examType">Tipo de Exame</Label>
                <Select onValueChange={setExamType} value={examType}>
                  <SelectTrigger id="examType" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full">
                    <SelectValue placeholder="Selecione o tipo de exame" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockExamTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="examVet">Veterinário Solicitante</Label>
                <Select onValueChange={setExamVet} value={examVet}>
                  <SelectTrigger id="examVet" className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full">
                    <SelectValue placeholder="Selecione o veterinário" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemVets.length > 0 ? (
                      systemVets.map((vetName) => (
                        <SelectItem key={vetName} value={vetName}>
                          {vetName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        Complete seu nome em Configuração › Usuários
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hemograma */}
            {examType === "Hemograma Completo" && (
              <>
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaMicroscope className="h-5 w-5 text-vf-clinical" /> Informações do Laboratório
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0 px-2">
                    <div className="space-y-2">
                      <Label htmlFor="material">Material</Label>
                      <Input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equipamento">Equipamento</Label>
                      <Input id="equipamento" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="laboratory">Laboratório</Label>
                      <Input
                        id="laboratory"
                        placeholder="Nome do laboratório"
                        value={laboratory}
                        onChange={(e) => setLaboratory(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="laboratoryDate">Data do Resultado</Label>
                      <Input
                        id="laboratoryDate"
                        type="date"
                        value={laboratoryDate}
                        onChange={(e) => setLaboratoryDate(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="liberadoPor">Liberado por</Label>
                      <Input
                        id="liberadoPor"
                        value={liberadoPor}
                        onChange={(e) => setLiberadoPor(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col lg:flex-row gap-6 mt-6">
                  {/* Eritrograma */}
                  <Card className="vf-surface-card vf-tone-clinical card-hover w-full rounded-xl border border-border/80 p-4 lg:w-[45%]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <FaFileMedicalAlt className="h-5 w-5 text-vf-clinical" /> Eritrograma
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-0 px-2">
                      <ExamFieldWithReference getReference={getReference} id="eritrocitos" label="Eritrócitos" value={eritrocitos} onChange={(e) => setEritrocitos(e.target.value)} referenceKey="eritrocitos" unit="M/µL" />
                      <ExamFieldWithReference getReference={getReference} id="hemoglobina" label="Hemoglobina" value={hemoglobina} onChange={(e) => setHemoglobina(e.target.value)} referenceKey="hemoglobina" unit="g/dL" />
                      <ExamFieldWithReference getReference={getReference} id="hematocrito" label="Hematócrito" value={hematocrito} onChange={(e) => setHematocrito(e.target.value)} referenceKey="hematocrito" unit="%" />
                      <ExamFieldWithReference getReference={getReference} id="vcm" label="V.C.M." value={vcm} onChange={(e) => setVcm(e.target.value)} referenceKey="vcm" unit="fL" />
                      <ExamFieldWithReference getReference={getReference} id="hcm" label="H.C.M." value={hcm} onChange={(e) => setHcm(e.target.value)} referenceKey="hcm" unit="pg" />
                      <ExamFieldWithReference getReference={getReference} id="chcm" label="C.H.C.M." value={chcm} onChange={(e) => setChcm(e.target.value)} referenceKey="chcm" unit="g/dL" />
                      <ExamFieldWithReference getReference={getReference} id="proteinaTotal" label="Proteína total" value={proteinaTotal} onChange={(e) => setProteinaTotal(e.target.value)} referenceKey="proteinaTotal" unit="g/dL" />
                      <ExamFieldWithReference getReference={getReference} id="hemaciasNucleadas" label="Hemácias nucleadas" value={hemaciasNucleadas} onChange={(e) => setHemaciasNucleadas(e.target.value)} referenceKey="hemaciasNucleadas" unit="" />

                      <div className="space-y-2 col-span-full">
                        <Label htmlFor="observacoesSerieVermelha" className="text-muted-foreground font-medium">Observações série vermelha</Label>
                        <Textarea id="observacoesSerieVermelha" placeholder="Observações sobre a série vermelha" value={observacoesSerieVermelha} onChange={(e) => setObservacoesSerieVermelha(e.target.value)} rows={2} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Leucograma */}
                  <Card className="vf-surface-card vf-tone-clinical card-hover w-full rounded-xl border border-border/80 p-4 lg:w-[55%]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <FaUserMd className="h-5 w-5 text-vf-clinical" /> Leucograma
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-0 px-2">
                      <ExamFieldWithReference getReference={getReference} id="leucocitosTotais" label="Leucócitos totais" value={leucocitosTotais} onChange={(e) => setLeucocitosTotais(e.target.value)} onBlur={recomputeLeukocyteRelatives} referenceKey="leucocitosTotais" unit="/µL" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="mielocitos" label="Mielócitos" relativeValue={mielocitosRelativo} onRelativeChange={(e) => setMielocitosRelativo(e.target.value)} absoluteValue={mielocitosAbsoluto} onAbsoluteChange={(e) => setMielocitosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="mielocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="metamielocitos" label="Metamielócitos" relativeValue={metamielocitosRelativo} onRelativeChange={(e) => setMetamielocitosRelativo(e.target.value)} absoluteValue={metamielocitosAbsoluto} onAbsoluteChange={(e) => setMetamielocitosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="metamielocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="bastonetes" label="Bastonetes" relativeValue={bastonetesRelativo} onRelativeChange={(e) => setBastonetesRelativo(e.target.value)} absoluteValue={bastonetesAbsoluto} onAbsoluteChange={(e) => setBastonetesAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="bastonetes" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="segmentados" label="Segmentados" relativeValue={segmentadosRelativo} onRelativeChange={(e) => setSegmentadosRelativo(e.target.value)} absoluteValue={segmentadosAbsoluto} onAbsoluteChange={(e) => setSegmentadosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="segmentados" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="eosinofilos" label="Eosinófilos" relativeValue={eosinofilosRelativo} onRelativeChange={(e) => setEosinofilosRelativo(e.target.value)} absoluteValue={eosinofilosAbsoluto} onAbsoluteChange={(e) => setEosinofilosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="eosinofilos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="basofilos" label="Basófilos" relativeValue={basofilosRelativo} onRelativeChange={(e) => setBasofilosRelativo(e.target.value)} absoluteValue={basofilosAbsoluto} onAbsoluteChange={(e) => setBasofilosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="basofilos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="linfocitos" label="Linfócitos" relativeValue={linfocitosRelativo} onRelativeChange={(e) => setLinfocitosRelativo(e.target.value)} absoluteValue={linfocitosAbsoluto} onAbsoluteChange={(e) => setLinfocitosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="linfocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="monocitos" label="Monócitos" relativeValue={monocitosRelativo} onRelativeChange={(e) => setMonocitosRelativo(e.target.value)} absoluteValue={monocitosAbsoluto} onAbsoluteChange={(e) => setMonocitosAbsoluto(e.target.value)} onAbsoluteBlur={recomputeLeukocyteRelatives} referenceKey="monocitos" />

                      <div className="space-y-2 col-span-full">
                        <Label htmlFor="observacoesSerieBranca" className="text-muted-foreground font-medium">Observações série branca</Label>
                        <Textarea id="observacoesSerieBranca" placeholder="Observações sobre a série branca" value={observacoesSerieBranca} onChange={(e) => setObservacoesSerieBranca(e.target.value)} rows={2} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plaquetas */}
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaFileMedicalAlt className="h-5 w-5 text-vf-clinical" /> Plaquetas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0 px-2">
                    <ExamFieldWithReference getReference={getReference} id="contagemPlaquetaria" label="Contagem plaquetária" value={contagemPlaquetaria} onChange={(e) => setContagemPlaquetaria(e.target.value)} referenceKey="contagemPlaquetaria" unit="/µL" />
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="avaliacaoPlaquetaria" className="text-muted-foreground font-medium">Avaliação plaquetária</Label>
                      <Textarea id="avaliacaoPlaquetaria" placeholder="Avaliação qualitativa das plaquetas" value={avaliacaoPlaquetaria} onChange={(e) => setAvaliacaoPlaquetaria(e.target.value)} rows={2} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                    </div>
                  </CardContent>
                </Card>

                {/* Nota */}
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaNotesMedical className="h-5 w-5 text-vf-clinical" /> Nota
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-2">
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="nota" className="text-foreground font-medium">Observações sobre as alterações do exame</Label>
                      <Textarea
                        id="nota"
                        placeholder="Adicione observações sobre as alterações do exame"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        rows={3}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Bioquímico */}
            {examType === "Bioquímico" && (
              <>
                {/* Passo 2: adicionar analito */}
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaMicroscope className="h-5 w-5 text-vf-clinical" /> Adicionar analito bioquímico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-0 px-2">
                    {/* Enzima, Resultado, Mínimo, Máximo, Unidade - na mesma linha */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2 col-span-full lg:col-span-1">
                        <Label>Analito/Enzima</Label>
                        <Select value={selectedEnzyme} onValueChange={setSelectedEnzyme}>
                          <SelectTrigger className="bg-input rounded-md border-border">
                            <SelectValue placeholder="Selecione um analito" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {biochemicalEnzymeOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedEnzyme === "Outro" && (
                          <Input
                            placeholder="Informe o nome do analito"
                            value={customEnzyme}
                            onChange={(e) => setCustomEnzyme(e.target.value)}
                            className="bg-input mt-2"
                          />
                        )}
                      </div>
                      <div className="space-y-2 col-span-full sm:col-span-1 lg:col-span-1">
                        <Label>Resultado</Label>
                        <Input
                          placeholder="Resultado"
                          value={bioResult}
                          onChange={(e) => setBioResult(e.target.value)}
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-2 col-span-full sm:col-span-1 lg:col-span-1">
                        <Label>Ref. Mínima</Label>
                        <Input
                          placeholder="Mín."
                          value={bioMinReference}
                          onChange={(e) => setBioMinReference(e.target.value)}
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-2 col-span-full sm:col-span-1 lg:col-span-1">
                        <Label>Ref. Máxima</Label>
                        <Input
                          placeholder="Máx."
                          value={bioMaxReference}
                          onChange={(e) => setBioMaxReference(e.target.value)}
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-2 col-span-full sm:col-span-1 lg:col-span-1">
                        <Label>Unidade</Label>
                        <Input
                          placeholder="Unidade"
                          value={bioReferenceUnit}
                          onChange={(e) => setBioReferenceUnit(e.target.value)}
                          className="bg-input"
                        />
                      </div>
                    </div>
                    {/* Material, Metodologia, Equipamento - na mesma linha */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Material</Label>
                        <Input value={bioMaterial} onChange={(e) => setBioMaterial(e.target.value)} className="bg-input" />
                      </div>
                      <div className="space-y-2">
                        <Label>Metodologia</Label>
                        <Input value={bioMethodology} onChange={(e) => setBioMethodology(e.target.value)} className="bg-input" />
                      </div>
                      <div className="space-y-2">
                        <Label>Equipamento</Label>
                        <Input value={bioEquipment} onChange={(e) => setBioEquipment(e.target.value)} className="bg-input" />
                      </div>
                    </div>
                    <div className="flex items-end col-span-full">
                      <Button type="button" onClick={handleAddBiochemical} className="flex items-center gap-2 bg-[hsl(var(--vf-clinical))] text-white hover:bg-[hsl(var(--vf-clinical)/0.9)]">
                        <FaPlus className="h-4 w-4" /> Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de analitos adicionados */}
                {biochemicalEntries.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {biochemicalEntries.map((entry) => (
                      <Card key={entry.id} className="vf-surface-card vf-tone-clinical card-hover rounded-xl border border-border/80">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{entry.enzyme}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 pt-0">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Material</Label>
                              <Input
                                value={entry.material}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "material", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Metodologia</Label>
                              <Input
                                value={entry.methodology}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "methodology", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Equipamento</Label>
                              <Input
                                value={entry.equipment}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "equipment", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Resultado</Label>
                              <Input
                                value={entry.result}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "result", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Ref. Mínima</Label>
                              <Input
                                value={entry.minReference || ''}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "minReference", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Ref. Máxima</Label>
                              <Input
                                value={entry.maxReference || ''}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "maxReference", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Unidade</Label>
                              <Input
                                value={entry.referenceUnit || ''}
                                onChange={(e) => handleUpdateBiochemical(entry.id, "referenceUnit", e.target.value)}
                                className="bg-input"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" type="button" onClick={() => handleRemoveBiochemical(entry.id)} className="text-red-600 hover:text-red-700">
                              <FaTrash className="h-4 w-4 mr-2" /> Remover
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Informações do laboratório para Bioquímico */}
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaMicroscope className="h-5 w-5 text-vf-clinical" /> Informações do Laboratório
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0 px-2">
                    <div className="space-y-2">
                      <Label htmlFor="laboratory">Laboratório</Label>
                      <Input
                        id="laboratory"
                        placeholder="Nome do laboratório"
                        value={laboratory}
                        onChange={(e) => setLaboratory(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="laboratoryDate">Data do Resultado</Label>
                      <Input
                        id="laboratoryDate"
                        type="date"
                        value={laboratoryDate}
                        onChange={(e) => setLaboratoryDate(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="liberadoPor">Liberado por</Label>
                      <Input
                        id="liberadoPor"
                        value={liberadoPor}
                        onChange={(e) => setLiberadoPor(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Observações gerais (opcional) */}
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaNotesMedical className="h-5 w-5 text-vf-clinical" /> Observações Gerais do Exame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-2">
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="observacoesGeraisExame">Observações</Label>
                      <Textarea
                        id="observacoesGeraisExame"
                        placeholder="Observações gerais do exame"
                        value={observacoesGeraisExame}
                        onChange={(e) => setObservacoesGeraisExame(e.target.value)}
                        rows={3}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Outros tipos (genérico) */}
            {examType && examType !== "Hemograma Completo" && examType !== "Bioquímico" && (
              <>
                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaFileMedicalAlt className="h-5 w-5 text-vf-clinical" /> Resultado do Exame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-2">
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="examResult">Resultado</Label>
                      <Input
                        id="examResult"
                        placeholder="Resultado do exame"
                        value={examResult}
                        onChange={(e) => setExamResult(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaMicroscope className="h-5 w-5 text-vf-clinical" /> Informações do Laboratório
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0 px-2">
                    <div className="space-y-2">
                      <Label htmlFor="laboratory">Laboratório</Label>
                      <Input
                        id="laboratory"
                        placeholder="Nome do laboratório"
                        value={laboratory}
                        onChange={(e) => setLaboratory(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="laboratoryDate">Data do Resultado</Label>
                      <Input
                        id="laboratoryDate"
                        type="date"
                        value={laboratoryDate}
                        onChange={(e) => setLaboratoryDate(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="liberadoPor">Liberado por</Label>
                      <Input
                        id="liberadoPor"
                        value={liberadoPor}
                        onChange={(e) => setLiberadoPor(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="vf-surface-card vf-tone-clinical card-hover mt-6 rounded-xl border border-border/80 p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaNotesMedical className="h-5 w-5 text-vf-clinical" /> Observações Gerais do Exame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-2">
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="observacoesGeraisExame">Observações</Label>
                      <Textarea
                        id="observacoesGeraisExame"
                        placeholder="Observações gerais do exame"
                        value={observacoesGeraisExame}
                        onChange={(e) => setObservacoesGeraisExame(e.target.value)}
                        rows={3}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Link to={`/clients/${clientId}/animals/${animalId}/record`}>
            <Button variant="outline" className="w-full sm:w-auto bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
              <FaTimes className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </Link>
          <Button onClick={handleSaveExam} disabled={!examType || saving} className="w-full sm:w-auto rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
            <FaSave className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar Exame"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddExamPage;