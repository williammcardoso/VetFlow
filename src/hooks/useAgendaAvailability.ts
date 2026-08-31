import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/agendaAvailabilityApi";
import type { WeeklyDayHours, AgendaException, AgendaSettings } from "@/lib/agendaAvailabilityApi";

/**
 * Configuração de horários da Agenda pública (padrão semanal + exceções +
 * intervalo). Se a migration `agenda_availability_config` ainda não tiver
 * sido aplicada no banco (tabelas não existem), cai nos valores que já
 * estavam fixos no código antes dessa feature — a página pública nunca
 * fica "tudo fechado" por causa disso. `usingFallback` avisa esse caso na
 * tela de admin, pra não parecer que salvar não funcionou.
 */
export function useAgendaAvailability(): {
  weeklyHours: WeeklyDayHours[];
  exceptions: AgendaException[];
  settings: AgendaSettings;
  loading: boolean;
  usingFallback: boolean;
  refetch: () => Promise<void>;
} {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyDayHours[]>(api.LEGACY_WEEKLY_HOURS);
  const [exceptions, setExceptions] = useState<AgendaException[]>([]);
  const [settings, setSettings] = useState<AgendaSettings>({ intervalMinutes: api.LEGACY_INTERVAL_MINUTES });
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [weekly, exc, cfg] = await Promise.all([api.getWeeklyHours(), api.listExceptions(), api.getAgendaSettings()]);
      setWeeklyHours(weekly.length === 7 ? weekly : api.LEGACY_WEEKLY_HOURS);
      setExceptions(exc);
      setSettings(cfg);
      setUsingFallback(false);
    } catch {
      // Tabela ainda não existe (migration não aplicada) ou falha de rede —
      // mantém a página pública funcionando com o horário que já era fixo.
      setWeeklyHours(api.LEGACY_WEEKLY_HOURS);
      setExceptions([]);
      setSettings({ intervalMinutes: api.LEGACY_INTERVAL_MINUTES });
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { weeklyHours, exceptions, settings, loading, usingFallback, refetch };
}
