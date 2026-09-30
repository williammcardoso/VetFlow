import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useAuth } from "@/contexts/AuthContext";
import { openWhatsAppChat } from "@/lib/whatsappShare";
import { mockCompanySettings } from "@/mockData/settings";
import {
  buildReminderMessage,
  getReminderStatus,
  markReminderResolved,
  markReminderSent,
  unmarkReminderResolved,
  type ReminderItem,
  type ReminderStatus,
} from "@/lib/reminders";
import type { Animal, Client } from "@/types/client";

export const REMINDER_STATUS_KEY = ["reminders-status"];

const EMPTY: ReminderStatus = { sent: {}, resolved: {} };

/** Telefone para o WhatsApp: o principal, ou o segundo se o principal estiver vazio. */
export const reminderPhone = (client?: Client) => {
  const main = (client?.mainPhoneContact || "").replace(/\D/g, "");
  if (main.length >= 10) return client?.mainPhoneContact;
  const second = (client?.secondaryPhoneContact || "").replace(/\D/g, "");
  return second.length >= 10 ? client?.secondaryPhoneContact : undefined;
};

/** Só o "enviado/resolvido" (Painel usa para não contar o que já foi resolvido). */
export function useReminderStatus(): ReminderStatus {
  const { data = EMPTY } = useQuery({ queryKey: REMINDER_STATUS_KEY, queryFn: getReminderStatus, staleTime: 60_000 });
  return data;
}

// Lembrete de vacina/acompanhamento: mandar pelo WhatsApp ou dar como
// resolvido (ex.: o acompanhamento já foi feito por conversa). Usado na tela
// de lembretes e no sininho — o cache é o mesmo, então o que se faz num
// lugar aparece no outro na hora.
export function useReminderSender() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: dbClients } = useClientsList();
  const { sent, resolved } = useReminderStatus();

  const animalMap = useMemo(() => {
    const map = new Map<string, { animal: Animal; client: Client }>();
    for (const client of dbClients || []) for (const animal of client.animals || []) map.set(animal.id, { animal, client });
    return map;
  }, [dbClients]);

  const patch = useCallback(
    (fn: (prev: ReminderStatus) => ReminderStatus) =>
      queryClient.setQueryData<ReminderStatus>(REMINDER_STATUS_KEY, (prev) => fn(prev ?? EMPTY)),
    [queryClient]
  );

  const remind = useCallback(
    async (item: ReminderItem): Promise<boolean> => {
      const info = animalMap.get(item.animalId);
      const phone = reminderPhone(info?.client);
      if (!phone) {
        toast.error("Este cliente não tem telefone cadastrado. Atualize o cadastro para mandar o lembrete.");
        return false;
      }
      openWhatsAppChat(
        phone,
        buildReminderMessage({
          kind: item.kind,
          clientName: info?.client.name ?? "",
          animalName: info?.animal.name ?? "seu pet",
          dueDate: item.dueDate,
          daysUntil: item.daysUntil,
          vaccine: item.vaccine,
          clinicName: mockCompanySettings.companyName,
        })
      );
      const at = await markReminderSent(item, { clientId: info?.client.id, sentBy: session?.username });
      patch((prev) => ({ ...prev, sent: { ...prev.sent, [item.key]: at } }));
      return true;
    },
    [animalMap, patch, session?.username]
  );

  const unresolve = useCallback(
    async (item: ReminderItem) => {
      patch((prev) => {
        const next = { ...prev.resolved };
        delete next[item.key];
        return { ...prev, resolved: next };
      });
      await unmarkReminderResolved(item.key);
    },
    [patch]
  );

  /** Dá como resolvido (sai da lista e do sininho), com "Desfazer" no aviso. */
  const resolve = useCallback(
    async (item: ReminderItem) => {
      const info = animalMap.get(item.animalId);
      const at = new Date().toISOString();
      patch((prev) => ({ ...prev, resolved: { ...prev.resolved, [item.key]: at } }));
      // Grava antes de oferecer o "Desfazer" (senão o desfazer pode chegar ao banco antes da gravação).
      await markReminderResolved(item, { clientId: info?.client.id, sentBy: session?.username });
      const pet = info?.animal.name ?? "Pet";
      toast.success(`${item.kind === "vacina" ? "Vacina" : "Acompanhamento"} de ${pet} resolvido.`, {
        action: { label: "Desfazer", onClick: () => void unresolve(item) },
      });
    },
    [animalMap, patch, session?.username, unresolve]
  );

  return { animalMap, sent, resolved, remind, resolve, unresolve };
}
