import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { ConsultationDetails } from "@/types/appointment";

type YesNo = "sim" | "nao" | "";

type Props = {
  dateISO: string;

  pesoAtual: number | "";
  onPesoAtualChange: (v: number | "") => void;
  temperaturaCorporal: number | "";
  onTemperaturaCorporalChange: (v: number | "") => void;
  frequenciaCardiaca: number | "";
  onFrequenciaCardiacaChange: (v: number | "") => void;
  frequenciaRespiratoria: number | "";
  onFrequenciaRespiratoriaChange: (v: number | "") => void;

  details: ConsultationDetails;
  onDetailsChange: (next: ConsultationDetails) => void;
};

function addDaysISO(dateISO: string, days: number) {
  if (!dateISO || !days || Number.isNaN(days)) return "";
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function toggle(list: string[] | undefined, value: string, checked: boolean) {
  const set = new Set(list || []);
  if (checked) set.add(value);
  else set.delete(value);
  return Array.from(set);
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function YesNoField({
  label,
  value,
  onChange,
  showWhen,
  children,
}: {
  label: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
  showWhen: "sim" | "nao";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as YesNo)} className="flex gap-4">
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${label}-sim`} value="sim" />
          <Label htmlFor={`${label}-sim`}>Sim</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${label}-nao`} value="nao" />
          <Label htmlFor={`${label}-nao`}>Não</Label>
        </div>
      </RadioGroup>
      {value === showWhen && <div className="pt-1">{children}</div>}
    </div>
  );
}

function CheckboxGrid({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[] | undefined;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted/30"
          >
            <Checkbox
              checked={(value || []).includes(opt)}
              onCheckedChange={(v) => onChange(toggle(value, opt, !!v))}
            />
            <span className="text-sm text-foreground">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LegacyConsultationForm({
  dateISO,
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
  const patch = (p: Partial<ConsultationDetails>) => onDetailsChange({ ...details, ...p });

  const retornoEmDias = details.retornoRecomendadoEmDias || 0;
  const suggestedReturnDate = retornoEmDias ? addDaysISO(dateISO, retornoEmDias) : "";

  const canShowExam = details.exameFisicoRealizado !== "nao";

  const alimentacaoTipo = details.alimentacaoTipo || "";

  const diagnosticSummary = useMemo(() => {
    return (
      details.suspeitaDiagnostica ||
      details.diagnosticoPresuntivo ||
      details.diagnosticoDefinitivo ||
      details.condutaTratamento ||
      ""
    );
  }, [
    details.suspeitaDiagnostica,
    details.diagnosticoPresuntivo,
    details.diagnosticoDefinitivo,
    details.condutaTratamento,
  ]);

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sinais vitais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Peso atual (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={pesoAtual}
              onChange={(e) => onPesoAtualChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Temperatura corporal (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperaturaCorporal}
              onChange={(e) => onTemperaturaCorporalChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequência Cardíaca (bpm)</Label>
            <Input
              type="number"
              value={frequenciaCardiaca}
              onChange={(e) => onFrequenciaCardiacaChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequência Respiratória (mpm)</Label>
            <Input
              type="number"
              value={frequenciaRespiratoria}
              onChange={(e) => onFrequenciaRespiratoriaChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["queixa", "anam", "diag"]} className="w-full">
        <AccordionItem value="queixa">
          <AccordionTrigger className="text-sm font-semibold">Queixa Principal</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-2">
              <Label>Queixa principal *</Label>
              <Textarea
                value={details.queixaPrincipal || ""}
                onChange={(e) => patch({ queixaPrincipal: e.target.value })}
                placeholder="Descreva a queixa principal do tutor..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="anam">
          <AccordionTrigger className="text-sm font-semibold">Anamnese</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-4">
              <FieldRow>
                <div className="space-y-2">
                  <Label>Vacinação do paciente</Label>
                  <RadioGroup
                    value={details.vacinacaoPaciente || ""}
                    onValueChange={(v) =>
                      patch({
                        vacinacaoPaciente: v as any,
                        vacinacaoPacienteObs: v === "nao" ? details.vacinacaoPacienteObs || "" : "",
                      })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="vac-sim" value="sim" />
                      <Label htmlFor="vac-sim">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="vac-nao" value="nao" />
                      <Label htmlFor="vac-nao">Não</Label>
                    </div>
                  </RadioGroup>
                  {details.vacinacaoPaciente === "nao" && (
                    <Input
                      value={details.vacinacaoPacienteObs || ""}
                      onChange={(e) => patch({ vacinacaoPacienteObs: e.target.value })}
                      placeholder="Observações"
                    />
                  )}
                </div>

                <YesNoField
                  label="Possibilidade de Intoxicação"
                  value={(details.possibilidadeIntoxicacao as YesNo) || ""}
                  onChange={(v) => patch({ possibilidadeIntoxicacao: v as any, possibilidadeIntoxicacaoObs: v === "sim" ? details.possibilidadeIntoxicacaoObs || "" : "" })}
                  showWhen="sim"
                >
                  <Input
                    value={details.possibilidadeIntoxicacaoObs || ""}
                    onChange={(e) => patch({ possibilidadeIntoxicacaoObs: e.target.value })}
                    placeholder="Descreva a suspeita"
                  />
                </YesNoField>

                <YesNoField
                  label="Histórico Cirúrgico"
                  value={(details.historicoCirurgico as YesNo) || ""}
                  onChange={(v) => patch({ historicoCirurgico: v as any, historicoCirurgicoQuais: v === "sim" ? details.historicoCirurgicoQuais || "" : "" })}
                  showWhen="sim"
                >
                  <Input
                    value={details.historicoCirurgicoQuais || ""}
                    onChange={(e) => patch({ historicoCirurgicoQuais: e.target.value })}
                    placeholder="Quais cirurgias?"
                  />
                </YesNoField>

                <div className="space-y-2">
                  <Label>Histórico Geral</Label>
                  <Textarea
                    value={details.historicoClinico || ""}
                    onChange={(e) => patch({ historicoClinico: e.target.value })}
                    rows={3}
                    placeholder="Histórico e evolução..."
                  />
                </div>

                <YesNoField
                  label="Uso de Medicação"
                  value={(details.usoMedicacao as YesNo) || ""}
                  onChange={(v) => patch({ usoMedicacao: v as any, usoMedicacaoQuais: v === "sim" ? details.usoMedicacaoQuais || "" : "" })}
                  showWhen="sim"
                >
                  <Input
                    value={details.usoMedicacaoQuais || ""}
                    onChange={(e) => patch({ usoMedicacaoQuais: e.target.value })}
                    placeholder="Quais medicamentos?"
                  />
                </YesNoField>

                <YesNoField
                  label="Alergias do paciente"
                  value={(details.alergiasPaciente as YesNo) || ""}
                  onChange={(v) => patch({ alergiasPaciente: v as any, alergiasPacienteObs: v === "sim" ? details.alergiasPacienteObs || "" : "" })}
                  showWhen="sim"
                >
                  <Input
                    value={details.alergiasPacienteObs || ""}
                    onChange={(e) => patch({ alergiasPacienteObs: e.target.value })}
                    placeholder="Descreva as alergias"
                  />
                </YesNoField>
              </FieldRow>

              <Separator />

              <FieldRow>
                <div className="space-y-2">
                  <Label>Alimentação</Label>
                  <Select
                    value={alimentacaoTipo}
                    onValueChange={(v) => patch({ alimentacaoTipo: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="racaoSeca">Ração seca</SelectItem>
                      <SelectItem value="racaoUmida">Ração úmida</SelectItem>
                      <SelectItem value="mista">Mista</SelectItem>
                      <SelectItem value="alimentacaoCaseira">Alimentação caseira</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={details.alimentacaoObs || ""}
                    onChange={(e) => patch({ alimentacaoObs: e.target.value })}
                    placeholder="Observações sobre alimentação"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <CheckboxGrid
                    label="Estado de apetite e deglutição"
                    options={[
                      "Normorexia",
                      "Hiporexia",
                      "Anorexia",
                      "Polifagia",
                      "Apetite seletivo",
                      "Disfagia",
                      "Odinofagia",
                    ]}
                    value={details.apetiteDegluticao}
                    onChange={(next) => patch({ apetiteDegluticao: next })}
                  />
                  <Textarea
                    value={details.apetiteDegluticaoObs || ""}
                    onChange={(e) => patch({ apetiteDegluticaoObs: e.target.value })}
                    placeholder="Observações sobre apetite e deglutição"
                    rows={2}
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <CheckboxGrid
                    label="Ingestão de água"
                    options={["Normodipsia", "Polidipsia", "Oligodipsia", "Adipsia"]}
                    value={details.ingestaoAgua}
                    onChange={(next) => patch({ ingestaoAgua: next })}
                  />
                </div>
              </FieldRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="digestorio">
          <AccordionTrigger className="text-sm font-semibold">Sistema Digestório</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-4">
              <YesNoField
                label="Êmese e Regurgitação"
                value={(details.emeseRegurgitacao as YesNo) || ""}
                onChange={(v) => patch({ emeseRegurgitacao: v as any })}
                showWhen="sim"
              >
                <FieldRow>
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      value={details.emeseRegurgitacaoComplementoInicio || ""}
                      onChange={(e) => patch({ emeseRegurgitacaoComplementoInicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      value={details.emeseRegurgitacaoComplementoQuantidade || ""}
                      onChange={(e) => patch({ emeseRegurgitacaoComplementoQuantidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input
                      value={details.emeseRegurgitacaoComplementoFrequencia || ""}
                      onChange={(e) => patch({ emeseRegurgitacaoComplementoFrequencia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aspecto</Label>
                    <Input
                      value={details.emeseRegurgitacaoComplementoAspecto || ""}
                      onChange={(e) => patch({ emeseRegurgitacaoComplementoAspecto: e.target.value })}
                    />
                  </div>
                </FieldRow>
              </YesNoField>

              <YesNoField
                label="Micção"
                value={(details.miccaoNormal as YesNo) || ""}
                onChange={(v) => patch({ miccaoNormal: v as any })}
                showWhen="nao"
              >
                <FieldRow>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input
                      value={details.miccaoFrequencia || ""}
                      onChange={(e) => patch({ miccaoFrequencia: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aspecto</Label>
                    <Input
                      value={details.miccaoAspecto || ""}
                      onChange={(e) => patch({ miccaoAspecto: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <CheckboxGrid
                      label="Alterações"
                      options={["Polaciúria", "Poliúria", "Disúria", "Hematúria", "Oligúria", "Anúria", "Incontinência"]}
                      value={details.miccaoAlteracoes}
                      onChange={(next) => patch({ miccaoAlteracoes: next })}
                    />
                  </div>
                </FieldRow>
              </YesNoField>

              <div className="space-y-3">
                <CheckboxGrid
                  label="Fezes e Defecações"
                  options={["Normoquesia", "Hematoquesia", "Disquezia", "Tenesmo", "Melena", "Diarreia", "Constipação"]}
                  value={details.fezesDefecacoes}
                  onChange={(next) => patch({ fezesDefecacoes: next })}
                />
                <Textarea
                  value={details.fezesDefecacoesComplemento || ""}
                  onChange={(e) => patch({ fezesDefecacoesComplemento: e.target.value })}
                  placeholder="Complemento sobre fezes e defecações"
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="respiratorio">
          <AccordionTrigger className="text-sm font-semibold">Sistema Respiratório</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-4">
              <YesNoField
                label="Alterações Respiratórias"
                value={(details.alteracoesRespiratorias as YesNo) || ""}
                onChange={(v) => patch({ alteracoesRespiratorias: v as any })}
                showWhen="sim"
              >
                <CheckboxGrid
                  label="Tipos"
                  options={["Tosse", "Espirros", "Dispneia", "Taquipneia", "Secreção nasal", "Intolerância ao exercício"]}
                  value={details.alteracoesRespiratoriasTipos}
                  onChange={(next) => patch({ alteracoesRespiratoriasTipos: next })}
                />
              </YesNoField>

              <FieldRow>
                <YesNoField
                  label="Tosse"
                  value={(details.tosse as YesNo) || ""}
                  onChange={(v) => patch({ tosse: v as any })}
                  showWhen="sim"
                >
                  <FieldRow>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input value={details.tossePeriodo || ""} onChange={(e) => patch({ tossePeriodo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Input value={details.tosseFrequencia || ""} onChange={(e) => patch({ tosseFrequencia: e.target.value })} />
                    </div>
                  </FieldRow>
                </YesNoField>

                <YesNoField
                  label="Espirros"
                  value={(details.espirros as YesNo) || ""}
                  onChange={(v) => patch({ espirros: v as any })}
                  showWhen="sim"
                >
                  <FieldRow>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input value={details.espirrosPeriodo || ""} onChange={(e) => patch({ espirrosPeriodo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Input value={details.espirrosFrequencia || ""} onChange={(e) => patch({ espirrosFrequencia: e.target.value })} />
                    </div>
                  </FieldRow>
                </YesNoField>

                <YesNoField
                  label="Intolerância ao Exercício"
                  value={(details.intoleranciaExercicio as YesNo) || ""}
                  onChange={(v) => patch({ intoleranciaExercicio: v as any })}
                  showWhen="sim"
                >
                  <div className="space-y-3">
                    <CheckboxGrid
                      label="Tipos"
                      options={["Cansaço fácil", "Síncope", "Dispneia", "Tosse ao exercício"]}
                      value={details.intoleranciaExercicioTipos}
                      onChange={(next) => patch({ intoleranciaExercicioTipos: next })}
                    />
                    <Input
                      value={details.intoleranciaExercicioObs || ""}
                      onChange={(e) => patch({ intoleranciaExercicioObs: e.target.value })}
                      placeholder="Observações"
                    />
                  </div>
                </YesNoField>
              </FieldRow>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="exame">
          <AccordionTrigger className="text-sm font-semibold">Exame Físico</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-4">
              <FieldRow>
                <div className="space-y-2">
                  <Label>Exame físico realizado?</Label>
                  <RadioGroup
                    value={details.exameFisicoRealizado || ""}
                    onValueChange={(v) => patch({ exameFisicoRealizado: v as any })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="ef-sim" value="sim" />
                      <Label htmlFor="ef-sim">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="ef-nao" value="nao" />
                      <Label htmlFor="ef-nao">Não</Label>
                    </div>
                  </RadioGroup>
                </div>

                <YesNoField
                  label="Foi necessário uso de contenção?"
                  value={(details.usoContencao as YesNo) || ""}
                  onChange={(v) => patch({ usoContencao: v as any, usoContencaoQual: v === "sim" ? details.usoContencaoQual || "" : "" })}
                  showWhen="sim"
                >
                  <Input
                    value={details.usoContencaoQual || ""}
                    onChange={(e) => patch({ usoContencaoQual: e.target.value })}
                    placeholder="Qual forma de contenção?"
                  />
                </YesNoField>

                <div className="space-y-2 md:col-span-2">
                  <Label>Observações do exame físico</Label>
                  <Textarea
                    value={details.exameFisicoObs || ""}
                    onChange={(e) => patch({ exameFisicoObs: e.target.value })}
                    rows={3}
                  />
                </div>
              </FieldRow>

              {!canShowExam ? (
                <div className="text-sm text-muted-foreground">Exame físico marcado como não realizado.</div>
              ) : (
                <>
                  <Separator />

                  <Accordion type="multiple" defaultValue={["cabeca", "viscera", "linfonodos"]} className="w-full">
                    <AccordionItem value="cabeca">
                      <AccordionTrigger className="text-sm font-semibold">Cabeça e Pescoço</AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 space-y-4">
                          <FieldRow>
                            <YesNoField
                              label="Secreção nasal"
                              value={(details.secrecaoNasal as YesNo) || ""}
                              onChange={(v) => patch({ secrecaoNasal: v as any })}
                              showWhen="sim"
                            >
                              <FieldRow>
                                <div className="space-y-2">
                                  <Label>Início</Label>
                                  <Input
                                    value={details.secrecaoNasalComplementoInicio || ""}
                                    onChange={(e) => patch({ secrecaoNasalComplementoInicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Aspecto/quantidade</Label>
                                  <Input
                                    value={details.secrecaoNasalComplementoAspectoQuantidade || ""}
                                    onChange={(e) => patch({ secrecaoNasalComplementoAspectoQuantidade: e.target.value })}
                                  />
                                </div>
                              </FieldRow>
                            </YesNoField>

                            <YesNoField
                              label="Secreção ocular"
                              value={(details.secrecaoOcular as YesNo) || ""}
                              onChange={(v) => patch({ secrecaoOcular: v as any })}
                              showWhen="sim"
                            >
                              <FieldRow>
                                <div className="space-y-2">
                                  <Label>Início</Label>
                                  <Input
                                    value={details.secrecaoOcularComplementoInicio || ""}
                                    onChange={(e) => patch({ secrecaoOcularComplementoInicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Aspecto/quantidade</Label>
                                  <Input
                                    value={details.secrecaoOcularComplementoAspectoQuantidade || ""}
                                    onChange={(e) => patch({ secrecaoOcularComplementoAspectoQuantidade: e.target.value })}
                                  />
                                </div>
                              </FieldRow>
                            </YesNoField>

                            <div className="space-y-2">
                              <Label>Olhos</Label>
                              <Select
                                value={details.olhosEstado || ""}
                                onValueChange={(v) => patch({ olhosEstado: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o estado dos olhos" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    "Normal",
                                    "Secreção",
                                    "Conjuntivite",
                                    "Opacidade",
                                    "Úlcera",
                                    "Prurido",
                                    "Outros",
                                  ].map((x) => (
                                    <SelectItem key={x} value={x}>
                                      {x}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Textarea
                                value={details.olhosObs || ""}
                                onChange={(e) => patch({ olhosObs: e.target.value })}
                                rows={2}
                                placeholder="Observações sobre os olhos"
                              />
                            </div>

                            <div className="space-y-3">
                              <CheckboxGrid
                                label="Orelhas"
                                options={["Prurido", "Descarga", "Odores", "Lesões", "NDA"]}
                                value={details.orelhasAlteracoes}
                                onChange={(next) => patch({ orelhasAlteracoes: next })}
                              />
                            </div>

                            <YesNoField
                              label="Boca e anexos"
                              value={(details.bocaAnexos as YesNo) || ""}
                              onChange={(v) => patch({ bocaAnexos: v as any, bocaAnexosDescricao: v === "sim" ? details.bocaAnexosDescricao || "" : "" })}
                              showWhen="sim"
                            >
                              <Input
                                value={details.bocaAnexosDescricao || ""}
                                onChange={(e) => patch({ bocaAnexosDescricao: e.target.value })}
                                placeholder="Descreva"
                              />
                            </YesNoField>

                            <YesNoField
                              label="Doença periodontal"
                              value={(details.doencaPeriodontal as YesNo) || ""}
                              onChange={(v) => patch({ doencaPeriodontal: v as any, doencaPeriodontalGrau: v === "sim" ? details.doencaPeriodontalGrau || "" : "" })}
                              showWhen="sim"
                            >
                              <Select
                                value={details.doencaPeriodontalGrau || ""}
                                onValueChange={(v) => patch({ doencaPeriodontalGrau: v as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Grau" />
                                </SelectTrigger>
                                <SelectContent>
                                  {["1", "2", "3", "4"].map((g) => (
                                    <SelectItem key={g} value={g}>
                                      Grau {g}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </YesNoField>

                            <YesNoField
                              label="Pescoço e coluna"
                              value={(details.pescocoColuna as YesNo) || ""}
                              onChange={(v) => patch({ pescocoColuna: v as any, pescocoColunaDescricao: v === "sim" ? details.pescocoColunaDescricao || "" : "" })}
                              showWhen="sim"
                            >
                              <Input
                                value={details.pescocoColunaDescricao || ""}
                                onChange={(e) => patch({ pescocoColunaDescricao: e.target.value })}
                                placeholder="Descreva"
                              />
                            </YesNoField>
                          </FieldRow>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="viscera">
                      <AccordionTrigger className="text-sm font-semibold">Víscera e Abdômen</AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 space-y-4">
                          <FieldRow>
                            <YesNoField
                              label="Desconforto abdominal"
                              value={(details.desconfortoAbdominal as YesNo) || ""}
                              onChange={(v) => patch({ desconfortoAbdominal: v as any })}
                              showWhen="sim"
                            >
                              <FieldRow>
                                <div className="space-y-2">
                                  <Label>Região/sensibilidade</Label>
                                  <Input
                                    value={details.desconfortoAbdominalRegiaoSensibilidade || ""}
                                    onChange={(e) => patch({ desconfortoAbdominalRegiaoSensibilidade: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Nível de dor</Label>
                                  <Input
                                    value={details.desconfortoAbdominalNivelDor || ""}
                                    onChange={(e) => patch({ desconfortoAbdominalNivelDor: e.target.value })}
                                  />
                                </div>
                              </FieldRow>
                            </YesNoField>

                            <YesNoField
                              label="Aumento de volume abdominal"
                              value={(details.aumentoVolumeAbdominal as YesNo) || ""}
                              onChange={(v) => patch({ aumentoVolumeAbdominal: v as any, aumentoVolumeAbdominalRegiao: v === "sim" ? details.aumentoVolumeAbdominalRegiao || "" : "" })}
                              showWhen="sim"
                            >
                              <Input
                                value={details.aumentoVolumeAbdominalRegiao || ""}
                                onChange={(e) => patch({ aumentoVolumeAbdominalRegiao: e.target.value })}
                                placeholder="Região"
                              />
                            </YesNoField>

                            <div className="space-y-3 md:col-span-2">
                              <CheckboxGrid
                                label="Mucosas"
                                options={["Normocoradas", "Hipocoradas", "Ictéricas", "Hiperêmicas", "Cianóticas", "Congestas"]}
                                value={details.mucosasEstado}
                                onChange={(next) => patch({ mucosasEstado: next })}
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label>Obs. Ausculta Respiratória</Label>
                              <Textarea
                                value={details.frequenciaRespiratoriaObsAusculta || ""}
                                onChange={(e) => patch({ frequenciaRespiratoriaObsAusculta: e.target.value })}
                                rows={2}
                              />
                            </div>

                            <div className="space-y-3 md:col-span-2">
                              <CheckboxGrid
                                label="Padrão respiratório"
                                options={["Dispneia", "Normal", "Taquipneia", "Bradipneia", "Apneia"]}
                                value={details.padraoRespiratorio}
                                onChange={(next) => patch({ padraoRespiratorio: next })}
                              />
                            </div>

                            <YesNoField
                              label="Sopro"
                              value={(details.sopro as YesNo) || ""}
                              onChange={(v) => patch({ sopro: v as any })}
                              showWhen="sim"
                            >
                              <div className="text-xs text-muted-foreground">Sopro informado como presente.</div>
                            </YesNoField>

                            <div className="space-y-2 md:col-span-2">
                              <Label>Obs. Ausculta Cardíaca</Label>
                              <Textarea
                                value={details.frequenciaCardiacaObsAusculta || ""}
                                onChange={(e) => patch({ frequenciaCardiacaObsAusculta: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </FieldRow>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="linfonodos">
                      <AccordionTrigger className="text-sm font-semibold">Linfonodos e Pele</AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 space-y-4">
                          <FieldRow>
                            <div className="space-y-2">
                              <Label>Linfonodos</Label>
                              <Select
                                value={details.linfonodosEstado || ""}
                                onValueChange={(v) => patch({ linfonodosEstado: v as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="infartado">Infartado</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={details.linfonodosAlteracaoQualObs || ""}
                                onChange={(e) => patch({ linfonodosAlteracaoQualObs: e.target.value })}
                                placeholder="Obs.: alterações, quais?"
                              />
                            </div>

                            <div className="space-y-3 md:col-span-2">
                              <CheckboxGrid
                                label="Pele e Anexos"
                                options={["Prurido", "Descamação", "Odores", "Lesões", "Alopecia", "Nódulos"]}
                                value={details.peleAnexosAlteracoes}
                                onChange={(next) => patch({ peleAnexosAlteracoes: next })}
                              />
                              <Textarea
                                value={details.peleAnexosDescricao || ""}
                                onChange={(e) => patch({ peleAnexosDescricao: e.target.value })}
                                rows={2}
                                placeholder="Observações, localização, extensão..."
                              />
                            </div>
                          </FieldRow>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="diag">
          <AccordionTrigger className="text-sm font-semibold">Diagnóstico e Tratamento</AccordionTrigger>
          <AccordionContent>
            <div className="pt-2 space-y-4">
              {diagnosticSummary && (
                <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Resumo:</span> {diagnosticSummary}
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações e Ocorrências</Label>
                <Textarea
                  value={details.observacoesOcorrencias || ""}
                  onChange={(e) => patch({ observacoesOcorrencias: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Exames solicitados</Label>
                <Textarea
                  value={details.examesSolicitados || ""}
                  onChange={(e) => patch({ examesSolicitados: e.target.value })}
                  rows={3}
                />
              </div>

              <FieldRow>
                <div className="space-y-2">
                  <Label>Suspeita diagnóstica</Label>
                  <Input
                    value={details.suspeitaDiagnostica || ""}
                    onChange={(e) => patch({ suspeitaDiagnostica: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico diferencial</Label>
                  <Input
                    value={details.diagnosticoDiferencial || ""}
                    onChange={(e) => patch({ diagnosticoDiferencial: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Procedimento realizado durante a consulta</Label>
                  <Input
                    value={details.procedimentoRealizadoConsulta || ""}
                    onChange={(e) => patch({ procedimentoRealizadoConsulta: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico presuntivo</Label>
                  <Input
                    value={details.diagnosticoPresuntivo || ""}
                    onChange={(e) => patch({ diagnosticoPresuntivo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico definitivo</Label>
                  <Input
                    value={details.diagnosticoDefinitivo || ""}
                    onChange={(e) => patch({ diagnosticoDefinitivo: e.target.value })}
                  />
                </div>
              </FieldRow>

              <div className="space-y-2">
                <Label>Conduta / tratamento prescrito</Label>
                <Textarea
                  value={details.condutaTratamento || ""}
                  onChange={(e) => patch({ condutaTratamento: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Retorno recomendado (em dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={details.retornoRecomendadoEmDias || ""}
                  onChange={(e) => patch({ retornoRecomendadoEmDias: e.target.value ? Number(e.target.value) : undefined })}
                />
                {suggestedReturnDate && (
                  <p className="text-xs text-muted-foreground">Sugestão de data (ISO): {suggestedReturnDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Próximos passos</Label>
                <Textarea
                  value={details.proximosPassos || ""}
                  onChange={(e) => patch({ proximosPassos: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
