import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useAuth } from "@/contexts/AuthContext";
import { openWhatsAppChat } from "@/lib/whatsappShare";
import { mockCompanySettings } from "@/mockData/settings";
import { buildReminderMessage, getSentReminders, markReminderSent, type ReminderItem } from "@/lib/reminders";
import type { Animal, Client } from "@/types/client";

export const SENT_REMINDERS_KEY = ["reminders-sent"];

/** Telefone para o WhatsApp: o principal, ou o segundo se o principal estiver vazio. */
export const reminderPhone = (client?: Client) => {
  const main = (client?.mainPhoneContact || "").replace(/\D/g, "");
  if (main.length >= 10) return client?.mainPhoneContact;
  const second = (client?.secondaryPhoneContact || "").replace(/\D/g, "");
  return second.length >= 10 ? client?.secondaryPhoneContact : undefined;
};

// Envio do lembrete de vacina/acompanhamento pelo WhatsApp. Usado na tela
// de lembretes e no sininho — o "já avisado" é o mesmo nos dois (cache
// compartilhado), então avisar num lugar some/atualiza no outro na hora.
export function useReminderSender() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: dbClients } = useClientsList();
  const { data: sent = {} } = useQuery({ queryKey: SENT_REMINDERS_KEY, queryFn: getSentReminders, staleTime: 60_000 });

  const animalMap = useMemo(() => {
    const map = new Map<string, { animal: Animal; client: Client }>();
    for (const client of dbClients || []) for (const animal of client.animals || []) map.set(animal.id, { animal, client });
    return map;
  }, [dbClients]);

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
      const sentAt = await markReminderSent(item, { clientId: info?.client.id, sentBy: session?.username });
      queryClient.setQueryData<Record<string, string>>(SENT_REMINDERS_KEY, (prev) => ({ ...(prev ?? {}), [item.key]: sentAt }));
      return true;
    },
    [animalMap, queryClient, session?.username]
  );

  return { animalMap, sent, remind };
}
