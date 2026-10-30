import React, { useMemo, useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { Pencil, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KindBadge } from "@/components/agenda/bookingKindVisual";
import { reminderPhone } from "@/hooks/useReminderSender";
import { buildAppointmentNotice, clinicAddressLine, phoneFromText } from "@/lib/appointmentNotice";
import type { ScheduleUI } from "@/lib/schedulesApi";
import { recordSend } from "@/lib/sendLog";
import { openWhatsAppChat, openWhatsAppText } from "@/lib/whatsappShare";
import { mockCompanySettings } from "@/mockData/settings";
import type { Client } from "@/types/client";

const normalizeName = (s?: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

type PhoneSource = "cadastro" | "observacao" | "nome" | "nenhum";

/**
 * Cliente e telefone do agendamento. O da agenda pública não tem cliente
 * vinculado: tenta o telefone escrito na observação e, se o nome bater com um
 * único cliente cadastrado, o telefone dele.
 */
function resolveContact(app: ScheduleUI, clients: Client[]): { client?: Client; phone: string; source: PhoneSource } {
  const linked = app.clientId ? clients.find((c) => c.id === app.clientId) : undefined;
  const linkedPhone = reminderPhone(linked);
  if (linked && linkedPhone) return { client: linked, phone: linkedPhone, source: "cadastro" };
  const written = phoneFromText(app.kindInfo?.obs) ?? phoneFromText(app.notes);
  if (written) return { client: linked, phone: written, source: "observacao" };
  if (!linked && app.clientName) {
    const same = clients.filter((c) => normalizeName(c.name) === normalizeName(app.clientName));
    const phone = same.length === 1 ? reminderPhone(same[0]) : undefined;
    if (phone) return { client: same[0], phone, source: "nome" };
  }
  return { client: linked, phone: "", source: "nenhum" };
}

const SOURCE_HINT: Record<PhoneSource, string> = {
  cadastro: "Telefone do cadastro do cliente.",
  observacao: "Telefone escrito na observação do agendamento.",
  nome: "Telefone do cliente cadastrado com esse nome.",
  nenhum: "Sem telefone no cadastro — digite o número ou deixe vazio para escolher o contato no WhatsApp.",
};

// "*negrito*" do WhatsApp na prévia.
function WhatsAppText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

export function AppointmentNoticeDialog({
  appointment,
  clients,
  onOpenChange,
}: {
  /** null = fechado. */
  appointment: ScheduleUI | null;
  clients: Client[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      {appointment && (
        // No celular a janela fica no alto (não no meio): o botão de enviar
        // não desce até a barra do Safari, que come o toque ali. Sem foco
        // automático no telefone — senão o teclado abre por cima da prévia.
        <DialogContent
          className="max-sm:top-3 max-sm:translate-y-0 sm:max-w-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* key: abrir outro agendamento recomeça telefone e texto */}
          <NoticeBody key={appointment.id} appointment={appointment} clients={clients} onDone={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function NoticeBody({ appointment: app, clients, onDone }: { appointment: ScheduleUI; clients: Client[]; onDone: () => void }) {
  const contact = useMemo(() => resolveContact(app, clients), [app, clients]);
  const animal = contact.client?.animals?.find((a) => a.id === app.animalId) ??
    contact.client?.animals?.find((a) => normalizeName(a.name) === normalizeName(app.animalName));
  const original = useMemo(
    () =>
      buildAppointmentNotice({
        kind: app.kind,
        kindInfo: app.kindInfo,
        title: app.title,
        clientName: app.clientName || contact.client?.name,
        animalName: app.animalName,
        animalGender: animal?.gender,
        date: app.date,
        time: app.time,
        status: app.status,
        clinicName: mockCompanySettings.companyName,
        clinicAddress: clinicAddressLine(mockCompanySettings.address, mockCompanySettings.city),
      }),
    [app, contact.client, animal?.gender]
  );
  const [phone, setPhone] = useState(contact.phone);
  const [message, setMessage] = useState(original);
  const [editing, setEditing] = useState(false);
  const digits = phone.replace(/\D/g, "");
  const phoneIncomplete = digits.length > 0 && digits.length < 10;

  const send = () => {
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
    void recordSend({ type: "schedule", id: app.id, animalId: app.animalId || undefined });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SiWhatsapp className="h-5 w-5 shrink-0 text-[#25D366]" aria-hidden /> Aviso pelo WhatsApp
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
          <span>
            {app.clientName || contact.client?.name || "Cliente"}
            {app.animalName ? ` · ${app.animalName}` : ""}
          </span>
          {app.kind && <KindBadge kind={app.kind} info={app.kindInfo} />}
        </DialogDescription>
      </DialogHeader>

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="notice-phone">WhatsApp do tutor</Label>
        <Input
          id="notice-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(19) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={phoneIncomplete}
          className="w-full tabular-nums sm:w-60"
        />
        <p className={phoneIncomplete ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {phoneIncomplete ? "Telefone incompleto — confira o DDD e o número." : SOURCE_HINT[contact.source]}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={editing ? "notice-text" : undefined}>{editing ? "Mensagem" : "Prévia da mensagem"}</Label>
          <div className="flex items-center gap-1">
            {message !== original && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setMessage(original)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Refazer
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing((v) => !v)}>
              {editing ? <Eye className="mr-1 h-3.5 w-3.5" /> : <Pencil className="mr-1 h-3.5 w-3.5" />}
              {editing ? "Ver prévia" : "Editar texto"}
            </Button>
          </div>
        </div>
        {editing ? (
          <Textarea
            id="notice-text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-[30vh] min-h-[10rem] text-sm leading-relaxed sm:h-[22rem]"
          />
        ) : (
          // Fundo e balão no estilo da conversa do WhatsApp — o que o tutor vai ver.
          <div className="max-h-[30vh] overflow-y-auto rounded-lg sm:max-h-[45vh] bg-[#efeae2] p-3 dark:bg-[#0b141a]">
            <div className="ml-auto w-fit max-w-full rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[13px] leading-relaxed text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
              <p className="whitespace-pre-wrap break-words">
                <WhatsAppText text={message} />
              </p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="max-sm:flex-row">
        <Button type="button" variant="outline" onClick={onDone} className="max-sm:flex-1">
          Cancelar
        </Button>
        <Button type="button" onClick={send} className="bg-[#25D366] font-semibold text-white hover:bg-[#1ebe5b] max-sm:flex-[2]">
          <SiWhatsapp className="mr-2 h-4 w-4" aria-hidden /> Abrir no WhatsApp
        </Button>
      </DialogFooter>
    </>
  );
}
