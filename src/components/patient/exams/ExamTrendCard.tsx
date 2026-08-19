import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea } from "recharts";
import { TrendingUp } from "lucide-react";
import type { ExamEntry, HemogramReference } from "@/types/exam";
import { fetchHemogramReferences } from "@/constants/examReferences";
import { parseBrNumber, formatDateTime } from "@/lib/utils";

interface TrendPoint {
  dateLabel: string;
  value: number;
}

type TrendCategory = "hemogram" | "biochemical";

interface AnalyteTrend {
  name: string;
  category: TrendCategory;
  unit: string;
  min?: number;
  max?: number;
  points: TrendPoint[];
}

// Campos fixos de hemograma que existem direto no ExamEntry (não numa lista
// como o bioquímico) — mesmas chaves usadas em defaultHemogramReferences.
const HEMOGRAM_FIELDS: Array<{ key: keyof ExamEntry; label: string; unit: string }> = [
  { key: "eritrocitos", label: "Eritrócitos", unit: "M/µL" },
  { key: "hemoglobina", label: "Hemoglobina", unit: "g/dL" },
  { key: "hematocrito", label: "Hematócrito", unit: "%" },
  { key: "leucocitosTotais", label: "Leucócitos totais", unit: "/µL" },
  { key: "contagemPlaquetaria", label: "Plaquetas", unit: "/µL" },
];

// Bioquímico é a única modalidade com série de analitos nomeados repetível
// (biochemicalEntries); a referência (min/max/unidade) vem do próprio
// lançamento, já que cada entrada guarda o que valia na hora.
function buildBiochemicalTrends(exams: ExamEntry[]): AnalyteTrend[] {
  const byAnalyte = new Map<string, AnalyteTrend>();

  const bioExams = exams
    .filter((e) => e.type === "Bioquímico" && (e.biochemicalEntries?.length ?? 0) > 0)
    .slice()
    .sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`));

  for (const exam of bioExams) {
    for (const entry of exam.biochemicalEntries || []) {
      const name = entry.enzyme?.trim();
      const value = parseBrNumber(entry.result);
      if (!name || value === undefined) continue;

      const existing =
        byAnalyte.get(name) || { name, category: "biochemical" as const, unit: "", min: undefined, max: undefined, points: [] };
      if (entry.referenceUnit) existing.unit = entry.referenceUnit;
      const min = parseBrNumber(entry.minReference || "");
      const max = parseBrNumber(entry.maxReference || "");
      if (min !== undefined) existing.min = min;
      if (max !== undefined) existing.max = max;
      existing.points.push({ dateLabel: formatDateTime(exam.date), value });
      byAnalyte.set(name, existing);
    }
  }

  return Array.from(byAnalyte.values()).filter((t) => t.points.length >= 2);
}

// Hemograma não guarda referência por lançamento (só o valor cru) — a faixa
// vem de Cadastros > Referências de Exame (com fallback embutido no
// código), a mesma fonte usada no laudo, filtrada pela espécie do paciente.
function buildHemogramTrends(
  exams: ExamEntry[],
  hemogramReferences: Record<string, HemogramReference>,
  species: "dog" | "cat" | undefined
): AnalyteTrend[] {
  const hemoExams = exams
    .filter((e) => e.type === "Hemograma Completo")
    .slice()
    .sort((a, b) => `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`));

  const trends: AnalyteTrend[] = [];
  for (const field of HEMOGRAM_FIELDS) {
    const points: TrendPoint[] = [];
    for (const exam of hemoExams) {
      const raw = exam[field.key] as string | undefined;
      const value = parseBrNumber(raw || "");
      if (value === undefined) continue;
      points.push({ dateLabel: formatDateTime(exam.date), value });
    }
    if (points.length < 2) continue;
    const ref = species ? hemogramReferences[field.key]?.[species] : undefined;
    trends.push({ name: field.label, category: "hemogram", unit: field.unit, min: ref?.min, max: ref?.max, points });
  }
  return trends;
}

export function buildTrends(
  exams: ExamEntry[],
  hemogramReferences: Record<string, HemogramReference> = {},
  species?: "dog" | "cat"
): AnalyteTrend[] {
  return [
    ...buildHemogramTrends(exams, hemogramReferences, species),
    ...buildBiochemicalTrends(exams),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export default function ExamTrendCard({
  exams,
  species,
}: {
  exams: ExamEntry[];
  species?: "Canino" | "Felino" | string;
}) {
  const mappedSpecies: "dog" | "cat" | undefined =
    species === "Canino" ? "dog" : species === "Felino" ? "cat" : undefined;

  const [hemogramReferences, setHemogramReferences] = useState<Record<string, HemogramReference>>({});
  useEffect(() => {
    let cancelled = false;
    fetchHemogramReferences().then((refs) => {
      if (!cancelled) setHemogramReferences(refs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trends = useMemo(
    () => buildTrends(exams, hemogramReferences, mappedSpecies),
    [exams, hemogramReferences, mappedSpecies]
  );
  const [selected, setSelected] = useState<string | undefined>(undefined);

  if (trends.length === 0) return null;

  const activeTrend = trends.find((t) => t.name === selected) || trends[0];
  const hemogramOptions = trends.filter((t) => t.category === "hemogram");
  const biochemicalOptions = trends.filter((t) => t.category === "biochemical");

  const values = activeTrend.points.map((p) => p.value);
  const bounds = [...values, activeTrend.min, activeTrend.max].filter(
    (v): v is number => typeof v === "number"
  );
  const domainMin = Math.min(...bounds);
  const domainMax = Math.max(...bounds);
  const padding = (domainMax - domainMin) * 0.15 || Math.abs(domainMax) * 0.1 || 1;
  const yDomain: [number, number] = [Math.max(0, domainMin - padding), domainMax + padding];

  const chartConfig = { value: { label: activeTrend.name, color: "#0d9488" } };

  const referenceLabel =
    activeTrend.min !== undefined && activeTrend.max !== undefined
      ? `Referência: ${activeTrend.min} - ${activeTrend.max}${activeTrend.unit ? ` ${activeTrend.unit}` : ""}`
      : activeTrend.unit;

  return (
    <Card className="vf-surface-card vf-tone-clinical card-hover rounded-md border border-border/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> Evolução dos exames
        </CardTitle>
        <Select value={activeTrend.name} onValueChange={setSelected}>
          <SelectTrigger className="w-[220px] bg-input rounded-md border-border">
            <SelectValue placeholder="Selecione um analito" />
          </SelectTrigger>
          <SelectContent>
            {hemogramOptions.length > 0 && (
              <SelectGroup>
                <SelectLabel>Hemograma</SelectLabel>
                {hemogramOptions.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {biochemicalOptions.length > 0 && (
              <SelectGroup>
                <SelectLabel>Bioquímico</SelectLabel>
                {biochemicalOptions.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        {referenceLabel && (
          <p className="mb-2 text-sm text-muted-foreground">{referenceLabel}</p>
        )}
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <LineChart data={activeTrend.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={yDomain} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {activeTrend.min !== undefined && activeTrend.max !== undefined && (
              <ReferenceArea y1={activeTrend.min} y2={activeTrend.max} fill="#0d9488" fillOpacity={0.08} strokeOpacity={0} />
            )}
            <Line
              dataKey="value"
              name={activeTrend.name}
              stroke="#0d9488"
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; key?: string }) => {
                const { cx, cy, payload, key } = props;
                if (cx === undefined || cy === undefined || !payload) return <g key={key} />;
                const outOfRange =
                  (activeTrend.min !== undefined && payload.value < activeTrend.min) ||
                  (activeTrend.max !== undefined && payload.value > activeTrend.max);
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={outOfRange ? "#dc2626" : "#0d9488"}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
