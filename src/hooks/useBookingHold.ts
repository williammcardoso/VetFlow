import { useCallback, useEffect, useRef, useState } from "react";
import { holdSlots, releaseHolds, releaseHoldsOnUnload, type HoldResult } from "@/lib/agendaHoldsApi";
import type { BookingKind } from "@/lib/agendaKinds";

/** Tempo sem mexer até a trava soltar sozinha (o banco usa o mesmo valor). */
export const HOLD_TTL_MS = 10 * 60 * 1000;
/** Mexer no formulário renova a trava, no máximo uma vez por minuto. */
const RENEW_EVERY_MS = 60 * 1000;

export interface HeldCells {
  date: string;
  times: string[];
  /** Hora local em que a trava vence se ninguém mexer. */
  expiresAt: number;
}

interface HoldRequest {
  date: string;
  times: string[];
  kind: BookingKind | null;
  ignoreScheduleId: string | null;
}

/**
 * Trava de horário da agenda pública para esta aba. `request` segura os
 * horários (troca os anteriores), `touch` renova enquanto alguém usa o
 * formulário, e a trava solta sozinha ao fechar a aba ou depois de 10 min
 * parada (avisando por `onExpire`). `supported` vira false se o banco ainda
 * não tem as funções (migration não aplicada) — aí a página segue sem trava.
 */
export function useBookingHold({
  sessionId,
  station,
  onExpire,
}: {
  sessionId: string;
  station: string;
  onExpire: (held: HeldCells) => void;
}) {
  const [held, setHeld] = useState<HeldCells | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const seqRef = useRef(0);
  const lastRequestRef = useRef<HoldRequest | null>(null);
  const lastRenewRef = useRef(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const stationRef = useRef(station);
  stationRef.current = station;
  // Uma chamada por vez, na ordem: um pedido antigo nunca chega ao banco
  // depois de um mais novo (e desfaz a troca de horário).
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(fn, fn);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Segura `times` (vazio = soltar). Devolve null se outro pedido mais novo passou na frente. */
  const request = useCallback(
    async (req: HoldRequest): Promise<HoldResult | null> => {
      const seq = ++seqRef.current;
      lastRequestRef.current = req;
      setPending(true);
      try {
        const res = await enqueue(() =>
          holdSlots({
            sessionId,
            station: stationRef.current,
            date: req.date,
            times: req.times,
            kind: req.kind,
            ignoreScheduleId: req.ignoreScheduleId,
          })
        );
        if (seq !== seqRef.current) return null;
        if (res.status === "unavailable") {
          setSupported(false);
          setHeld(null);
        } else {
          setSupported(true);
          if (res.status === "ok") {
            lastRenewRef.current = Date.now();
            setHeld(req.times.length ? { date: req.date, times: req.times, expiresAt: Date.now() + HOLD_TTL_MS } : null);
          }
        }
        return res;
      } finally {
        if (seq === seqRef.current) setPending(false);
      }
    },
    [sessionId, enqueue]
  );

  /** Solta tudo (cancelou, saiu da edição). */
  const release = useCallback(async () => {
    seqRef.current++;
    lastRequestRef.current = null;
    setHeld(null);
    setPending(false);
    await enqueue(() => releaseHolds(sessionId));
  }, [sessionId, enqueue]);

  /** O banco já soltou (gravou o agendamento) — só esquece aqui. */
  const forget = useCallback(() => {
    seqRef.current++;
    lastRequestRef.current = null;
    setHeld(null);
    setPending(false);
  }, []);

  /** Alguém mexeu na página: renova a trava (no máximo 1x por minuto, ou já se `force`). */
  const touch = useCallback(
    (force = false) => {
      const req = lastRequestRef.current;
      if (!req || !req.times.length || !held) return;
      if (!force && Date.now() - lastRenewRef.current < RENEW_EVERY_MS) return;
      lastRenewRef.current = Date.now();
      void request(req).catch(() => undefined);
    },
    [held, request]
  );

  // Vence sozinha depois de 10 min parada.
  useEffect(() => {
    if (!held) return;
    const ms = held.expiresAt - Date.now();
    const timer = window.setTimeout(() => {
      seqRef.current++;
      lastRequestRef.current = null;
      setHeld(null);
      onExpireRef.current(held);
    }, Math.max(ms, 0));
    return () => window.clearTimeout(timer);
  }, [held]);

  // Fechou a aba, recarregou ou saiu da página: solta na hora.
  useEffect(() => {
    const onPageHide = () => releaseHoldsOnUnload(sessionId);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      void releaseHolds(sessionId);
    };
  }, [sessionId]);

  return { held, supported, pending, request, release, forget, touch, enqueue };
}
