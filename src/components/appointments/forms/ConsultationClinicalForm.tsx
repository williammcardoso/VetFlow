import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Pill, ShieldCheck, Stethoscope } from "lucide-react";
import type { ConsultationDetails } from "@/types/appointment";

export type ConsultationMode = "simplificado" | "completo";

type Props = {
  dateISO: string;
  mode: ConsultationMode;
  onModeChange: (mode: ConsultationMode) => void;
  pesoAtual: number | "";
  onPesoAtualChange: (v: number | "") => void;
  temperaturaCorporal: number | "";
  onTemperaturaCorporalChange: (v: number | "") => void;
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

export default function ConsultationClinicalForm({
  dateISO,
  mode,
  onModeChange,
  pesoAtual,
  onPesoAtualChange,
  temperaturaCorporal,
  onTemperaturaCorporalChange,
  details,
  onDetailsChange,
  errors,
  onClearError,
}: Props) {
  const patch = (p: Partial<ConsultationDetails>) => onDetailsChange({ ...details, ...p });
  const errClass = (has?: boolean) =>
    has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

  const RADIO_ITEM_CLASS =
    "h-5 w-5 border-2 border-primary bg-card data-[state=checked]:border-primary";

  const retornoEmDias = details.retornoRecomendadoEmDias || 0;
  const suggestedReturnDate = retornoEmDias ? addDaysISO(dateISO, retornoEmDias) : "";

  const appendExam = (label: string) => {
    const current = (details.examesSolicitados || "").trim();
    const next = current ? `${current}\n${label}` : label;
    patch({ examesSolicitados: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground">Consulta Clínica (Novo Modelo)</div>
          <div className="text-xs text-muted-foreground">
            Modo simplificado para alta produtividade. Ative o exame completo quando necessário.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="consulta-completa"
            checked={mode === "completo"}
            onCheckedChange={(checked) => onModeChange(checked ? "completo" : "simplificado")}
          />
          <Label htmlFor="consulta-completa" className="text-sm">
            Exame clínico completo
          </Label>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["anam", "avaliacao", "conduta"]} className="w-full">
        <AccordionItem value="anam">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" /> Queixa e Anamnese
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="queixaPrincipal">Queixa principal *</Label>
                <Textarea
                  id="queixaPrincipal"
                  className={errClass(errors?.queixaPrincipal)}
                  value={details.queixaPrincipal || ""}
                  onChange={(e) => {
                    onClearError?.("queixaPrincipal");
                    patch({ queixaPrincipal: e.target.value });
                  }}
                  placeholder="Ex.: Vômito há 2 dias, apatia, falta de apetite..."
                  rows={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="historicoClinico">História / evolução</Label>
                <Textarea
                  id="historicoClinico"
                  value={details.historicoClinico || ""}
                  onChange={(e) => patch({ historicoClinico: e.target.value })}
                  placeholder="Linha do tempo, progressão, fatores associados, tratamentos prévios..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" /> Uso de medicação?
                </Label>
                <RadioGroup
                  value={details.usoMedicacao || ""}
                  onValueChange={(v) =>
                    patch({
                      usoMedicacao: v as any,
                      usoMedicacaoQuais: v === "sim" ? details.usoMedicacaoQuais || "" : "",
                    })
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="med-sim" value="sim" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="med-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="med-nao" value="nao" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="med-nao">Não</Label>
                  </div>
                </RadioGroup>
                {details.usoMedicacao === "sim" && (
                  <Textarea
                    value={details.usoMedicacaoQuais || ""}
                    onChange={(e) => patch({ usoMedicacaoQuais: e.target.value })}
                    placeholder="Quais?"
                    rows={2}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Alergias?
                </Label>
                <RadioGroup
                  value={details.alergiasPaciente || ""}
                  onValueChange={(v) =>
                    patch({
                      alergiasPaciente: v as any,
                      alergiasPacienteObs: v === "sim" ? details.alergiasPacienteObs || "" : "",
                    })
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="alergia-sim" value="sim" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="alergia-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="alergia-nao" value="nao" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="alergia-nao">Não</Label>
                  </div>
                </RadioGroup>
                {details.alergiasPaciente === "sim" && (
                  <Textarea
                    value={details.alergiasPacienteObs || ""}
                    onChange={(e) => patch({ alergiasPacienteObs: e.target.value })}
                    placeholder="Descreva as alergias / reações"
                    rows={2}
                  />
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center justify-between gap-3">
                  <span>Vacinação em dia?</span>
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>

                <RadioGroup
                  value={(details.vacinacaoEmDia as any) || ""}
                  onValueChange={(v) =>
                    patch({
                      vacinacaoEmDia: v as any,
                      vacinacaoEmDiaObs: v === "sim" ? "" : details.vacinacaoEmDiaObs || "",
                    })
                  }
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="vac-sim" value="sim" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="vac-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="vac-nao" value="nao" className={RADIO_ITEM_CLASS} />
                    <Label htmlFor="vac-nao">Não</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      id="vac-ni"
                      value="nao_informado"
                      className={RADIO_ITEM_CLASS}
                    />
                    <Label htmlFor="vac-ni">Não informado</Label>
                  </div>
                </RadioGroup>

                {details.vacinacaoEmDia && details.vacinacaoEmDia !== "sim" ? (
                  <Input
                    value={details.vacinacaoEmDiaObs || ""}
                    onChange={(e) => patch({ vacinacaoEmDiaObs: e.target.value })}
                    placeholder="Observações da vacinação (ex.: não trouxe carteira, atrasada...)"
                  />
                ) : null}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="avaliacao">
          <AccordionTrigger className="text-sm font-semibold">Avaliação Clínica (Resumo)</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="pesoAtual">Peso atual (kg)</Label>
                <Input
                  id="pesoAtual"
                  type="number"
                  step="0.1"
                  value={pesoAtual}
                  onChange={(e) => {
                    const v = e.target.value;
                    onPesoAtualChange(v === "" ? "" : Number(v));
                  }}
                />
                <p className="text-xs text-muted-foreground">Pré-preenchido com o último peso salvo.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperaturaCorporal">Temperatura corporal (°C)</Label>
                <Input
                  id="temperaturaCorporal"
                  type="number"
                  step="0.1"
                  value={temperaturaCorporal}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTemperaturaCorporalChange(v === "" ? "" : Number(v));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estadoGeral">Estado geral</Label>
                <Select
                  value={(details.estadoGeral as any) || ""}
                  onValueChange={(v) => patch({ estadoGeral: v as any })}
                >
                  <SelectTrigger id="estadoGeral">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mucosasResumo">Mucosas</Label>
                <Select
                  value={(details.mucosasResumo as any) || ""}
                  onValueChange={(v) => patch({ mucosasResumo: v as any })}
                >
                  <SelectTrigger id="mucosasResumo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="palida">Pálida</SelectItem>
                    <SelectItem value="icterica">Ictérica</SelectItem>
                    <SelectItem value="hiperemica">Hiperêmica</SelectItem>
                    <SelectItem value="cianotica">Cianótica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hidratacao">Hidratação</Label>
                <Select
                  value={(details.hidratacao as any) || ""}
                  onValueChange={(v) => patch({ hidratacao: v as any })}
                >
                  <SelectTrigger id="hidratacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderada">Moderada</SelectItem>
                    <SelectItem value="severa">Severa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dor">Dor</Label>
                <Select
                  value={(details.dor as any) || ""}
                  onValueChange={(v) =>
                    patch({
                      dor: v as any,
                      dorEscala: v === "escala" ? details.dorEscala ?? 0 : undefined,
                    })
                  }
                >
                  <SelectTrigger id="dor">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem</SelectItem>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderada">Moderada</SelectItem>
                    <SelectItem value="intensa">Intensa</SelectItem>
                    <SelectItem value="escala">Escala 0–10</SelectItem>
                  </SelectContent>
                </Select>

                {details.dor === "escala" && (
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>0</span>
                      <span className="font-medium text-foreground">{details.dorEscala ?? 0}</span>
                      <span>10</span>
                    </div>
                    <Slider
                      value={[details.dorEscala ?? 0]}
                      min={0}
                      max={10}
                      step={1}
                      onValueChange={(v) => patch({ dorEscala: v[0] })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="exameFisicoObs">Observações do exame físico</Label>
                <Textarea
                  id="exameFisicoObs"
                  value={details.exameFisicoObs || ""}
                  onChange={(e) => patch({ exameFisicoObs: e.target.value })}
                  rows={3}
                />
              </div>

              {mode === "completo" && (
                <div className="md:col-span-3 pt-2">
                  <Card className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Exame clínico completo (colapsável)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Accordion type="multiple" className="w-full">
                        {[
                          { key: "digestorio", title: "Sistema digestório" },
                          { key: "respiratorio", title: "Sistema respiratório" },
                          { key: "cabeca_pescoco", title: "Cabeça e pescoço" },
                          { key: "torax_abdomen", title: "Tórax e abdômen" },
                          { key: "linfonodos_pele", title: "Linfonodos e pele" },
                        ].map((sec) => (
                          <AccordionItem key={sec.key} value={sec.key}>
                            <AccordionTrigger className="text-sm">{sec.title}</AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select
                                    value={(details[`sec_${sec.key}_status` as any] as any) || ""}
                                    onValueChange={(v) =>
                                      patch({
                                        [`sec_${sec.key}_status` as any]: v,
                                        [`sec_${sec.key}_obs` as any]:
                                          v === "normal"
                                            ? ""
                                            : (details[`sec_${sec.key}_obs` as any] as any) || "",
                                      } as any)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="alterado">Alterado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label>Observações</Label>
                                  <Textarea
                                    value={(details[`sec_${sec.key}_obs` as any] as any) || ""}
                                    onChange={(e) =>
                                      patch({ [`sec_${sec.key}_obs` as any]: e.target.value } as any)
                                    }
                                    rows={2}
                                    placeholder="Descreva achados relevantes (evite checklists extensos)."
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}

                        <AccordionItem value="obs_complementares">
                          <AccordionTrigger className="text-sm">Observações complementares</AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2 space-y-2">
                              <Label>Notas adicionais</Label>
                              <Textarea
                                value={(details.observacoesComplementares as any) || ""}
                                onChange={(e) => patch({ observacoesComplementares: e.target.value } as any)}
                                rows={3}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conduta">
          <AccordionTrigger className="text-sm font-semibold">Diagnóstico e Conduta</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="suspeitaDiagnostica">Suspeita diagnóstica principal *</Label>
                <Input
                  id="suspeitaDiagnostica"
                  className={errClass(errors?.diagnostico)}
                  value={details.suspeitaDiagnostica || ""}
                  onChange={(e) => {
                    onClearError?.("diagnostico");
                    patch({ suspeitaDiagnostica: e.target.value });
                  }}
                />
                {errors?.diagnostico && (
                  <p className="text-xs text-destructive">
                    Preencha ao menos um diagnóstico (suspeita/presuntivo/definitivo).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosticoDiferencial">Diagnósticos diferenciais (opcional)</Label>
                <Input
                  id="diagnosticoDiferencial"
                  value={details.diagnosticoDiferencial || ""}
                  onChange={(e) => patch({ diagnosticoDiferencial: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <Label htmlFor="examesSolicitados">Exames solicitados</Label>
                    <p className="text-xs text-muted-foreground">Use os atalhos para acelerar o preenchimento.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {["Hemograma", "Bioquímica", "US", "RX", "ECG"].map((x) => (
                      <Button
                        key={x}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => appendExam(x)}
                      >
                        {x}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  id="examesSolicitados"
                  value={details.examesSolicitados || ""}
                  onChange={(e) => patch({ examesSolicitados: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="condutaTratamento">Conduta / tratamento instituído</Label>
                <Textarea
                  id="condutaTratamento"
                  value={details.condutaTratamento || ""}
                  onChange={(e) => patch({ condutaTratamento: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retornoDias">Retorno recomendado (dias)</Label>
                <Input
                  id="retornoDias"
                  type="number"
                  min={0}
                  value={details.retornoRecomendadoEmDias || ""}
                  onChange={(e) =>
                    patch({ retornoRecomendadoEmDias: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
                {suggestedReturnDate && (
                  <p className="text-xs text-muted-foreground">
                    Sugestão de data: {suggestedReturnDate.split("-").reverse().join("/")}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="proximosPassos">Próximos passos</Label>
                <Textarea
                  id="proximosPassos"
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