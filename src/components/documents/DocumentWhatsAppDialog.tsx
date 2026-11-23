import { useEffect, useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { Eye, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { reminderPhone } from "@/hooks/useReminderSender";
import { createShareLink } from "@/lib/documentShareLinksApi";
import { recordSend } from "@/lib/sendLog";
import { formatDateTime, toLocalISODate } from "@/lib/utils";
import { buildPdfShareMessage, buildSharePreview, openWhatsAppChat, openWhatsAppText } from "@/lib/whatsappShare";
import type { Client } from "@/types/client";

// Termo/atestado oficial já emitido → WhatsApp do tutor com o link curto
// (/d/:code) do PDF que já está no Storage. Mesma janela do aviso da agenda:
// telefone do cadastro, prévia e "Abrir no WhatsApp". O link é gerado ao
// abrir a janela (e não no toque do botão) porque no Safari do iPhone o
// WhatsApp só abre dentro do próprio toque, sem nenhum await antes.

export interface DocumentWhatsAppTarget {
  /** id do documento — vai no contador "Enviado 2×". */
  id: string;
  titulo: string;
  /** URL pública do PDF (pdf_path). */
  pdfUrl: string;
  emitidoEm: string | Date | null;
}

// Um link curto por PDF nesta sessão: reabrir a janela não grava outro.
const shortLinks = new Map<string, Promise<string>>();

function shortLinkFor(pdfUrl: string, preview: { title: string; description: string }): Promise<string> {
  let pending = shortLinks.get(pdfUrl);
  if (!pending) {
    pending = createShareLink(pdfUrl, preview)
      .then((short) => short || pdfUrl)
      .catch(() => pdfUrl);
    shortLinks.set(pdfUrl, pending);
  }
  return pending;
}

function emittedLabels(emitidoEm: string | Date | null): { dateTime: string; date: string } {
  const d = emitidoEm ? new Date(emitidoEm) : null;
  if (!d || Number.isNaN(d.getTime())) return { dateTime: "", date: "" };
  const iso = toLocalISODate(d);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { dateTime: formatDateTime(iso, time), date: formatDateTime(iso) };
}

export function DocumentWhatsAppDialog({
  target,
  petName,
  animalId,
  client,
  onOpenChange,
}: {
  /** null = fechado. */
  target: DocumentWhatsAppTarget | null;
  petName: string;
  animalId?: string;
  client?: Client | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      {target && (
        // No celular a janela fica no alto: o botão de enviar não desce até a
        // barra do Safari. Sem foco automático (o teclado cobriria a prévia).
        <DialogContent className="max-sm:top-3 max-sm:translate-y-0 sm:max-w-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SendBody
            key={target.id}
            target={target}
            petName={petName}
            animalId={animalId}
            client={client}
            onDone={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function SendBody({
  target,
  petName,
  animalId,
  client,
  onDone,
}: {
  target: DocumentWhatsAppTarget;
  petName: string;
  animalId?: string;
  client?: Client | null;
  onDone: () => void;
}) {
  const registeredPhone = reminderPhone(client ?? undefined) ?? "";
  const [phone, setPhone] = useState(registeredPhone);
  const [link, setLink] = useState<string | null>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { dateTime, date } = emittedLabels(target.emitidoEm);

  useEffect(() => {
    let alive = true;
    void shortLinkFor(
      target.pdfUrl,
      buildSharePreview(`${target.titulo} — ${petName}`, date ? `Documento · ${date}` : "Documento")
    ).then((url) => {
      if (alive) setLink(url);
    });
    return () => {
      alive = false;
    };
  }, [target.pdfUrl, target.titulo, petName, date]);

  const original = buildPdfShareMessage({
    title: target.titulo,
    intro: `Olá! Segue o documento *${target.titulo}* de *${petName}*.`,
    dateLabel: dateTime,
    link: link ?? "(gerando o link…)",
  });
  const message = edited ?? original;
  const digits = phone.replace(/\D/g, "");
  const phoneIncomplete = digits.length > 0 && digits.length < 10;
  const tutor = client?.name?.trim() || "O tutor";

  const send = () => {
    if (!link) return;
    if (phoneIncomplete) {
      toast.error("Telefone incompleto — confira o DDD e o número.");
      return;
    }
    if (!message.trim()) {
      toast.error("A mensagem está vazia.");
      return;
    }
    // Abre antes de qualquer await: no Safari do iPhone a janela só abre
    // dentro do próprio toque.
    if (digits) openWhatsAppChat(phone, message);
    else openWhatsAppText(message);
    void recordSend({ type: "document", id: target.id, animalId });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SiWhatsapp className="h-5 w-5 shrink-0 text-[#25D366]" aria-hidden /> Enviar no WhatsApp
        </DialogTitle>
        <DialogDescription>
          {target.titulo} · {petName}
          {client?.name ? ` · ${client.name}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="doc-whatsapp-phone">WhatsApp do tutor</Label>
        <Input
          id="doc-whatsapp-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(19) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={phoneIncomplete}
          className="w-full tabular-nums sm:w-60"
        />
        {phoneIncomplete ? (
          <p className="text-xs text-destructive">Telefone incompleto — confira o DDD e o número.</p>
        ) : !registeredPhone ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
            {tutor} não tem telefone no cadastro. Digite o número acima ou deixe em branco para escolher o contato no
            WhatsApp.
          </p>
        ) : !digits ? (
          <p className="text-xs text-muted-foreground">Sem número: o WhatsApp abre para escolher o contato.</p>
        ) : phone === registeredPhone ? (
          <p className="text-xs text-muted-foreground">Telefone do cadastro do cliente.</p>
        ) : null}
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={editing ? "doc-whatsapp-text" : undefined}>{editing ? "Mensagem" : "Prévia da mensagem"}</Label>
          <div className="flex items-center gap-1">
            {edited !== null && edited !== original && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEdited(null)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Refazer
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!link}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? <Eye className="mr-1 h-3.5 w-3.5" /> : <Pencil className="mr-1 h-3.5 w-3.5" />}
              {editing ? "Ver prévia" : "Editar texto"}
            </Button>
          </div>
        </div>
        {editing ? (
          <Textarea
            id="doc-whatsapp-text"
            value={message}
            onChange={(e) => setEdited(e.target.value)}
            className="h-[30vh] min-h-[10rem] text-sm leading-relaxed sm:h-[22rem]"
          />
        ) : (
          <WhatsAppPreview text={message} className="max-h-[30vh] sm:max-h-[45vh]" />
        )}
      </div>

      <DialogFooter className="max-sm:flex-row">
        <Button type="button" variant="outline" onClick={onDone} className="max-sm:flex-1">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={send}
          disabled={!link}
          className="bg-[#25D366] font-semibold text-white hover:bg-[#1ebe5b] max-sm:flex-[2]"
        >
          <SiWhatsapp className="mr-2 h-4 w-4" aria-hidden /> {link ? "Abrir no WhatsApp" : "Gerando link…"}
        </Button>
      </DialogFooter>
    </>
  );
}
