import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import WeightInput from "@/components/inputs/WeightInput";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { ConsultationDetails } from "@/types/appointment";

type YesNo = "sim" | "nao" | "";

const RADIO_ITEM_CLASS =
  "h-5 w-5 border-2 border-primary bg-card data-[state=checked]:border-primary";

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

  // validação visual (opcional)
  errors?: Record<string, boolean>;
  onClearError?: (key: string) => void;
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

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function RadioYesNo({
  name,
  value,
  onChange,
}: {
  name: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as YesNo)} className="flex gap-4">
      <div className="flex items-center gap-2">
        <RadioGroupItem id={`${name}-sim`} value="sim" className={RADIO_ITEM_CLASS} />
        <Label htmlFor={`${name}-sim`}>Sim</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id={`${name}-nao`} value="nao" className={RADIO_ITEM_CLASS} />
        <Label htmlFor={`${name}-nao`}>Não</Label>
      </div>
    </RadioGroup>
  );
}

function YesNoField({
  label,
  name,
  value,
  onChange,
  showWhen,
  children,
}: {
  label: string;
  name: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
  showWhen: "sim" | "nao";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <RadioYesNo name={name} value={value} onChange={onChange} />
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
            className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 hover:bg-muted/30"
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
  errors,
  onClearError,
}: Props) {
  const patch = (p: Partial<ConsultationDetails>) => onDetailsChange({ ...details, ...p });
  const errClass = (has?: boolean) =>
    has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

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
            <WeightInput
              value={pesoAtual}
              onChange={(v) => onPesoAtualChange(v)}
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

      <Tabs defaultValue="anam" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="anam">Queixa & Anamnese</TabsTrigger>
          <TabsTrigger value="digest">Digestório / Urinário</TabsTrigger>
          <TabsTrigger value="resp">Respiratório</TabsTrigger>
          <TabsTrigger value="exame">Exame físico</TabsTrigger>
          <TabsTrigger value="diag">Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="anam" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Queixa principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Queixa principal *</Label>
              <Textarea
                className={errClass(errors?.queixaPrincipal)}
                value={details.queixaPrincipal || ""}
                onChange={(e) => {
                  onClearError?.("queixaPrincipal");
                  patch({ queixaPrincipal: e.target.value });
                }}
                placeholder="Descreva a queixa principal do tutor..."
                rows={2}
              />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Anamnese</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGrid>
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
                      <RadioGroupItem id="vac-sim" value="sim" className={RADIO_ITEM_CLASS} />
                      <Label htmlFor="vac-sim">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="vac-nao" value="nao" className={RADIO_ITEM_CLASS} />
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
                  label="Possibilidade de intoxicação"
                  name="intoxicacao"
                  value={(details.possibilidadeIntoxicacao as YesNo) || ""}
                  onChange={(v) =>
                    patch({
                      possibilidadeIntoxicacao: v as any,
                      possibilidadeIntoxicacaoObs: v === "sim" ? details.possibilidadeIntoxicacaoObs || "" : "",
                    })
                  }
                  showWhen="sim"
                >
                  <Input
                    value={details.possibilidadeIntoxicacaoObs || ""}
                    onChange={(e) => patch({ possibilidadeIntoxicacaoObs: e.target.value })}
                    placeholder="Descreva a suspeita"
                  />
                </YesNoField>

                <YesNoField
                  label="Histórico cirúrgico"
                  name="hist-cir"
                  value={(details.historicoCirurgico as YesNo) || ""}
                  onChange={(v) =>
                    patch({
                      historicoCirurgico: v as any,
                      historicoCirurgicoQuais: v === "sim" ? details.historicoCirurgicoQuais || "" : "",
                    })
                  }
                  showWhen="sim"
                >
                  <Input
                    value={details.historicoCirurgicoQuais || ""}
                    onChange={(e) => patch({ historicoCirurgicoQuais: e.target.value })}
                    placeholder="Quais cirurgias?"
                  />
                </YesNoField>

                <YesNoField
                  label="Uso de medicação"
                  name="uso-med"
                  value={(details.usoMedicacao as YesNo) || ""}
                  onChange={(v) =>
                    patch({
                      usoMedicacao: v as any,
                      usoMedicacaoQuais: v === "sim" ? details.usoMedicacaoQuais || "" : "",
                    })
                  }
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
                  name="alergias"
                  value={(details.alergiasPaciente as YesNo) || ""}
                  onChange={(v) =>
                    patch({
                      alergiasPaciente: v as any,
                      alergiasPacienteObs: v === "sim" ? details.alergiasPacienteObs || "" : "",
                    })
                  }
                  showWhen="sim"
                >
                  <Input
                    value={details.alergiasPacienteObs || ""}
                    onChange={(e) => patch({ alergiasPacienteObs: e.target.value })}
                    placeholder="Descreva as alergias"
                  />
                </YesNoField>

                <div className="space-y-2 md:col-span-2">
                  <Label>Histórico geral</Label>
                  <Textarea
                    value={details.historicoClinico || ""}
                    onChange={(e) => patch({ historicoClinico: e.target.value })}
                    rows={3}
                    placeholder="Histórico e evolução..."
                  />
                </div>
              </FieldGrid>

              <Separator />

              <FieldGrid>
                <div className="space-y-2">
                  <Label>Alimentação</Label>
                  <Select value={alimentacaoTipo} onValueChange={(v) => patch({ alimentacaoTipo: v as any })}>
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
              </FieldGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="digest" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sistema Digestório / Urinário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <YesNoField
                label="Êmese e regurgitação"
                name="emese"
                value={(details.emeseRegurgitacao as YesNo) || ""}
                onChange={(v) => patch({ emeseRegurgitacao: v as any })}
                showWhen="sim"
              >
                <FieldGrid>
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
                </FieldGrid>
              </YesNoField>

              <YesNoField
                label="Micção normal"
                name="miccao"
                value={(details.miccaoNormal as YesNo) || ""}
                onChange={(v) => patch({ miccaoNormal: v as any })}
                showWhen="nao"
              >
                <FieldGrid>
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
                </FieldGrid>
              </YesNoField>

              <div className="space-y-3">
                <CheckboxGrid
                  label="Fezes e defecações"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resp" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sistema Respiratório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <YesNoField
                label="Alterações respiratórias"
                name="alt-resp"
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

              <FieldGrid>
                <YesNoField
                  label="Tosse"
                  name="tosse"
                  value={(details.tosse as YesNo) || ""}
                  onChange={(v) => patch({ tosse: v as any })}
                  showWhen="sim"
                >
                  <FieldGrid>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input value={details.tossePeriodo || ""} onChange={(e) => patch({ tossePeriodo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Input value={details.tosseFrequencia || ""} onChange={(e) => patch({ tosseFrequencia: e.target.value })} />
                    </div>
                  </FieldGrid>
                </YesNoField>

                <YesNoField
                  label="Espirros"
                  name="espirros"
                  value={(details.espirros as YesNo) || ""}
                  onChange={(v) => patch({ espirros: v as any })}
                  showWhen="sim"
                >
                  <FieldGrid>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input value={details.espirrosPeriodo || ""} onChange={(e) => patch({ espirrosPeriodo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Input value={details.espirrosFrequencia || ""} onChange={(e) => patch({ espirrosFrequencia: e.target.value })} />
                    </div>
                  </FieldGrid>
                </YesNoField>

                <YesNoField
                  label="Intolerância ao exercício"
                  name="int-ex"
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
              </FieldGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exame" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exame físico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGrid>
                <div className="space-y-2">
                  <Label>Exame físico realizado?</Label>
                  <RadioYesNo
                    name="exame-fisico"
                    value={(details.exameFisicoRealizado as YesNo) || ""}
                    onChange={(v) => patch({ exameFisicoRealizado: v as any })}
                  />
                </div>

                <YesNoField
                  label="Foi necessário uso de contenção?"
                  name="contencao"
                  value={(details.usoContencao as YesNo) || ""}
                  onChange={(v) =>
                    patch({
                      usoContencao: v as any,
                      usoContencaoQual: v === "sim" ? details.usoContencaoQual || "" : "",
                    })
                  }
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
              </FieldGrid>

              {!canShowExam ? (
                <div className="text-sm text-muted-foreground">Exame físico marcado como não realizado.</div>
              ) : (
                <Accordion type="multiple" defaultValue={["cabeca", "viscera", "linfonodos"]} className="w-full">
                  <AccordionItem value="cabeca">
                    <AccordionTrigger className="text-sm font-semibold">Cabeça e Pescoço</AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 space-y-4">
                        <FieldGrid>
                          <YesNoField
                            label="Secreção nasal"
                            name="sec-nasal"
                            value={(details.secrecaoNasal as YesNo) || ""}
                            onChange={(v) => patch({ secrecaoNasal: v as any })}
                            showWhen="sim"
                          >
                            <FieldGrid>
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
                            </FieldGrid>
                          </YesNoField>

                          <YesNoField
                            label="Secreção ocular"
                            name="sec-ocular"
                            value={(details.secrecaoOcular as YesNo) || ""}
                            onChange={(v) => patch({ secrecaoOcular: v as any })}
                            showWhen="sim"
                          >
                            <FieldGrid>
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
                            </FieldGrid>
                          </YesNoField>

                          <div className="space-y-2">
                            <Label>Olhos</Label>
                            <Select value={details.olhosEstado || ""} onValueChange={(v) => patch({ olhosEstado: v })}>
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
                            name="boca"
                            value={(details.bocaAnexos as YesNo) || ""}
                            onChange={(v) =>
                              patch({
                                bocaAnexos: v as any,
                                bocaAnexosDescricao: v === "sim" ? details.bocaAnexosDescricao || "" : "",
                              })
                            }
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
                            name="dp"
                            value={(details.doencaPeriodontal as YesNo) || ""}
                            onChange={(v) =>
                              patch({
                                doencaPeriodontal: v as any,
                                doencaPeriodontalGrau: v === "sim" ? details.doencaPeriodontalGrau || "" : "",
                              })
                            }
                            showWhen="sim"
                          >
                            <Select value={details.doencaPeriodontalGrau || ""} onValueChange={(v) => patch({ doencaPeriodontalGrau: v as any })}>
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
                            name="pescoco"
                            value={(details.pescocoColuna as YesNo) || ""}
                            onChange={(v) =>
                              patch({
                                pescocoColuna: v as any,
                                pescocoColunaDescricao: v === "sim" ? details.pescocoColunaDescricao || "" : "",
                              })
                            }
                            showWhen="sim"
                          >
                            <Input
                              value={details.pescocoColunaDescricao || ""}
                              onChange={(e) => patch({ pescocoColunaDescricao: e.target.value })}
                              placeholder="Descreva"
                            />
                          </YesNoField>
                        </FieldGrid>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="viscera">
                    <AccordionTrigger className="text-sm font-semibold">Víscera e Abdômen</AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 space-y-4">
                        <FieldGrid>
                          <YesNoField
                            label="Desconforto abdominal"
                            name="desconf"
                            value={(details.desconfortoAbdominal as YesNo) || ""}
                            onChange={(v) => patch({ desconfortoAbdominal: v as any })}
                            showWhen="sim"
                          >
                            <FieldGrid>
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
                            </FieldGrid>
                          </YesNoField>

                          <YesNoField
                            label="Aumento de volume abdominal"
                            name="vol"
                            value={(details.aumentoVolumeAbdominal as YesNo) || ""}
                            onChange={(v) =>
                              patch({
                                aumentoVolumeAbdominal: v as any,
                                aumentoVolumeAbdominalRegiao: v === "sim" ? details.aumentoVolumeAbdominalRegiao || "" : "",
                              })
                            }
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
                            <Label>Obs. ausculta respiratória</Label>
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
                            name="sopro"
                            value={(details.sopro as YesNo) || ""}
                            onChange={(v) => patch({ sopro: v as any })}
                            showWhen="sim"
                          >
                            <div className="text-xs text-muted-foreground">Sopro informado como presente.</div>
                          </YesNoField>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Obs. ausculta cardíaca</Label>
                            <Textarea
                              value={details.frequenciaCardiacaObsAusculta || ""}
                              onChange={(e) => patch({ frequenciaCardiacaObsAusculta: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </FieldGrid>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="linfonodos">
                    <AccordionTrigger className="text-sm font-semibold">Linfonodos e Pele</AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 space-y-4">
                        <FieldGrid>
                          <div className="space-y-2">
                            <Label>Linfonodos</Label>
                            <Select value={details.linfonodosEstado || ""} onValueChange={(v) => patch({ linfonodosEstado: v as any })}>
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
                              label="Pele e anexos"
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
                        </FieldGrid>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diag" className="mt-4 space-y-4">
          {diagnosticSummary && (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Resumo:</span> {diagnosticSummary}
            </div>
          )}

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Diagnóstico e tratamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Observações e ocorrências</Label>
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

              <FieldGrid>
                <div className="space-y-2">
                  <Label>Suspeita diagnóstica *</Label>
                  <Input
                    className={errClass(errors?.diagnostico)}
                    value={details.suspeitaDiagnostica || ""}
                    onChange={(e) => {
                      onClearError?.("diagnostico");
                      patch({ suspeitaDiagnostica: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico presuntivo</Label>
                  <Input
                    className={errClass(errors?.diagnostico)}
                    value={details.diagnosticoPresuntivo || ""}
                    onChange={(e) => {
                      onClearError?.("diagnostico");
                      patch({ diagnosticoPresuntivo: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico definitivo</Label>
                  <Input
                    className={errClass(errors?.diagnostico)}
                    value={details.diagnosticoDefinitivo || ""}
                    onChange={(e) => {
                      onClearError?.("diagnostico");
                      patch({ diagnosticoDefinitivo: e.target.value });
                    }}
                  />
                </div>
              </FieldGrid>

              {errors?.diagnostico && (
                <p className="text-xs text-destructive">Preencha ao menos um diagnóstico (suspeita/presuntivo/definitivo).</p>
              )}

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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}