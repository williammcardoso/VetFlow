import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSchedulesList } from "@/hooks/useSchedules";
import { useAppointments } from "@/hooks/useAppointments";
import { useReminderSender } from "@/hooks/useReminderSender";
import { useAuth } from "@/contexts/AuthContext";
import { BACKUP_REMINDER_DAYS, daysSinceLastBackup } from "@/lib/backupApi";
import { buildReminders } from "@/lib/reminders";
import { buildNotifications, filterByPrefs } from "@/lib/notifications";
import {
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";

export const NOTIFICATION_PREFS_KEY = ["notification-prefs"];

/** Preferências do sininho + salvar (atualiza o sininho na hora). */
export function useNotificationPrefs() {
  const queryClient = useQueryClient();
  const { data: prefs = DEFAULT_NOTIFICATION_PREFS, isLoading } = useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: getNotificationPrefs,
    staleTime: 5 * 60_000,
  });
  const [savedOnlyHere, setSavedOnlyHere] = React.useState(false);

  const update = React.useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const next = { ...(queryClient.getQueryData<NotificationPrefs>(NOTIFICATION_PREFS_KEY) ?? DEFAULT_NOTIFICATION_PREFS), ...patch };
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, next);
      const { savedInDb } = await saveNotificationPrefs(next);
      setSavedOnlyHere(!savedInDb);
      if (savedInDb) toast.success("Preferência salva.", { id: "notif-prefs" });
      else toast.warning("Salvo só neste aparelho — falta aplicar a migration das notificações.", { id: "notif-prefs" });
    },
    [queryClient]
  );

  return { prefs, isLoading, update, savedOnlyHere };
}

// Tudo o que o sininho precisa. `all` ignora os liga/desliga (a tela de
// configuração mostra quantos avisos cada tipo daria); `visible` é o que
// aparece no sininho.
export function useAppNotifications() {
  const { session } = useAuth();
  const { prefs } = useNotificationPrefs();
  const reminders = useReminderSender();
  const { data: schedules = [] } = useSchedulesList();
  const { appointments } = useAppointments();

  // Recalcula o "em 25 min" a cada minuto.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const { animalMap, sent, resolved } = reminders;
  const all = React.useMemo(() => {
    const pets = new Map<string, { animal: string; client: string }>();
    for (const [id, info] of animalMap) pets.set(id, { animal: info.animal.name, client: info.client.name });
    return buildNotifications({
      now,
      schedules,
      reminders: buildReminders(appointments, now),
      sent,
      resolved,
      pets,
      prefs,
      backupDays: session?.role === "admin" ? daysSinceLastBackup(now) : undefined,
      backupReminderDays: BACKUP_REMINDER_DAYS,
    });
  }, [now, schedules, appointments, sent, resolved, animalMap, prefs, session?.role]);

  const visible = React.useMemo(() => filterByPrefs(all, prefs), [all, prefs]);

  return { all, visible, prefs, ...reminders };
}
