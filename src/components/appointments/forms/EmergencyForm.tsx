import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import WeightInput from "@/components/inputs/WeightInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmergencyDetails } from "@/types/appointment";

type Props = {
  pesoAtual: number | "";
  onPesoAtualChange: (v: number | "") => void;
  temperaturaCorporal: number | "";
  onTemperaturaCorporalChange: (v: number | "") => void;
  frequenciaCardiaca: number | "";
  onFrequenciaCardiacaChange: (v: number | "") => void;
  frequenciaRespiratoria: number | "";
  onFrequenciaRespiratoriaChange: (v: number | "") => void;

  details: EmergencyDetails;
  onDetailsChange: (next: EmergencyDetails) => void;

  errors?: Record<string, boolean>;
  onClearError?: (key: string) => void;
};

const errClass = (has?: boolean) =>
  has ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive" : "";

export default function EmergencyForm({
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
  const patch = (p: Partial<EmergencyDetails>) => onDetailsChange({ ...details, ...p });

  return (
    <div className="space-y-4">
      <Card className="vf-surface-card vf-tone-clinical rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sinais vitais / medidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <WeightInput
              value={pesoAtual}
              onChange={(v) => {
                onClearError?.("pesoAtual");
                onPesoAtualChange(v);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Temperatura (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperaturaCorporal}
              onChange={(e) => {
                onClearError?.("temperaturaCorporal");
                onTemperaturaCorporalChange(e.target.value === "" ? "" : Number(e.target.value));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>FC</Label>
            <Input
              type="number"
              value={frequenciaCardiaca}
              onChange={(e) => {
                onClearError?.("frequenciaCardiaca");
                onFrequenciaCardiacaChange(e.target.value === "" ? "" : Number(e.target.value));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>FR</Label>
            <Input
              type="number"
              value={frequenciaRespiratoria}
              onChange={(e) => {
                onClearError?.("frequenciaRespiratoria");
                onFrequenciaRespiratoriaChange(e.target.value === "" ? "" : Number(e.target.value));
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="vf-surface-card vf-tone-clinical rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Triagem</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hora de chegada</Label>
            <Input
              type="time"
              value={details.horaChegada || ""}
              onChange={(e) => patch({ horaChegada: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Condição geral *</Label>
            <Select
              value={(details.condicaoGeral as any) || ""}
              onValueChange={(v) => {
                onClearError?.("condicaoGeral");
                patch({ condicaoGeral: v as any });
              }}
            >
              <SelectTrigger className={errClass(errors?.condicaoGeral)}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "alerta", label: "Alerta" },
                  { value: "deprimido", label: "Deprimido" },
                  { value: "inconsciente", label: "Inconsciente" },
                  { value: "choque", label: "Choque" },
                  { value: "dispneia", label: "Dispneia" },
                  { value: "sangramento", label: "Sangramento" },
                  { value: "convulsao", label: "Convulsão" },
                  { value: "outros", label: "Outros" },
                ].map((x) => (
                  <SelectItem key={x.value} value={x.value}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Manobras de suporte</Label>
            <Textarea
              value={details.manobrasSuporteRealizadas || ""}
              onChange={(e) => patch({ manobrasSuporteRealizadas: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Medicamentos administrados</Label>
            <Textarea
              value={details.medicamentosAdministrados || ""}
              onChange={(e) => patch({ medicamentosAdministrados: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Encaminhamento</Label>
            <Select
              value={(details.encaminhamento as any) || ""}
              onValueChange={(v) => patch({ encaminhamento: v as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internacao">Internação</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
