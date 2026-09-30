import React from "react";
import { Check, PenLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconChip } from "@/components/finance/FinanceUI";
import type { ReminderItem } from "@/lib/reminders";
import { cn } from "@/lib/utils";

const QUICK_TEXTS: Record<ReminderItem["kind"], string[]> = {
  retorno: [
    "Tutor informou que o pet está bem.",
    "Melhorou, sem necessidade de retorno.",
    "Mantém o tratamento, reavaliar depois.",
    "Tutor vai agendar o retorno.",
  ],
  vacina: [
    "Vacinou em outro local.",
    "Tutor vai agendar a vacina.",
    "Adiado a pedido do tutor.",
    "Não vai mais vacinar aqui.",
  ],
};

const formatBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// "Resolvido": dá baixa no lembrete sem mandar mensagem. O que foi
// conversado (opcional) vai para as Observações do prontuário do pet.
export function ResolveReminderDialog({
  item,
  petName,
  clientName,
  onClose,
  onConfirm,
}: {
  item: ReminderItem | null;
  petName?: string;
  clientName?: string;
  onClose: () => void;
  onConfirm: (item: ReminderItem, note: string) => Promise<void> | void;
}) {
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (item) setNote("");
  }, [item]);

  if (!item) return null;
  const isVaccine = item.kind === "vacina";

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(item, note);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <IconChip icon={Check} tone="emerald" />
            <div className="min-w-0">
              <DialogTitle>
                {isVaccine ? "Vacina" : "Acompanhamento"} de {petName || "Pet"} resolvido
              </DialogTitle>
              <DialogDescription>
                {clientName ? `${clientName} · ` : ""}
                {isVaccine ? `${item.vaccine || "Vacina"} prevista` : "Previsto"} para {formatBR(item.dueDate)}. Sai da lista sem mandar
                mensagem.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="resolve-note" className="flex items-center gap-1.5">
            <PenLine className="h-4 w-4 text-muted-foreground" aria-hidden />
            O que foi conversado <span className="font-normal text-muted-foreground">(opcional — vai para o prontuário)</span>
          </Label>
          <Textarea
            id="resolve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void confirm();
            }}
            rows={3}
            placeholder={isVaccine ? "Ex.: vacinou em outra clínica em 20/09." : "Ex.: tutor disse que a ferida cicatrizou, sem coceira."}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEXTS[item.kind].map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setNote((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  note.includes(text) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Check className="mr-2 h-4 w-4" aria-hidden />
            {note.trim() ? "Resolver e anotar" : "Resolver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
