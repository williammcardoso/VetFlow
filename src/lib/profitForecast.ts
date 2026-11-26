import { monthLabel } from "@/lib/monthlyClosing";

/*
 * Previsão de lucro (Financeiro › Previsão de lucro) a partir do que já
 * entrou. A conta é de propósito simples, para dar para conferir de cabeça:
 *
 *   ritmo = lucro dos últimos 3 meses ÷ dias com movimento nesses meses
 *   mês previsto = ritmo × dias do mês
 *   mês atual = lucro até hoje + ritmo × dias que faltam
 *
 * A faixa (mês fraco / mês forte) usa o menor e o maior ritmo entre esses
 * meses. O lucro é o mesmo do Fechamento 50/50 (recebido − custos); a parte
 * de cada sócio é metade dele mais os acréscimos fora da divisão (ex.:
 * aplicações a domicílio, 100% da clínica).
 */

/** Mês só entra no ritmo com pelo menos isso de dias de movimento (início de mês distorce). */
export const MIN_BASE_DAYS = 10;
/** Quantos meses recentes formam o ritmo. */
export const BASE_MONTHS = 3;

export interface ForecastMonthInput {
  year: number;
  month: number; // 1-12
  /** Lucro do mês (Fechamento 50/50 — o gravado, se o mês estiver fechado). */
  lucro: number;
  /** Dinheiro que entrou no mês. */
  recebido: number;
  /** Acréscimos fora da divisão lançados no fechamento. */
  extrasClinic: number;
  extrasAgro: number;
  closed: boolean;
}

export type ForecastKind = "realizado" | "atual" | "previsto";

export interface ForecastMonth {
  year: number;
  month: number;
  label: string;
  kind: ForecastKind;
  closed: boolean;
  daysInMonth: number;
  /** Dias com movimento (1º mês começa no primeiro lançamento; mês atual vai até hoje). */
  days: number;
  /** Realizado: o do mês. Atual: até hoje. Previsto: 0. */
  lucroAteAgora: number;
  recebidoAteAgora: number;
  /** Lucro do mês: realizado, ou o provável (atual/previsto). */
  lucro: number;
  /** Faixa mês fraco–forte (igual ao lucro no realizado). */
  low: number;
  high: number;
  /** Entradas do mês: realizadas, ou previstas pelo ritmo. */
  recebido: number;
  extrasClinic: number;
  extrasAgro: number;
  /** true = acréscimos estimados pela média (ainda não lançados). */
  extrasEstimated: boolean;
  parteClinica: number;
  parteAgro: number;
}

export interface ForecastBaseMonth {
  label: string;
  days: number;
  lucro: number;
  recebido: number;
  /** Lucro por dia nesse mês. */
  daily: number;
}

export interface ForecastTotals {
  lucro: number;
  low: number;
  high: number;
  parteClinica: number;
  parteAgro: number;
}

export interface ProfitForecast {
  months: ForecastMonth[];
  current: ForecastMonth | null;
  base: {
    months: ForecastBaseMonth[];
    days: number;
    lucro: number;
    recebido: number;
    /** Lucro por dia (provável), do mês mais fraco e do mais forte. */
    daily: number;
    dailyLow: number;
    dailyHigh: number;
    weakest: string | null;
    strongest: string | null;
    /** Entradas por dia. */
    dailyReceipts: number;
    /** Lucro ÷ entradas (%). */
    marginPct: number;
    /** Média por mês, para um mês de 30 dias. */
    lucroMensal: number;
    extrasClinicAvg: number;
    extrasAgroAvg: number;
  };
  /** Próximos 12 meses (a partir do mês seguinte ao atual). */
  next12: ForecastTotals;
  /** Ano do mês atual: realizado + previsto até dezembro. */
  yearEnd: ForecastTotals & { year: number; realizado: number };
  /** false = menos de 2 meses no ritmo: previsão ainda grosseira. */
  enoughData: boolean;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
const key = (year: number, month: number) => year * 12 + (month - 1);
const fromKey = (k: number) => ({ year: Math.floor(k / 12), month: (k % 12) + 1 });

/** Média dos acréscimos nos meses já encerrados, a partir do primeiro mês que teve algum (antes não existia o lançamento). */
function extrasAverage(months: ForecastMonthInput[], pick: (m: ForecastMonthInput) => number): number {
  const first = months.findIndex((m) => pick(m) > 0);
  if (first < 0) return 0;
  const recent = months.slice(first).slice(-BASE_MONTHS);
  return recent.length ? r2(recent.reduce((s, m) => s + pick(m), 0) / recent.length) : 0;
}

export function computeProfitForecast(params: {
  /** Meses do primeiro com movimento até o atual (inclusive), em ordem. Meses sem movimento entram zerados. */
  months: ForecastMonthInput[];
  /** Hoje (AAAA-MM-DD). */
  today: string;
  /** Primeiro dia com movimento (AAAA-MM-DD) — o 1º mês conta a partir dele. */
  firstDate: string;
  /** Quantos meses à frente mostrar na lista (padrão 3). */
  horizon?: number;
}): ProfitForecast {
  const { today, firstDate, horizon = 3 } = params;
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const todayDay = Number(today.slice(8, 10));
  const firstKey = key(Number(firstDate.slice(0, 4)), Number(firstDate.slice(5, 7)));
  const firstDay = Number(firstDate.slice(8, 10));
  const currentKey = key(todayYear, todayMonth);

  const input = params.months.filter((m) => key(m.year, m.month) <= currentKey);
  const past = input.filter((m) => key(m.year, m.month) < currentKey);

  const daysOf = (m: ForecastMonthInput) => {
    const k = key(m.year, m.month);
    if (k < firstKey) return 0;
    const total = daysIn(m.year, m.month);
    const start = k === firstKey ? firstDay : 1;
    const end = k === currentKey ? Math.min(todayDay, total) : total;
    return Math.max(0, end - start + 1);
  };

  // Ritmo: últimos meses com dias suficientes (o atual entra quando já passou do 10º dia).
  const baseInput = input.filter((m) => daysOf(m) >= MIN_BASE_DAYS).slice(-BASE_MONTHS);
  const baseMonths: ForecastBaseMonth[] = baseInput.map((m) => {
    const days = daysOf(m);
    return { label: monthLabel(m.year, m.month), days, lucro: r2(m.lucro), recebido: r2(m.recebido), daily: days > 0 ? m.lucro / days : 0 };
  });
  const baseDays = baseMonths.reduce((s, m) => s + m.days, 0);
  const baseLucro = baseMonths.reduce((s, m) => s + m.lucro, 0);
  const baseRecebido = baseMonths.reduce((s, m) => s + m.recebido, 0);
  const daily = baseDays > 0 ? baseLucro / baseDays : 0;
  const dailyReceipts = baseDays > 0 ? baseRecebido / baseDays : 0;
  const sortedByDaily = [...baseMonths].sort((a, b) => a.daily - b.daily);
  const dailyLow = sortedByDaily[0]?.daily ?? daily;
  const dailyHigh = sortedByDaily[sortedByDaily.length - 1]?.daily ?? daily;

  const extrasClinicAvg = extrasAverage(past, (m) => m.extrasClinic);
  const extrasAgroAvg = extrasAverage(past, (m) => m.extrasAgro);

  const share = (lucro: number, extrasClinic: number, extrasAgro: number) => ({
    parteClinica: r2(lucro / 2 + extrasClinic),
    parteAgro: r2(lucro / 2 + extrasAgro),
  });

  const months: ForecastMonth[] = input.map((m) => {
    const k = key(m.year, m.month);
    const days = daysOf(m);
    const total = daysIn(m.year, m.month);
    if (k < currentKey) {
      return {
        year: m.year,
        month: m.month,
        label: monthLabel(m.year, m.month),
        kind: "realizado",
        closed: m.closed,
        daysInMonth: total,
        days,
        lucroAteAgora: r2(m.lucro),
        recebidoAteAgora: r2(m.recebido),
        lucro: r2(m.lucro),
        low: r2(m.lucro),
        high: r2(m.lucro),
        recebido: r2(m.recebido),
        extrasClinic: r2(m.extrasClinic),
        extrasAgro: r2(m.extrasAgro),
        extrasEstimated: false,
        ...share(m.lucro, m.extrasClinic, m.extrasAgro),
      };
    }
    // Mês atual: o que já entrou + ritmo nos dias que faltam.
    const remaining = Math.max(0, total - Math.min(todayDay, total));
    const lucro = m.lucro + remaining * daily;
    const extrasEstimated = m.extrasClinic <= 0 && m.extrasAgro <= 0 && (extrasClinicAvg > 0 || extrasAgroAvg > 0);
    const extrasClinic = extrasEstimated ? extrasClinicAvg : m.extrasClinic;
    const extrasAgro = extrasEstimated ? extrasAgroAvg : m.extrasAgro;
    return {
      year: m.year,
      month: m.month,
      label: monthLabel(m.year, m.month),
      kind: "atual",
      closed: m.closed,
      daysInMonth: total,
      days,
      lucroAteAgora: r2(m.lucro),
      recebidoAteAgora: r2(m.recebido),
      lucro: r2(lucro),
      low: r2(m.lucro + remaining * dailyLow),
      high: r2(m.lucro + remaining * dailyHigh),
      recebido: r2(m.recebido + remaining * dailyReceipts),
      extrasClinic: r2(extrasClinic),
      extrasAgro: r2(extrasAgro),
      extrasEstimated,
      ...share(lucro, extrasClinic, extrasAgro),
    };
  });

  const projected = (k: number): ForecastMonth => {
    const { year, month } = fromKey(k);
    const total = daysIn(year, month);
    const lucro = total * daily;
    return {
      year,
      month,
      label: monthLabel(year, month),
      kind: "previsto",
      closed: false,
      daysInMonth: total,
      days: 0,
      lucroAteAgora: 0,
      recebidoAteAgora: 0,
      lucro: r2(lucro),
      low: r2(total * dailyLow),
      high: r2(total * dailyHigh),
      recebido: r2(total * dailyReceipts),
      extrasClinic: extrasClinicAvg,
      extrasAgro: extrasAgroAvg,
      extrasEstimated: extrasClinicAvg > 0 || extrasAgroAvg > 0,
      ...share(lucro, extrasClinicAvg, extrasAgroAvg),
    };
  };
  for (let i = 1; i <= horizon; i++) months.push(projected(currentKey + i));

  const totals = (list: ForecastMonth[]): ForecastTotals => ({
    lucro: r2(list.reduce((s, m) => s + m.lucro, 0)),
    low: r2(list.reduce((s, m) => s + m.low, 0)),
    high: r2(list.reduce((s, m) => s + m.high, 0)),
    parteClinica: r2(list.reduce((s, m) => s + m.parteClinica, 0)),
    parteAgro: r2(list.reduce((s, m) => s + m.parteAgro, 0)),
  });

  const next12 = totals(Array.from({ length: 12 }, (_, i) => projected(currentKey + i + 1)));
  const current = months.find((m) => m.kind === "atual") ?? null;
  const yearMonths = [
    ...months.filter((m) => m.year === todayYear && m.kind !== "previsto"),
    ...Array.from({ length: 12 - todayMonth }, (_, i) => projected(currentKey + i + 1)),
  ];
  const realizado = r2(yearMonths.filter((m) => m.kind === "realizado").reduce((s, m) => s + m.lucro, 0));

  return {
    months,
    current,
    base: {
      months: baseMonths,
      days: baseDays,
      lucro: r2(baseLucro),
      recebido: r2(baseRecebido),
      daily: r2(daily),
      dailyLow: r2(dailyLow),
      dailyHigh: r2(dailyHigh),
      weakest: baseMonths.length > 1 ? sortedByDaily[0].label : null,
      strongest: baseMonths.length > 1 ? sortedByDaily[sortedByDaily.length - 1].label : null,
      dailyReceipts: r2(dailyReceipts),
      marginPct: baseRecebido > 0 ? Math.round((baseLucro / baseRecebido) * 100) : 0,
      lucroMensal: r2(daily * 30),
      extrasClinicAvg,
      extrasAgroAvg,
    },
    next12,
    yearEnd: { year: todayYear, realizado, ...totals(yearMonths) },
    enoughData: baseMonths.length >= 2,
  };
}
