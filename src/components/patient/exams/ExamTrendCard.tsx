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
import { ChevronDown, FileText, Loader2, TrendingUp } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExamEntry, HemogramReference } from "@/types/exam";
import { buildTrends, orderTrendsForReport, type AnalyteTrend, type TrendPoint } from "@/lib/examTrends";
import { fetchHemogramReferences } from "@/constants/examReferences";

export { buildTrends } from "@/lib/examTrends";

export type TrendExportMode = "whatsapp" | "open";

export default function ExamTrendCard({
  exams,
  species,
  onExport,
}: {
  exams: ExamEntry[];
  species?: "Canino" | "Felino" | string;
  /** Gera o PDF de evolução (um analito ou todos) — mandar ao tutor ou abrir. */
  onExport?: (trends: AnalyteTrend[], mode: TrendExportMode) => Promise<void>;
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
  const [exporting, setExporting] = useState(false);

  if (trends.length === 0) return null;

  const activeTrend = trends.find((t) => t.name === selected) || trends[0];
  const hemogramOptions = trends.filter((t) => t.category === "hemogram");
  const biochemicalOptions = trends.filter((t) => t.category === "biochemical");

  const runExport = async (list: AnalyteTrend[], mode: TrendExportMode) => {
    if (!onExport || exporting) return;
    setExporting(true);
    try {
      await onExport(orderTrendsForReport(list), mode);
    } finally {
      setExporting(false);
    }
  };

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
      {/* Celular: seletor embaixo do título, largura total (220px fixos ao
          lado do título passavam da tela). */}
      <CardHeader className="flex flex-col gap-3 space-y-0 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" /> Evolução dos exames
        </CardTitle>
        <div className="flex w-full items-center gap-2 sm:w-auto">
        <Select value={activeTrend.name} onValueChange={setSelected}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-[220px] sm:flex-none bg-input rounded-md border-border">
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
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="shrink-0 gap-1.5" disabled={exporting} aria-label="Enviar evolução em PDF">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SiWhatsapp className="h-4 w-4 text-[#25D366]" aria-hidden />}
                <span className="hidden sm:inline">Enviar evolução</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PDF para o tutor (WhatsApp)
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void runExport([activeTrend], "whatsapp")} className="gap-2">
                <SiWhatsapp className="h-4 w-4 text-[#25D366]" aria-hidden />
                <span className="min-w-0 truncate">Só {activeTrend.name}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void runExport(trends, "whatsapp")} className="gap-2">
                <SiWhatsapp className="h-4 w-4 text-[#25D366]" aria-hidden />
                <span>Todos os exames ({trends.length}) em 1 PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Só abrir o PDF</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void runExport([activeTrend], "open")} className="gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 truncate">Só {activeTrend.name}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void runExport(trends, "open")} className="gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>Todos os exames ({trends.length})</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
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
