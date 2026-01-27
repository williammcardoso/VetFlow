import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Scissors, Timer, Trash2 } from "lucide-react";
import type { SurgeryDetails, SurgerySutureItem } from "@/types/appointment";
import { isoToBR } from "@/components/appointments/inputs/DateInputBR";

type Props = {
  appointmentDateISO: string;
  vetResponsavel: string;

  pesoAtual: number | "";
  onPesoAtualChange: (v: number | "") => void;
  temperaturaCorporal: number | "";
  onTemperaturaCorporalChange: (v: number | "") => void;
  frequenciaCardiaca: number | "";
  onFrequenciaCardiacaChange: (v: number | "") => void;
  frequenciaRespiratoria: number | "";
  onFrequenciaRespiratoriaChange: (v: number | "") => void;

  details: SurgeryDetails;
  onDetailsChange: (next: SurgeryDetails) => void;

  // validação visual (opcional)
  errors?: Record<string, boolean>;
  onClearError?: (key: string) => void;
};

function minutesDiff(start?: string, end?: string) {
  if (!start || !end) return undefined;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  const diff = endM - startM;
  if (diff < 0) return undefined;
  return diff;
}

export default function SurgeryForm({
  appointmentDateISO,
  vetResponsavel,
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
  const patch = (p: Partial<SurgeryDetails>) => onDetailsChange({ ...details, ...p });
  const errClass = (has?: boolean) =>
    has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

  const tempoCirurgicoMin = useMemo(
    () => minutesDiff(details.horaInicio, details.horaTermino),
    [details.horaInicio, details.horaTermino]
  );

  const suturas = (details.suturas || []) as SurgerySutureItem[];

  const addSutura = () => {
    const next: SurgerySutureItem = {
      id: `sut-${Date.now()}`,
      tipo: "",
      calibre: "",
      plano: "",
      padrao: "",
      quantidade: 1,
      usoLocal: "",
    };
    patch({ suturas: [...suturas, next] });
  };

  const updateSutura = (id: string, p: Partial<SurgerySutureItem>) => {
    patch({ suturas: suturas.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  };

  const removeSutura = (id: string) => {
    patch({ suturas: suturas.filter((s) => s.id !== id) });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="basicos" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="basicos">Dados básicos</TabsTrigger>
          <TabsTrigger value="preop">Pré-operatório</TabsTrigger>
          <TabsTrigger value="procedimento">Procedimento</TabsTrigger>
          <TabsTrigger value="materiais">Materiais & suturas</TabsTrigger>
          <TabsTrigger value="posop">Pós-op e alta</TabsTrigger>
        </TabsList>

        <TabsContent value="basicos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scissors className="h-4 w-4 text-muted-foreground" /> Dados básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da cirurgia</Label>
                <Input value={isoToBR(appointmentDateISO)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Veterinário responsável</Label>
                <Input value={vetResponsavel} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora de início</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={details.horaInicio || ""}
                  onChange={(e) => patch({ horaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaTermino">Hora de término</Label>
                <Input
                  id="horaTermino"
                  type="time"
                  value={details.horaTermino || ""}
                  onChange={(e) => patch({ horaTermino: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tempo cirúrgico (calculado)</Label>
                <div className="flex items-center gap-2 rounded-md border border-border px-3 h-10">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {tempoCirurgicoMin === undefined ? "—" : `${tempoCirurgicoMin} min`}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anestesista">Anestesista</Label>
                <Input
                  id="anestesista"
                  value={details.anestesista || ""}
                  onChange={(e) => patch({ anestesista: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="instrumentador">Instrumentador (opcional)</Label>
                <Input
                  id="instrumentador"
                  value={details.instrumentador || ""}
                  onChange={(e) => patch({ instrumentador: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preop" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avaliação pré-operatória</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pesoPreOp">Peso pré-operatório (kg)</Label>
                <Input
                  id="pesoPreOp"
                  type="number"
                  step="0.1"
                  value={pesoAtual}
                  onChange={(e) => onPesoAtualChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempPreOp">Temperatura (°C)</Label>
                <Input
                  id="tempPreOp"
                  type="number"
                  step="0.1"
                  value={temperaturaCorporal}
                  onChange={(e) => onTemperaturaCorporalChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fcPreOp">FC</Label>
                <Input
                  id="fcPreOp"
                  type="number"
                  value={frequenciaCardiaca}
                  onChange={(e) => onFrequenciaCardiacaChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frPreOp">FR</Label>
                <Input
                  id="frPreOp"
                  type="number"
                  value={frequenciaRespiratoria}
                  onChange={(e) => onFrequenciaRespiratoriaChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mucosas">Mucosas</Label>
                <Select
                  value={(details.mucosas as any) || ""}
                  onValueChange={(v) => patch({ mucosas: v as any })}
                >
                  <SelectTrigger id="mucosas"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                <Label htmlFor="tpc">TPC (s)</Label>
                <Input
                  id="tpc"
                  type="number"
                  value={details.tpcSeg || ""}
                  onChange={(e) => patch({ tpcSeg: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estadoGeral">Estado geral</Label>
                <Select
                  value={(details.estadoGeral as any) || ""}
                  onValueChange={(v) => patch({ estadoGeral: v as any })}
                >
                  <SelectTrigger id="estadoGeral"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jejum adequado?</Label>
                <RadioGroup
                  value={details.jejumAdequado === undefined ? "" : details.jejumAdequado ? "sim" : "nao"}
                  onValueChange={(v) => patch({ jejumAdequado: v === "sim" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="jejum-sim" value="sim" />
                    <Label htmlFor="jejum-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="jejum-nao" value="nao" />
                    <Label htmlFor="jejum-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Exames pré-operatórios avaliados?</Label>
                <RadioGroup
                  value={details.examesPreOperatoriosAvaliados === undefined ? "" : details.examesPreOperatoriosAvaliados ? "sim" : "nao"}
                  onValueChange={(v) => patch({ examesPreOperatoriosAvaliados: v === "sim" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="ex-pre-sim" value="sim" />
                    <Label htmlFor="ex-pre-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="ex-pre-nao" value="nao" />
                    <Label htmlFor="ex-pre-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="obsPreOp">Observações pré-operatórias</Label>
                <Textarea
                  id="obsPreOp"
                  value={details.observacoesPreOperatorias || ""}
                  onChange={(e) => patch({ observacoesPreOperatorias: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedimento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Procedimento cirúrgico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="procedimento">Procedimento realizado *</Label>
                  <Input
                    id="procedimento"
                    className={errClass(errors?.procedimentoRealizado)}
                    value={details.procedimentoRealizado || ""}
                    onChange={(e) => {
                      onClearError?.("procedimentoRealizado");
                      patch({ procedimentoRealizado: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnostico">Diagnóstico</Label>
                  <Input
                    id="diagnostico"
                    value={details.diagnostico || ""}
                    onChange={(e) => patch({ diagnostico: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tecnica">Técnica cirúrgica</Label>
                  <Textarea
                    id="tecnica"
                    value={details.tecnicaCirurgica || ""}
                    onChange={(e) => patch({ tecnicaCirurgica: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocolo">Protocolo anestésico</Label>
                  <Textarea
                    id="protocolo"
                    value={details.protocoloAnestesico || ""}
                    onChange={(e) => patch({ protocoloAnestesico: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Tempo cirúrgico</div>
                  <div className="text-sm text-muted-foreground">
                    {tempoCirurgicoMin === undefined ? "—" : `${tempoCirurgicoMin} min`}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Calculado a partir de início e término.</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Intercorrências intra-operatórias?</Label>
                <RadioGroup
                  value={details.intercorrenciaIntraOperatoria === undefined ? "" : details.intercorrenciaIntraOperatoria ? "sim" : "nao"}
                  onValueChange={(v) => patch({ intercorrenciaIntraOperatoria: v === "sim", intercorrenciaDescricao: v === "sim" ? (details.intercorrenciaDescricao || "") : "" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="inter-sim" value="sim" />
                    <Label htmlFor="inter-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="inter-nao" value="nao" />
                    <Label htmlFor="inter-nao">Não</Label>
                  </div>
                </RadioGroup>
                {details.intercorrenciaIntraOperatoria && (
                  <Textarea
                    value={details.intercorrenciaDescricao || ""}
                    onChange={(e) => patch({ intercorrenciaDescricao: e.target.value })}
                    rows={3}
                    placeholder="Descreva as intercorrências"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materiais" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Materiais & suturas</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addSutura} className="h-8">
                <Plus className="h-4 w-4 mr-2" /> Adicionar fio
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {suturas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum fio cirúrgico adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {suturas.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 flex-1">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Tipo</Label>
                            <Select value={s.tipo || ""} onValueChange={(v) => updateSutura(s.id, { tipo: v as any })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {[
                                  "Nylon",
                                  "PGA",
                                  "Vicryl",
                                  "Monocryl",
                                  "Prolene",
                                  "Outros",
                                ].map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Calibre</Label>
                            <Input value={s.calibre || ""} onChange={(e) => updateSutura(s.id, { calibre: e.target.value })} />
                          </div>

                          <div className="space-y-2">
                            <Label>Plano</Label>
                            <Input value={s.plano || ""} onChange={(e) => updateSutura(s.id, { plano: e.target.value })} />
                          </div>

                          <div className="space-y-2">
                            <Label>Padrão</Label>
                            <Input value={s.padrao || ""} onChange={(e) => updateSutura(s.id, { padrao: e.target.value })} />
                          </div>

                          <div className="space-y-2">
                            <Label>Qtd</Label>
                            <Input
                              type="number"
                              min={1}
                              value={s.quantidade ?? 1}
                              onChange={(e) => updateSutura(s.id, { quantidade: e.target.value ? Number(e.target.value) : 1 })}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-6">
                            <Label>Uso / local</Label>
                            <Input value={s.usoLocal || ""} onChange={(e) => updateSutura(s.id, { usoLocal: e.target.value })} />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeSutura(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posop" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pós-operatório e alta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="condicaoFinal">Condição ao final da cirurgia</Label>
                <Input
                  id="condicaoFinal"
                  value={details.condicaoFinal || ""}
                  onChange={(e) => patch({ condicaoFinal: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prescricao">Prescrição pós-operatória (resumo)</Label>
                <Textarea
                  id="prescricao"
                  value={details.prescricaoPosOperatoria || ""}
                  onChange={(e) => patch({ prescricaoPosOperatoria: e.target.value })}
                  rows={3}
                  placeholder="Resumo da prescrição (vinculação com receitas pode ser feita via Ações > Prescrição)."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orientacoes">Orientações ao tutor</Label>
                <Textarea
                  id="orientacoes"
                  value={details.orientacoesTutor || ""}
                  onChange={(e) => patch({ orientacoesTutor: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Complicações imediatas?</Label>
                <RadioGroup
                  value={details.complicacoesImediatas === undefined ? "" : details.complicacoesImediatas ? "sim" : "nao"}
                  onValueChange={(v) => patch({ complicacoesImediatas: v === "sim" })}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="comp-sim" value="sim" />
                    <Label htmlFor="comp-sim">Sim</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="comp-nao" value="nao" />
                    <Label htmlFor="comp-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obsPosOp">Observações pós-operatórias</Label>
                <Textarea
                  id="obsPosOp"
                  value={details.observacoesPosOperatorias || ""}
                  onChange={(e) => patch({ observacoesPosOperatorias: e.target.value })}
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