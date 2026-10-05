import React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BOOKING_KINDS,
  KIND_LABEL,
  PLACE_LABEL,
  kindNeedsPlace,
  type BookingKind,
  type BookingKindInfo,
  type BookingPlace,
} from "@/lib/agendaKinds";
import { KIND_VISUAL, PLACE_ICON } from "@/components/agenda/bookingKindVisual";
import { cn } from "@/lib/utils";

// Campos do tipo de atendimento: tipo → (local) → vacinas / medicação /
// especificação → observação. A duração mínima de cada tipo é aplicada por
// quem usa (a página decide quantos horários travar).
export function BookingKindFields({
  kind,
  info,
  onKindChange,
  onInfoChange,
  vaccineOptions,
  kindHint,
  disabled,
  idPrefix = "booking",
}: {
  kind: BookingKind | null;
  info: BookingKindInfo;
  onKindChange: (kind: BookingKind) => void;
  onInfoChange: (info: BookingKindInfo) => void;
  vaccineOptions: string[];
  /** Linha abaixo dos tipos (ex.: "Consulta reserva 1h — 2 horários seguidos"). */
  kindHint?: React.ReactNode;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const [otherVaccineOpen, setOtherVaccineOpen] = React.useState(!!info.vaccineOther);
  React.useEffect(() => {
    if (info.vaccineOther) setOtherVaccineOpen(true);
  }, [info.vaccineOther]);

  const set = (changes: Partial<BookingKindInfo>) => onInfoChange({ ...info, ...changes });
  const selectedVaccines = info.vaccines ?? [];
  const toggleVaccine = (name: string) =>
    set({ vaccines: selectedVaccines.includes(name) ? selectedVaccines.filter((v) => v !== name) : [...selectedVaccines, name] });

  const chip = (on: boolean, tone: { chip: string; chipOn: string }) =>
    cn(
      "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      on ? tone.chipOn : tone.chip
    );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tipo de atendimento</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de atendimento">
          {BOOKING_KINDS.map((k) => {
            const v = KIND_VISUAL[k];
            const Icon = v.icon;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                disabled={disabled}
                onClick={() => onKindChange(k)}
                className={chip(kind === k, v)}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
        {kindHint}
      </div>

      {kind && kindNeedsPlace(kind) && (
        <div className="space-y-1.5">
          <Label>{kind === "consulta" ? "Consulta" : "Vacina"} na loja ou domiciliar?</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Local do atendimento">
            {(["loja", "domicilio"] as BookingPlace[]).map((p) => {
              const Icon = PLACE_ICON[p];
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={info.place === p}
                  disabled={disabled}
                  onClick={() => set({ place: p })}
                  className={chip(info.place === p, KIND_VISUAL[kind])}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {PLACE_LABEL[p]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {kind === "vacina" && (
        <div className="space-y-1.5">
          <Label>Quais vacinas?</Label>
          <div className="flex flex-wrap gap-2">
            {vaccineOptions.map((name) => {
              const on = selectedVaccines.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => toggleVaccine(name)}
                  className={chip(on, KIND_VISUAL.vacina)}
                >
                  {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                  {name}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={otherVaccineOpen}
              disabled={disabled}
              onClick={() => {
                if (otherVaccineOpen) set({ vaccineOther: undefined });
                setOtherVaccineOpen((v) => !v);
              }}
              className={chip(otherVaccineOpen, KIND_VISUAL.vacina)}
            >
              {otherVaccineOpen && <Check className="h-3.5 w-3.5" aria-hidden />}
              Outra
            </button>
          </div>
          {otherVaccineOpen && (
            <Input
              id={`${idPrefix}-vaccine-other`}
              value={info.vaccineOther ?? ""}
              onChange={(e) => set({ vaccineOther: e.target.value })}
              placeholder="Qual vacina?"
              disabled={disabled}
              autoFocus
              className="max-w-sm"
            />
          )}
        </div>
      )}

      {kind === "medicacao" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-medication`}>Qual medicação?</Label>
          <Input
            id={`${idPrefix}-medication`}
            value={info.medication ?? ""}
            onChange={(e) => set({ medication: e.target.value })}
            placeholder="Ex.: Aplicação de insulina"
            disabled={disabled}
          />
        </div>
      )}

      {kind === "outro" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-other`}>Qual atendimento?</Label>
          <Input
            id={`${idPrefix}-other`}
            value={info.other ?? ""}
            onChange={(e) => set({ other: e.target.value })}
            placeholder="Ex.: Fluidoterapia, transfusão, eutanásia..."
            disabled={disabled}
          />
        </div>
      )}

      {kind && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-obs`}>
            {kind === "bloqueio" ? "Motivo" : "Observação"} <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id={`${idPrefix}-obs`}
            value={info.obs ?? ""}
            onChange={(e) => set({ obs: e.target.value })}
            placeholder={kind === "bloqueio" ? "Ex.: compromisso fora" : "Ex.: telefone, 2 animais, valor combinado"}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
