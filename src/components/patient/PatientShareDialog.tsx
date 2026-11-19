import { useEffect, useMemo, useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { Copy, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import {
  availableShareFields,
  buildPatientShareText,
  DEFAULT_SHARE_FIELDS,
  PET_FIELDS,
  SHARE_FIELD_LABEL,
  TUTOR_FIELDS,
  type ShareField,
} from "@/lib/patientShareText";
import { listSpecialistContacts, removeSpecialistContact, saveSpecialistContact, specialistContactId, type SpecialistContact } from "@/lib/specialistContactsApi";
import { openWhatsAppChat, openWhatsAppText } from "@/lib/whatsappShare";
import { mockCompanySettings } from "@/mockData/settings";
import { cn } from "@/lib/utils";
import type { Animal, Client } from "@/types/client";

// Dados do tutor e do pet para especialista externo (cardiologista,
// ultrassonografista, laboratório...) que pede para cadastrar no sistema
// dele: escolhe o que vai, vê a prévia e copia ou abre o WhatsApp dele.

const digits = (s: string) => s.replace(/\D/g, "");

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* sem permissão: tenta o jeito antigo */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  return ok;
}

export function PatientShareDialog({
  open,
  onOpenChange,
  animal,
  client,
  weight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: Animal;
  client: Client;
  weight?: { kg: number; date?: string } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        // No celular a janela fica no alto: o botão de enviar não desce até a
        // barra do Safari. Sem foco automático (o teclado cobriria a prévia).
        <DialogContent className="max-sm:top-3 max-sm:max-h-[80dvh] max-sm:translate-y-0 sm:max-w-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <ShareBody animal={animal} client={client} weight={weight} onDone={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ShareBody({ animal, client, weight, onDone }: { animal: Animal; client: Client; weight?: { kg: number; date?: string } | null; onDone: () => void }) {
  const available = useMemo(() => availableShareFields(animal, client, weight?.kg), [animal, client, weight?.kg]);
  const [include, setInclude] = useState<ShareField[]>(() => DEFAULT_SHARE_FIELDS.filter((f) => available.includes(f)));
  const [note, setNote] = useState("");
  const [contacts, setContacts] = useState<SpecialistContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    void listSpecialistContacts().then(setContacts);
  }, []);

  const text = useMemo(
    () =>
      buildPatientShareText({
        animal,
        client,
        include,
        weight,
        note,
        clinicName: mockCompanySettings.companyName,
      }),
    [animal, client, include, weight, note]
  );

  const phoneDigits = digits(phone);
  const phoneIncomplete = phoneDigits.length > 0 && phoneDigits.length < 10;
  const selectedId = phoneDigits.length >= 10 ? specialistContactId(phone) : null;
  const known = contacts.find((c) => c.id === selectedId);
  const isNewContact = !!name.trim() && phoneDigits.length >= 10 && (!known || known.name !== name.trim());

  const toggle = (field: ShareField) => setInclude((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));

  const pick = (c: SpecialistContact) => {
    setName(c.name);
    setPhone(c.phone);
  };

  const forget = async (c: SpecialistContact) => {
    if (await removeSpecialistContact(c.id)) {
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
      if (selectedId === c.id) {
        setName("");
        setPhone("");
      }
    } else toast.error("Não consegui remover o especialista.");
  };

  const copy = async () => {
    if (await copyText(text)) toast.success("Dados copiados — é só colar na conversa com o especialista.");
    else toast.error("Não consegui copiar. Selecione o texto da prévia e copie.");
  };

  const send = () => {
    if (phoneIncomplete) {
      toast.error("WhatsApp do especialista incompleto — confira o DDD e o número.");
      return;
    }
    // Abre antes de qualquer await: no Safari do iPhone a janela só abre
    // dentro do próprio toque.
    if (phoneDigits) openWhatsAppChat(phone, text);
    else openWhatsAppText(text);
    if (remember && isNewContact) {
      void saveSpecialistContact(name, phone).then((saved) => {
        if (!saved) toast.warning("Os dados foram enviados, mas o especialista não ficou salvo na lista.");
      });
    }
    onDone();
  };

  const fieldChips = (fields: ShareField[]) =>
    fields
      .filter((f) => available.includes(f))
      .map((f) => {
        const on = include.includes(f);
        return (
          <label
            key={f}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              on ? "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200" : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            <Checkbox checked={on} onCheckedChange={() => toggle(f)} className="h-3.5 w-3.5" />
            {SHARE_FIELD_LABEL[f]}
          </label>
        );
      });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 shrink-0 text-sky-600" aria-hidden /> Dados para especialista
        </DialogTitle>
        <DialogDescription>
          {animal.name} · {client.name} — escolha o que vai e mande pronto, sem digitar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="space-y-2">
            <p className="text-sm font-medium">Para quem</p>
            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {contacts.map((c) => {
                  const on = selectedId === c.id;
                  return (
                    <span
                      key={c.id}
                      className={cn(
                        "inline-flex items-center rounded-full border text-xs font-medium transition-colors",
                        on ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <button type="button" onClick={() => pick(c)} className="py-1 pl-2.5 pr-1.5" title={c.phone}>
                        {c.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => void forget(c)}
                        className="rounded-full p-1 pr-1.5 text-muted-foreground hover:text-destructive"
                        aria-label={`Tirar ${c.name} da lista`}
                        title="Tirar da lista"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1 sm:max-w-[15rem]">
                <Label htmlFor="specialist-name" className="text-xs">
                  Especialista
                </Label>
                <Input id="specialist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dra. Ana (cardio)" />
              </div>
              <div className="w-full space-y-1 sm:w-44">
                <Label htmlFor="specialist-phone" className="text-xs">
                  WhatsApp
                </Label>
                <Input
                  id="specialist-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(19) 99999-9999"
                  aria-invalid={phoneIncomplete}
                  className="tabular-nums"
                />
              </div>
            </div>
            {isNewContact ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} className="h-3.5 w-3.5" />
                Guardar {name.trim()} na lista para as próximas
              </label>
            ) : (
              !phoneDigits && <p className="text-xs text-muted-foreground">Sem número: o WhatsApp abre para escolher o contato.</p>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium">O que enviar</p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paciente · {animal.name}</p>
              <div className="flex flex-wrap gap-1.5">{fieldChips(PET_FIELDS)}</div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tutor · {client.name}</p>
              <div className="flex flex-wrap gap-1.5">{fieldChips(TUTOR_FIELDS)}</div>
            </div>
          </section>

          <section className="space-y-1">
            <Label htmlFor="specialist-note" className="text-sm">
              Solicitação <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="specialist-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Ecocardiograma — sopro grau III, avaliar antes da anestesia." />
          </section>
        </div>

        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium">Prévia</p>
          <WhatsAppPreview text={text} className="max-h-[40vh] md:max-h-[28rem]" />
        </div>
      </div>

      <DialogFooter className="max-sm:flex-row">
        <Button type="button" variant="outline" onClick={() => void copy()} className="gap-1.5 max-sm:flex-1">
          <Copy className="h-4 w-4" aria-hidden /> Copiar
        </Button>
        <Button type="button" onClick={send} className="gap-1.5 bg-[#25D366] font-semibold text-white hover:bg-[#1ebe5b] max-sm:flex-[2]">
          <SiWhatsapp className="h-4 w-4" aria-hidden /> Abrir no WhatsApp
        </Button>
      </DialogFooter>
    </>
  );
}
