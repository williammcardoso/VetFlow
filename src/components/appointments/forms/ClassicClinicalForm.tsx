import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ClassicClinicalDetails } from "@/types/appointment";

type Props = {
  pesoAtual: number | "";
  onPesoAtualChange: (v: number | "") => void;
  temperaturaCorporal: number | "";
  onTemperaturaCorporalChange: (v: number | "") => void;
  frequenciaCardiaca: number | "";
  onFrequenciaCardiacaChange: (v: number | "") => void;
  frequenciaRespiratoria: number | "";
  onFrequenciaRespiratoriaChange: (v: number | "") => void;

  details: ClassicClinicalDetails;
  onDetailsChange: (next: ClassicClinicalDetails) => void;
};

type ChecklistKey =
  | "queixaChecklist"
  | "anamneseChecklist"
  | "exameFisicoChecklist"
  | "avaliacaoSistemasChecklist"
  | "diagnosticoChecklist"
  | "condutaChecklist"
  | "prescricaoChecklist"
  | "examesSolicitadosChecklist"
  | "orientacoesChecklist";

type TemplateId = "gastro" | "dermato" | "checkup" | "resp" | "";

const OPTIONS = {
  queixa: ["Vômito", "Diarreia", "Prurido", "Tosse", "Apatia", "Claudicação", "Anorexia"],
  anamnese: ["Início agudo", "Progressivo", "Contato com outros animais", "Mudança de dieta", "Acesso à rua", "Uso de medicação"],
  exameFisico: ["Desidratação", "Dor à palpação", "Alteração de mucosas", "Ausculta alterada", "Lesões cutâneas"],
  sistemas: ["Digestório", "Respiratório", "Dermatológico", "Urinário", "Neurológico", "Ortopédico"],
  diagnostico: ["Hipótese principal", "Diferenciais", "Confirmar com exames", "Quadro compatível com histórico"],
  conduta: ["Tratamento instituído", "Ajuste alimentar", "Reavaliação", "Encaminhamento", "Internação"],
  prescricao: ["Antibiótico", "Anti-inflamatório", "Analgésico", "Antiemético", "Protetor gástrico", "Antipruriginoso"],
  exames: ["Hemograma", "Bioquímica", "US", "RX", "Parasitológico", "Citologia"],
  orientacoes: ["Orientações ao tutor", "Sinais de alerta", "Retorno em X dias", "Restrição de atividade", "Jejum", "Hidratação"],
} as const;

const TEMPLATE_MAP: Record<Exclude<TemplateId, "">, Partial<Record<ChecklistKey, string[]>>> = {
  gastro: {
    queixaChecklist: ["Vômito", "Diarreia", "Anorexia"],
    anamneseChecklist: ["Mudança de dieta", "Início agudo"],
    avaliacaoSistemasChecklist: ["Digestório"],
    examesSolicitadosChecklist: ["Hemograma", "Bioquímica", "US"],
  },
  dermato: {
    queixaChecklist: ["Prurido"],
    avaliacaoSistemasChecklist: ["Dermatológico"],
    examesSolicitadosChecklist: ["Citologia", "Parasitológico"],
  },
  checkup: {
    queixaChecklist: ["Apatia"],
    avaliacaoSistemasChecklist: ["Digestório", "Respiratório"],
    examesSolicitadosChecklist: ["Hemograma", "Bioquímica"],
  },
  resp: {
    queixaChecklist: ["Tosse", "Apatia"],
    avaliacaoSistemasChecklist: ["Respiratório"],
    examesSolicitadosChecklist: ["RX", "Hemograma"],
  },
};

function toggle(arr: string[] | undefined, value: string, checked: boolean) {
  const set = new Set(arr || []);
  if (checked) set.add(value);
  else set.delete(value);
  return Array.from(set);
}

function buildConsolidatedText(d: ClassicClinicalDetails) {
  const lines: string[] = [];
  const pushSection = (title: string, selected?: string[], obs?: string) => {
    const hasAny = (selected && selected.length > 0) || (obs && obs.trim());
    if (!hasAny) return;
    lines.push(`== ${title} ==`);
    if (selected && selected.length > 0) lines.push(`- Itens: ${selected.join(", ")}`);
    if (obs && obs.trim()) lines.push(`- Observações: ${obs.trim()}`);
    lines.push("");
  };

  pushSection("Queixa Principal", d.queixaChecklist, d.queixaObs);
  pushSection("Anamnese", d.anamneseChecklist, d.anamneseObs);
  pushSection("Exame Físico", d.exameFisicoChecklist, d.exameFisicoObs);
  pushSection("Avaliação por Sistemas", d.avaliacaoSistemasChecklist, d.avaliacaoSistemasObs);
  pushSection("Diagnóstico / Hipóteses", d.diagnosticoChecklist, d.diagnosticoObs);
  pushSection("Conduta", d.condutaChecklist, d.condutaObs);
  pushSection("Prescrição", d.prescricaoChecklist, d.prescricaoObs);
  pushSection("Exames solicitados", d.examesSolicitadosChecklist, d.examesSolicitadosObs);
  pushSection("Orientações / Retorno", d.orientacoesChecklist, d.orientacoesObs);

  // Campos livres (compatibilidade)
  if (d.queixaPrincipal?.trim()) {
    lines.unshift(`Queixa principal (texto): ${d.queixaPrincipal.trim()}`, "");
  }

  return lines.join("\n").trim();
}

export default function ClassicClinicalForm({
  pesoAtual,
  onPesoAtualChange,
  temperaturaCorporal,
  onTemperaturaCorporalChange,
  frequenciaCardiaca,
  onFrequenciaCardiacaChange,
  frequenciaRespiratoria,
  onFrequenciaRespiratoriaChange,
  details,
  onDetailsChange,
}: Props) {
  const patch = (p: Partial<ClassicClinicalDetails>) => onDetailsChange({ ...details, ...p });

  const consolidated = useMemo(() => buildConsolidatedText(details), [details]);

  // Mantém texto consolidado sempre atualizado (para impressão e legibilidade)
  useEffect(() => {
    if ((details.textoConsolidado || "") !== consolidated) {
      patch({ textoConsolidado: consolidated });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consolidated]);

  const setTemplate = (tpl: TemplateId) => {
    patch({ templateId: tpl });
    if (!tpl) return;
    const apply = TEMPLATE_MAP[tpl];
    patch({
      queixaChecklist: apply.queixaChecklist || details.queixaChecklist || [],
      anamneseChecklist: apply.anamneseChecklist || details.anamneseChecklist || [],
      avaliacaoSistemasChecklist: apply.avaliacaoSistemasChecklist || details.avaliacaoSistemasChecklist || [],
      examesSolicitadosChecklist: apply.examesSolicitadosChecklist || details.examesSolicitadosChecklist || [],
    });
  };

  const Section = ({
    title,
    options,
    keyName,
    obsKey,
    obsPlaceholder,
  }: {
    title: string;
    options: readonly string[];
    keyName: ChecklistKey;
    obsKey: keyof ClassicClinicalDetails;
    obsPlaceholder: string;
  }) => {
    const selected = (details as any)[keyName] as string[] | undefined;
    const obs = (details as any)[obsKey] as string | undefined;

    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted/30">
                <Checkbox
                  checked={(selected || []).includes(opt)}
                  onCheckedChange={(v) =>
                    patch({
                      [keyName]: toggle(selected, opt, !!v),
                    } as any)
                  }
                />
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={obs || ""}
              onChange={(e) => patch({ [obsKey]: e.target.value } as any)}
              rows={3}
              placeholder={obsPlaceholder}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Templates clínicos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select
              value={(details.templateId as string) || undefined}
              onValueChange={(v) => setTemplate(v === "none" ? "" : (v as TemplateId))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gastro">Gastrointestinal</SelectItem>
                <SelectItem value="dermato">Dermatológico</SelectItem>
                <SelectItem value="checkup">Check-up</SelectItem>
                <SelectItem value="resp">Respiratório</SelectItem>
                <SelectItem value="none">Sem template</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Selecionar um template marca automaticamente checkboxes relacionados.</p>
          </div>

          <div className="space-y-2">
            <Label>Queixa principal (texto curto)</Label>
            <Input
              value={details.queixaPrincipal || ""}
              onChange={(e) => patch({ queixaPrincipal: e.target.value })}
              placeholder="Ex.: Vômito e diarreia"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sinais vitais / medidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={pesoAtual}
              onChange={(e) => onPesoAtualChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Temperatura (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperaturaCorporal}
              onChange={(e) => onTemperaturaCorporalChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>FC</Label>
            <Input
              type="number"
              value={frequenciaCardiaca}
              onChange={(e) => onFrequenciaCardiacaChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>FR</Label>
            <Input
              type="number"
              value={frequenciaRespiratoria}
              onChange={(e) => onFrequenciaRespiratoriaChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Section
        title="Queixa Principal"
        options={OPTIONS.queixa}
        keyName="queixaChecklist"
        obsKey="queixaObs"
        obsPlaceholder="Detalhes adicionais da queixa principal..."
      />

      <Section
        title="Anamnese"
        options={OPTIONS.anamnese}
        keyName="anamneseChecklist"
        obsKey="anamneseObs"
        obsPlaceholder="Histórico, evolução, fatores associados..."
      />

      <Section
        title="Exame Físico"
        options={OPTIONS.exameFisico}
        keyName="exameFisicoChecklist"
        obsKey="exameFisicoObs"
        obsPlaceholder="Achados do exame físico..."
      />

      <Section
        title="Avaliação por Sistemas"
        options={OPTIONS.sistemas}
        keyName="avaliacaoSistemasChecklist"
        obsKey="avaliacaoSistemasObs"
        obsPlaceholder="Resumo por sistemas..."
      />

      <Section
        title="Diagnóstico / Hipóteses"
        options={OPTIONS.diagnostico}
        keyName="diagnosticoChecklist"
        obsKey="diagnosticoObs"
        obsPlaceholder="Hipótese principal, diferenciais, raciocínio clínico..."
      />

      <Section
        title="Conduta"
        options={OPTIONS.conduta}
        keyName="condutaChecklist"
        obsKey="condutaObs"
        obsPlaceholder="Tratamento instituído, plano e follow-up..."
      />

      <Section
        title="Prescrição"
        options={OPTIONS.prescricao}
        keyName="prescricaoChecklist"
        obsKey="prescricaoObs"
        obsPlaceholder="Medicações, posologia, duração..."
      />

      <Section
        title="Exames Solicitados"
        options={OPTIONS.exames}
        keyName="examesSolicitadosChecklist"
        obsKey="examesSolicitadosObs"
        obsPlaceholder="Exames adicionais / observações..."
      />

      <Section
        title="Orientações / Retorno"
        options={OPTIONS.orientacoes}
        keyName="orientacoesChecklist"
        obsKey="orientacoesObs"
        obsPlaceholder="Orientações ao tutor e retorno recomendado..."
      />

      <Separator />

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Texto consolidado (para impressão)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={details.textoConsolidado || ""} readOnly rows={10} className="font-mono text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}