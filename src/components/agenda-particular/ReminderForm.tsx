import React from "react";
import { BellPlus, CalendarClock, Loader2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePickerBR from "@/components/appointments/inputs/DatePickerBR";
import { Panel } from "@/components/finance/FinanceUI";
import {
  PUSHOVER_SOUNDS,
  REPEAT_LABEL,
  diasOf,
  isDue,
  repeatModeOf,
  upcomingLabel,
  type PrivateReminder,
  type RepeatMode,
} from "@/lib/agendaParticular";
import { saveReminder, type Creds } from "@/lib/agendaParticularApi";
import { SoundPreviewButton } from "@/components/agenda-particular/SoundPreviewButton";
import { cn, getTodayLocalISO } from "@/lib/utils";

const DEFAULT_SOUND = "__padrao";
const MODES: RepeatMode[] = ["uma", "dia", "semana", "cada"];

export function ReminderForm({
  creds,
  defaultHour,
  defaultSound,
  editing,
  onSaved,
  onCancelEdit,
  sectionRef,
}: {
  creds: Creds;
  defaultHour: string;
  /** Som padrão da agenda particular (nulo = padrão do app, "pushover"). */
  defaultSound: string | null;
  editing: PrivateReminder | null;
  onSaved: () => void;
  onCancelEdit: () => void;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const todayISO = getTodayLocalISO();
  const [texto, setTexto] = React.useState("");
  const [detalhes, setDetalhes] = React.useState("");
  const [mode, setMode] = React.useState<RepeatMode>("cada");
  const [every, setEvery] = React.useState(3);
  const [data, setData] = React.useState(todayISO);
  const [hora, setHora] = React.useState(defaultHour);
  const [insistir, setInsistir] = React.useState(false);
  const [som, setSom] = React.useState(DEFAULT_SOUND);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Editar carrega o lembrete; sair da edição (ou salvar um novo) volta para
  // um formulário limpo.
  const fill = React.useCallback((editing: PrivateReminder | null) => {
    setError(null);
    if (editing) {
      const [d, h] = editing.proximo.split("T");
      setTexto(editing.texto);
      setDetalhes(editing.detalhes ?? "");
      setMode(repeatModeOf(editing.aCadaDias));
      setEvery(editing.aCadaDias && ![1, 7].includes(editing.aCadaDias) ? editing.aCadaDias : 3);
      setData(d || getTodayLocalISO());
      setHora(h || editing.hora);
      setInsistir(editing.prioridade >= 2);
      setSom(editing.som ?? DEFAULT_SOUND);
    } else {
      setTexto("");
      setDetalhes("");
      setMode("cada");
      setEvery(3);
      setData(getTodayLocalISO());
      setHora(defaultHour);
      setInsistir(false);
      setSom(DEFAULT_SOUND);
    }
  }, [defaultHour]);

  React.useEffect(() => fill(editing), [editing, fill]);

  const dias = diasOf(mode, every);
  const due = data && hora ? isDue(`${data}T${hora}`) : false;
  const preview = data && hora ? upcomingLabel(data, hora, dias, todayISO) : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!texto.trim()) {
      setError("Escreva o que é para lembrar.");
      return;
    }
    if (!data || !hora) {
      setError("Escolha o dia e a hora do aviso.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveReminder(creds, {
        id: editing?.id,
        texto: texto.trim(),
        detalhes: detalhes.trim(),
        aCadaDias: dias,
        hora,
        data,
        prioridade: insistir ? 2 : 1,
        som: som === DEFAULT_SOUND ? null : som,
        ativo: true,
      });
      toast.success(editing ? "Lembrete alterado." : "Lembrete criado.");
      if (!editing) fill(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      sectionRef={sectionRef}
      title={editing ? "Editar lembrete" : "Novo lembrete"}
      icon={editing ? Pencil : BellPlus}
      tone={editing ? "amber" : "teal"}
      description="Chega no Pushover na hora marcada."
    >
      <form className="space-y-4 px-4 py-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="pa-texto">O que lembrar</Label>
          <Input
            id="pa-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Pagar o IPTU"
            maxLength={250}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-detalhes">
            Detalhes <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="pa-detalhes"
            value={detalhes}
            onChange={(e) => setDetalhes(e.target.value)}
            rows={2}
            maxLength={900}
            placeholder="Aparece embaixo do título no aviso"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Repetir</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  mode === m ? "border-teal-700 bg-teal-700 text-white" : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {REPEAT_LABEL[m]}
              </button>
            ))}
            {mode === "cada" ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={every}
                  onChange={(e) => setEvery(Number(e.target.value))}
                  className="h-8 w-[4.5rem] text-center"
                  aria-label="Intervalo em dias"
                />
                dias
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pa-data">{editing ? "Próximo aviso" : "Primeiro aviso"}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <DatePickerBR id="pa-data" valueISO={data} onChangeISO={setData} className="w-[11rem]" />
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-[7.5rem]" aria-label="Hora do aviso" />
          </div>
        </div>

        {preview ? (
          <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-2 text-sm text-teal-950">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
            <p>
              {dias ? "Avisos: " : "Aviso único: "}
              <strong className="font-bold">{preview}</strong>
              {due ? <span className="block text-xs font-medium text-amber-800">Esse horário já passou: o primeiro aviso sai em até 5 minutos.</span> : null}
            </p>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <Label htmlFor="pa-insistir" className="cursor-pointer">Insistir até eu confirmar</Label>
            <p className="text-xs text-muted-foreground">Toca de novo a cada minuto até você tocar em Confirmar no Pushover.</p>
          </div>
          <Switch id="pa-insistir" checked={insistir} onCheckedChange={setInsistir} />
        </div>

        <div className="space-y-1.5">
          <Label>Som</Label>
          <div className="flex items-center gap-2">
            <Select value={som} onValueChange={setSom}>
              <SelectTrigger className="w-full sm:w-[16rem]" aria-label="Som do aviso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_SOUND}>Padrão da agenda particular</SelectItem>
                {PUSHOVER_SOUNDS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Ouvir aqui mesmo, sem mandar aviso (o "padrão" toca o som padrão escolhido). */}
            <SoundPreviewButton sound={som === DEFAULT_SOUND ? defaultSound ?? "pushover" : som} />
          </div>
        </div>

        {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" disabled={saving} className="bg-teal-700 text-white hover:bg-teal-800">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editing ? "Salvar alterações" : "Salvar lembrete"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
