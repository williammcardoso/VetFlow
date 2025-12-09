import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTimes, FaSave, FaCalendarAlt, FaFlask, FaMicroscope, FaFileMedicalAlt, FaNotesMedical, FaUserMd, FaPlus } from "react-icons/fa"; // Importar ícones de react-icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"; // Importar funções de toast
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Importar Card para envolver o formulário
import { mockClients } from "@/mockData/clients"; // Importar mockClients para obter a espécie do animal
import { ExamEntry, BiochemicalEntry } from "@/types/exam"; // Importar a interface ExamEntry e as interfaces de referência
import { addMockExam, updateMockExam, mockExams } from "@/mockData/exams"; // Importar funções de mock de exames
import { hemogramReferences } from "@/constants/examReferences"; // Importar hemogramReferences do arquivo de constantes
import BiochemicalExamForm from "@/components/BiochemicalExamForm"; // Importar o novo componente

// Mock data para tipos de exame e veterinários (duplicado por enquanto, idealmente viria de um contexto ou API)
const mockExamTypes = [
  { id: "1", name: "Hemograma Completo" },
  { id: "2", name: "Exame de Fezes" },
  { id: "3", name: "Urinálise" },
  { id: "4", name: "Raio-X" },
  { id: "5", name: "Bioquímico" },
  { id: "6", name: "Ultrassonografia" },
  { id: "7", name: "Outro" },
];

const mockVets = [
  { id: "1", name: "Dr. Silva" },
  { id: "2", name: "Dra. Costa" },
  { id: "3", "name": "Dr. Souza" },
];

// Componente auxiliar para renderizar uma linha de campo com referência
interface ExamFieldWithReferenceProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
      className="w-[90px] bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 flex-shrink-0"
    />
    <span className="text-xs text-muted-foreground w-[50px] text-left flex-shrink-0 whitespace-nowrap">{unit}</span>
    <div className="flex-1 flex items-center p-1 border border-border rounded-md bg-background text-xs text-foreground overflow-hidden whitespace-nowrap text-ellipsis">
      {getReference(referenceKey, 'full')}
    </div>
  </div>
));

// Componente auxiliar para campos de leucócitos (relativo e absoluto)
interface LeukocyteFieldWithReferenceProps {
  idPrefix: string;
  label: string;
  relativeValue: string;
  onRelativeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  absoluteValue: string;
  onAbsoluteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  referenceKey,
  getReference,
}: LeukocyteFieldWithReferenceProps) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 w-full">
    <Label className="min-w-[90px] text-left text-muted-foreground font-medium flex-shrink-0">{label}</Label>
    <Input id={`${idPrefix}-relative`} type="text" value={relativeValue} onChange={onRelativeChange} className="w-[50px] bg-input flex-shrink-0" />
    <span className="text-xs text-muted-foreground flex-shrink-0">%</span>
    <Input id={`${idPrefix}-absolute`} type="text" value={absoluteValue} onChange={onAbsoluteChange} className="w-[70px] bg-input flex-shrink-0" />
    <span className="text-xs text-muted-foreground flex-shrink-0">/µL</span>

    {/* Dois quadrados separados para referências */}
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
  const { clientId, animalId, examId } = useParams<{ clientId: string; animalId: string; examId?: string }>(); // Obter examId da URL
  const navigate = useNavigate();

  const isEditing = !!examId; // Determinar se está em modo de edição

  const currentClient = mockClients.find(c => c.id === clientId);
  const currentAnimal = currentClient?.animals.find(a => a.id === animalId);
  const animalSpecies = currentAnimal?.species === "Canino" ? "dog" : currentAnimal?.species === "Felino" ? "cat" : undefined;

  // Estado do formulário
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [examTime, setExamTime] = useState<string>(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [examType, setExamType] = useState<string | undefined>(undefined);
  const [examVet, setExamVet] = useState<string | undefined>(undefined);

  // Campos gerais do exame (para Hemograma e Bioquímico)
  const [material, setMaterial] = useState<string>("");
  const [equipamento, setEquipamento] = useState<string>("");
  const [laboratory, setLaboratory] = useState<string>("");
  const [laboratoryDate, setLaboratoryDate] = useState<string>("");
  const [liberadoPor, setLiberadoPor] = useState<string>("WILLIAM DE MORAES CARDOSO CRMV-SP 56895");
  const [observacoesGeraisExame, setObservacoesGeraisExame] = useState<string>("");

  // Campos específicos para Eritrograma
  const [eritrocitos, setEritrocitos] = useState<string>("");
  const [hemoglobina, setHemoglobina] = useState<string>("");
  const [hematocrito, setHematocrito] = useState<string>("");
  const [vcm, setVcm] = useState<string>("");
  const [hcm, setHcm] = useState<string>("");
  const [chcm, setChcm] = useState<string>("");
  const [proteinaTotal, setProteinaTotal] = useState<string>("");
  const [hemaciasNucleadas, setHemaciasNucleadas] = useState<string>("");
  const [observacoesSerieVermelha, setObservacoesSerieVermelha] = useState<string>("");

  // Campos específicos para Leucograma
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

  // Campos específicos para Plaquetas
  const [contagemPlaquetaria, setContagemPlaquetaria] = useState<string>("");
  const [avaliacaoPlaquetaria, setAvaliacaoPlaquetaria] = useState<string>("");

  // Campos específicos para Bioquímico
  const [biochemicals, setBiochemicals] = useState<BiochemicalEntry[]>([]);
  const [lastAddedBiochemicalId, setLastAddedBiochemicalId] = useState<string | null>(null);

  // Campo de resultado genérico (para outros exames)
  const [generalResult, setGeneralResult] = useState<string>("");

  // Campo Nota (para Hemograma)
  const [nota, setNota] = useState<string>("");

  // Função para resetar todos os campos específicos de exame
  const resetExamSpecificFields = () => {
    setMaterial("");
    setEquipamento("");
    setLaboratory("");
    setLaboratoryDate("");
    setLiberadoPor("WILLIAM DE MORAES CARDOSO CRMV-SP 56895");
    setObservacoesGeraisExame("");

    // Hemograma
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

    // Bioquímico
    setBiochemicals([]);

    // Outros
    setGeneralResult("");
  };

  // Carregar dados do exame se estiver em modo de edição
  useEffect(() => {
    if (isEditing && examId) {
      const examToEdit = mockExams.find(e => e.id === examId);
      if (examToEdit) {
        setExamDate(examToEdit.date);
        setExamTime(examToEdit.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setExamType(examToEdit.type);
        setExamVet(examToEdit.vet);

        // Campos gerais
        setMaterial(examToEdit.material || "");
        setEquipamento(examToEdit.equipamento || "");
        setLaboratory(examToEdit.laboratory || "");
        setLaboratoryDate(examToEdit.laboratoryDate || "");
        setLiberadoPor(examToEdit.liberadoPor || "WILLIAM DE MORAES CARDOSO CRMV-SP 56895");
        setObservacoesGeraisExame(examToEdit.observacoesGeraisExame || "");

        if (examToEdit.type === "Hemograma Completo") {
          setEritrocitos(examToEdit.eritrocitos || "");
          setHemoglobina(examToEdit.hemoglobina || "");
          setHematocrito(examToEdit.hematocrito || "");
          setVcm(examToEdit.vcm || "");
          setHcm(examToToEdit.hcm || "");
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
        } else if (examToEdit.type === "Bioquímico") {
          setBiochemicals(examToEdit.biochemicals || []);
          setMaterial(examToEdit.material || "Soro ou plasma"); // Default para bioquímico
          setEquipamento(examToEdit.equipamento || "Bioclin 2200"); // Default para bioquímico
        } else {
          setGeneralResult(examToEdit.result || "");
        }
      } else {
        toast.error("Exame não encontrado para edição.");
        navigate(`/clients/${clientId}/animals/${animalId}/record`);
      }
    } else {
      // Reset fields when adding a new exam
      resetExamSpecificFields();
      setExamDate(new Date().toISOString().split('T')[0]);
      setExamTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setExamType(undefined);
      setExamVet(undefined);
    }
  }, [isEditing, examId, clientId, animalId, navigate]);

  // Reset specific fields when examType changes (only if not editing, or if the type is actually changing)
  useEffect(() => {
    if (!isEditing || (isEditing && examType !== mockExams.find(e => e.id === examId)?.type)) {
      resetExamSpecificFields();
      // Set default material/equipment based on exam type
      if (examType === "Hemograma Completo") {
        setMaterial("SANGUE COM E.D.T.A.");
        setEquipamento("Mindray BC-2800Vet");
      } else if (examType === "Bioquímico") {
        setMaterial("Soro ou plasma");
        setEquipamento("Bioclin 2200");
      }
    }
  }, [examType, isEditing, examId]);


  const getReference = (param: string, type?: 'relative' | 'absolute' | 'full') => {
    if (!animalSpecies || !hemogramReferences[param]) return "N/A";

    const refData = hemogramReferences[param][animalSpecies];

    if (type === 'full' && refData.full) {
      return refData.full;
    } else if (type === 'relative' && refData.relative) {
      return refData.relative;
    } else if (type === 'absolute' && refData.absolute) {
      return refData.absolute;
    }
    return "N/A";
  };

  const handleAddBiochemical = () => {
    const newId = `bio-${Date.now()}`;
    setBiochemicals((prev) => [
      ...prev,
      {
        id: newId,
        enzymeName: "",
        material: "Soro ou plasma",
        metodologia: "Colorimétrico enzimático",
        equipamento: "Bioclin 2200",
        result: "",
      },
    ]);
    setLastAddedBiochemicalId(newId);
  };

  const handleUpdateBiochemical = (id: string, updatedBiochemical: Partial<BiochemicalEntry>) => {
    setBiochemicals((prev) =>
      prev.map((bio) => (bio.id === id ? { ...bio, ...updatedBiochemical } : bio))
    );
  };

  const handleDeleteBiochemical = (id: string) => {
    setBiochemicals((prev) => prev.filter((bio) => bio.id !== id));
  };

  const handleSaveExam = () => {
    if (!examDate || !examTime || !examType || !examVet) {
      toast.error("Por favor, preencha a data, hora, tipo de exame e veterinário.");
      return;
    }

    const examData: ExamEntry = {
      id: examId || `exam-${Date.now()}`, // Usar examId existente ou gerar novo
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
      if (biochemicals.length === 0) {
        toast.error("Adicione pelo menos uma enzima para o exame bioquímico.");
        return;
      }
      if (biochemicals.some(bio => !bio.enzymeName.trim() || !bio.result.trim())) {
        toast.error("Preencha o nome da enzima e o resultado para todos os parâmetros bioquímicos.");
        return;
      }
      examData.biochemicals = biochemicals.map(bio => ({
        ...bio,
        enzymeName: bio.enzymeName === "Outro" ? bio.customEnzymeName?.trim() || "" : bio.enzymeName,
        customEnzymeName: bio.enzymeName === "Outro" ? bio.customEnzymeName?.trim() : undefined,
      }));
    } else {
      examData.result = generalResult.trim() || undefined;
    }

    if (isEditing && examId) {
      updateMockExam(examData); // Atualiza o exame existente
      toast.success("Exame atualizado com sucesso!");
    } else {
      addMockExam(examData); // Adiciona um novo exame
      toast.success("Exame salvo com sucesso!");
    }
    navigate(`/clients/${clientId}/animals/${animalId}/record`); // Voltar para o prontuário
  };

  const pageTitle = isEditing ? "Editar Exame" : "Adicionar Exame";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaFlask className="h-5 w-5 text-muted-foreground" /> {pageTitle}
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

      <div className="flex-1 p-6">
        <Card className="shadow-sm border border-border rounded-md">
          <CardContent className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    {mockVets.map((vet) => (
                      <SelectItem key={vet.id} value={vet.name}>
                        {vet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {examType === "Hemograma Completo" || examType === "Bioquímico" ? (
              <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <FaMicroscope className="h-5 w-5 text-primary" /> Informações do Laboratório
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
            ) : null}


            {examType === "Hemograma Completo" ? (
              <>
                <div className="flex flex-col lg:flex-row gap-6 mt-6">
                  {/* Eritrograma Section */}
                  <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 w-full lg:w-[45%]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <FaFileMedicalAlt className="h-5 w-5 text-primary" /> Eritrograma
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-0 px-2"> {/* Ajustado padding horizontal */}
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

                  {/* Leucograma Section */}
                  <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 w-full lg:w-[55%]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <FaUserMd className="h-5 w-5 text-primary" /> Leucograma
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-0 px-2"> {/* Ajustado padding horizontal */}
                      <ExamFieldWithReference getReference={getReference} id="leucocitosTotais" label="Leucócitos totais" value={leucocitosTotais} onChange={(e) => setLeucocitosTotais(e.target.value)} referenceKey="leucocitosTotais" unit="/µL" />
                      
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="mielocitos" label="Mielócitos" relativeValue={mielocitosRelativo} onRelativeChange={(e) => setMielocitosRelativo(e.target.value)} absoluteValue={mielocitosAbsoluto} onAbsoluteChange={(e) => setMielocitosAbsoluto(e.target.value)} referenceKey="mielocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="metamielocitos" label="Metamielócitos" relativeValue={metamielocitosRelativo} onRelativeChange={(e) => setMetamielocitosRelativo(e.target.value)} absoluteValue={metamielocitosAbsoluto} onAbsoluteChange={(e) => setMetamielocitosAbsoluto(e.target.value)} referenceKey="metamielocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="bastonetes" label="Bastonetes" relativeValue={bastonetesRelativo} onRelativeChange={(e) => setBastonetesRelativo(e.target.value)} absoluteValue={bastonetesAbsoluto} onAbsoluteChange={(e) => setBastonetesAbsoluto(e.target.value)} referenceKey="bastonetes" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="segmentados" label="Segmentados" relativeValue={segmentadosRelativo} onRelativeChange={(e) => setSegmentadosRelativo(e.target.value)} absoluteValue={segmentadosAbsoluto} onAbsoluteChange={(e) => setSegmentadosAbsoluto(e.target.value)} referenceKey="segmentados" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="eosinofilos" label="Eosinófilos" relativeValue={eosinofilosRelativo} onRelativeChange={(e) => setEosinofilosRelativo(e.target.value)} absoluteValue={eosinofilosAbsoluto} onAbsoluteChange={(e) => setEosinofilosAbsoluto(e.target.value)} referenceKey="eosinofilos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="basofilos" label="Basófilos" relativeValue={basofilosRelativo} onRelativeChange={(e) => setBasofilosRelativo(e.target.value)} absoluteValue={basofilosAbsoluto} onAbsoluteChange={(e) => setBasofilosAbsoluto(e.target.value)} referenceKey="basofilos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="linfocitos" label="Linfócitos" relativeValue={linfocitosRelativo} onRelativeChange={(e) => setLinfocitosRelativo(e.target.value)} absoluteValue={linfocitosAbsoluto} onAbsoluteChange={(e) => setLinfocitosAbsoluto(e.target.value)} referenceKey="linfocitos" />
                      <LeukocyteFieldWithReference getReference={getReference} idPrefix="monocitos" label="Monócitos" relativeValue={monocitosRelativo} onRelativeChange={(e) => setMonocitosRelativo(e.target.value)} absoluteValue={monocitosAbsoluto} onAbsoluteChange={(e) => setMonocitosAbsoluto(e.target.value)} referenceKey="monocitos" />

                      <div className="space-y-2 col-span-full">
                        <Label htmlFor="observacoesSerieBranca" className="text-muted-foreground font-medium">Observações série branca</Label>
                        <Textarea id="observacoesSerieBranca" placeholder="Observações sobre a série branca" value={observacoesSerieBranca} onChange={(e) => setObservacoesSerieBranca(e.target.value)} rows={2} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plaquetas Section */}
                <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaFileMedicalAlt className="h-5 w-5 text-primary" /> Plaquetas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0 px-2"> {/* Ajustado padding horizontal */}
                    <ExamFieldWithReference getReference={getReference} id="contagemPlaquetaria" label="Contagem plaquetária" value={contagemPlaquetaria} onChange={(e) => setContagemPlaquetaria(e.target.value)} referenceKey="contagemPlaquetaria" unit="/µL" />
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="avaliacaoPlaquetaria" className="text-muted-foreground font-medium">Avaliação plaquetária</Label>
                      <Textarea id="avaliacaoPlaquetaria" placeholder="Avaliação qualitativa das plaquetas" value={avaliacaoPlaquetaria} onChange={(e) => setAvaliacaoPlaquetaria(e.target.value)} rows={2} className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200" />
                    </div>
                  </CardContent>
                </Card>

                {/* Campo Nota */}
                <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaNotesMedical className="h-5 w-5 text-primary" /> Nota
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
            ) : examType === "Bioquímico" ? (
              <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <FaFlask className="h-5 w-5 text-primary" /> Parâmetros Bioquímicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0 px-2">
                  {biochemicals.length === 0 && (
                    <p className="text-muted-foreground">Nenhum parâmetro bioquímico adicionado ainda.</p>
                  )}
                  {biochemicals.map((bio, index) => (
                    <BiochemicalExamForm
                      key={bio.id}
                      biochemical={bio}
                      index={index}
                      onUpdate={handleUpdateBiochemical}
                      onDelete={handleDeleteBiochemical}
                      shouldFocus={bio.id === lastAddedBiochemicalId}
                    />
                  ))}
                  <Button onClick={handleAddBiochemical} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    <FaPlus className="mr-2 h-4 w-4" /> Adicionar Enzima
                  </Button>
                </CardContent>
              </Card>
            ) : examType ? ( // Se um tipo de exame foi selecionado, mas não é Hemograma Completo nem Bioquímico
              <>
                <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaFileMedicalAlt className="h-5 w-5 text-primary" /> Resultado do Exame
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-2">
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="generalResult">Resultado</Label>
                      <Input
                        id="generalResult"
                        placeholder="Resultado do exame"
                        value={generalResult}
                        onChange={(e) => setGeneralResult(e.target.value)}
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FaNotesMedical className="h-5 w-5 text-primary" /> Observações Gerais do Exame
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
            ) : (
              <Card className="bg-muted/50 shadow-sm border border-border rounded-md p-4 mt-6 text-center">
                <CardContent className="py-4">
                  <p className="text-muted-foreground">Selecione um tipo de exame para preencher os detalhes.</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Link to={`/clients/${clientId}/animals/${animalId}/record`}>
            <Button variant="outline" className="w-full sm:w-auto bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
              <FaTimes className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </Link>
          <Button onClick={handleSaveExam} disabled={!examType} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
            <FaSave className="mr-2 h-4 w-4" /> Salvar Exame
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddExamPage;