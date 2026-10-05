// Ocupação da grade da agenda pública — puro, sem banco. Um agendamento
// ocupa todos os horários da grade que encostam no intervalo dele
// [início, início + duração): consulta de 1h às 15:00 ocupa 15:00 e 15:30.
// Mesma regra da função agenda_conflicts do banco, para a grade nunca
// mostrar "Livre" num horário que o banco vai recusar.

export interface OccupancyBooking {
  id: string;
  date: string;
  time: string;
  durationMinutes?: number | null;
}

export interface CellEntry<B> {
  booking: B;
  /** Primeiro horário do agendamento (mostra o nome); os seguintes são continuação. */
  isStart: boolean;
}

export function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToHHMM(total: number): string {
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Horário aberto mais perto de um minuto qualquer (encaixe torto, ex.: 10:45). */
export function nearestSlot(minutes: number, openSlots: string[]): string {
  let best = openSlots[0];
  let bestDiff = Infinity;
  for (const slot of openSlots) {
    const slotMin = toMinutes(slot);
    if (slotMin === null) continue;
    const diff = Math.abs(slotMin - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = slot;
    }
  }
  return best;
}

/** Horários da grade que o agendamento ocupa. Fora do expediente, cai no mais próximo (pra não sumir da grade). */
export function bookingCells(
  time: string,
  durationMinutes: number | null | undefined,
  daySlots: string[],
  intervalMinutes: number
): string[] {
  const start = toMinutes(time);
  if (start === null || daySlots.length === 0) return [];
  const step = intervalMinutes > 0 ? intervalMinutes : 30;
  const end = start + (durationMinutes && durationMinutes > 0 ? durationMinutes : step);
  const cells = daySlots.filter((slot) => {
    const m = toMinutes(slot);
    return m !== null && m < end && m + step > start;
  });
  return cells.length ? cells : [nearestSlot(start, daySlots)];
}

/** `${data}|${horário}` → agendamentos naquele horário da grade (o que começa ali primeiro). */
export function buildCellMap<B extends OccupancyBooking>(
  bookings: B[],
  getDaySlots: (dateISO: string) => string[],
  intervalMinutes: number
): Map<string, CellEntry<B>[]> {
  const map = new Map<string, CellEntry<B>[]>();
  const slotsByDate = new Map<string, string[]>();
  for (const booking of bookings) {
    let daySlots = slotsByDate.get(booking.date);
    if (!daySlots) {
      daySlots = getDaySlots(booking.date);
      slotsByDate.set(booking.date, daySlots);
    }
    bookingCells(booking.time, booking.durationMinutes, daySlots, intervalMinutes).forEach((cell, i) => {
      const key = `${booking.date}|${cell}`;
      const list = map.get(key) || [];
      list.push({ booking, isStart: i === 0 });
      map.set(key, list);
    });
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(b.isStart) - Number(a.isStart) || (toMinutes(a.booking.time) ?? 0) - (toMinutes(b.booking.time) ?? 0));
  }
  return map;
}

/**
 * Horários seguidos que um agendamento de `durationMinutes` começando em
 * `start` precisa. Null se não couber no expediente (bate no almoço ou no
 * fechamento).
 */
export function rangeCells(daySlots: string[], start: string, durationMinutes: number, intervalMinutes: number): string[] | null {
  const startMin = toMinutes(start);
  const idx = daySlots.indexOf(start);
  if (startMin === null || idx === -1) return null;
  const step = intervalMinutes > 0 ? intervalMinutes : 30;
  const count = Math.max(1, Math.ceil(durationMinutes / step));
  const cells: string[] = [];
  for (let k = 0; k < count; k++) {
    const cell = daySlots[idx + k];
    if (!cell || toMinutes(cell) !== startMin + k * step) return null;
    cells.push(cell);
  }
  return cells;
}

/** Quantos horários seguidos, a partir de `start`, estão livres (para no almoço/fechamento ou no primeiro ocupado). */
export function freeRunLength(
  daySlots: string[],
  start: string,
  intervalMinutes: number,
  isFree: (cell: string) => boolean,
  max = 12
): number {
  const startMin = toMinutes(start);
  const idx = daySlots.indexOf(start);
  if (startMin === null || idx === -1) return 0;
  const step = intervalMinutes > 0 ? intervalMinutes : 30;
  let n = 0;
  while (n < max) {
    const cell = daySlots[idx + n];
    if (!cell || toMinutes(cell) !== startMin + n * step || !isFree(cell)) break;
    n++;
  }
  return n;
}
