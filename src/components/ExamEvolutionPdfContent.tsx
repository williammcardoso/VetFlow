/* PDF de evolução dos exames — um gráfico por analito (faixa de referência,
   pontos fora da faixa em vermelho) e a tabela de valores por data. Vai para
   o tutor pelo WhatsApp (card "Evolução dos exames" do prontuário). Mesmo
   cabeçalho/marca d'água dos laudos compactos; arquivo auto-contido, na
   mesma convenção dos outros PDFs de exame. */
import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, Image, Svg, Rect, Line, Polyline, Circle } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { formatTrendNumber, niceScale, trendStatus, trendSummary, type AnalyteTrend } from "@/lib/examTrends";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

const WATERMARK_PET_STYLE = { position: "absolute" as const, left: 97.6, top: 276.6, width: 400, opacity: 0.16 };
const TEAL = "#0F766E";
const LOW_RED = "#DC2626";
const HIGH_BLUE = "#2563EB";
const GRID = "#E5E7EB";

// Área útil da A4 com padding 30 = 535pt, menos o padding (8) e a borda do cartão.
const CHART_W = 517;
const CHART_H = 112;
const PAD = { left: 46, right: 8, top: 14, bottom: 18 };
// Recuo dos pontos dentro da área do gráfico: o primeiro não encosta nos
// números do eixo e a última data não é cortada na borda.
const INSET = 26;

const styles = StyleSheet.create({
  page: { padding: 30, paddingBottom: 40, fontFamily: "Inter", fontSize: 9, color: "#333", lineHeight: 1.15 },
  clinicHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3, paddingBottom: 3 },
  clinicName: { fontSize: 12, fontWeight: "bold" },
  clinicDetails: { fontSize: 7.2, color: "#666" },
  clinicAddressPhone: { textAlign: "right", fontSize: 7.2, color: "#666" },
  ruleTeal: { height: 1.4, backgroundColor: TEAL, marginBottom: 6 },
  mainTitle: { fontSize: 13, textAlign: "center", fontWeight: "bold", marginTop: 2, marginBottom: 8, color: TEAL },
  patientBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 0.6,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
  },
  patientItem: { width: "33.3%", flexDirection: "row", marginBottom: 2 },
  patientLabel: { fontWeight: "bold", marginRight: 3 },
  intro: { fontSize: 8.5, color: "#444", marginBottom: 8 },
  card: { borderWidth: 0.6, borderColor: "#D1D5DB", borderRadius: 4, padding: 8, marginBottom: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 2 },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: TEAL },
  cardCategory: { fontSize: 7, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 },
  cardRef: { fontSize: 8, color: "#555" },
  summary: { fontSize: 8.3, color: "#374151", marginTop: 3, marginBottom: 4 },
  valuesRow: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 0.5, borderTopColor: GRID, paddingTop: 4 },
  valueCell: { width: "12.5%", paddingRight: 4, marginBottom: 3 },
  valueDate: { fontSize: 7, color: "#6B7280" },
  valueNum: { fontSize: 8.6, fontWeight: "bold" },
  legend: { fontSize: 7.4, color: "#6B7280", marginTop: 2 },
  footer: { position: "absolute", bottom: 16, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#9CA3AF" },
});

const statusColor = (s: ReturnType<typeof trendStatus>) => (s === "high" ? HIGH_BLUE : s === "low" ? LOW_RED : s === "normal" ? TEAL : "#374151");
const statusArrow = (s: ReturnType<typeof trendStatus>) => (s === "high" ? " ↑" : s === "low" ? " ↓" : "");

function TrendChart({ trend }: { trend: AnalyteTrend }) {
  const values = trend.points.map((p) => p.value);
  const bounds = [...values, trend.min, trend.max].filter((v): v is number => typeof v === "number");
  const lo = Math.min(...bounds);
  const hi = Math.max(...bounds);
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
  const scale = niceScale(Math.max(0, lo - pad), hi + pad);
  const yMin = scale.min;
  const yMax = scale.max;
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const n = trend.points.length;
  const innerW = plotW - INSET * 2;
  const x = (i: number) => PAD.left + INSET + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const ticks = scale.ticks;
  // Muitas datas: mostra uma sim, outra não (não embola o eixo).
  const labelEvery = n > 10 ? 3 : n > 6 ? 2 : 1;
  const hasRef = trend.min !== undefined && trend.max !== undefined;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {hasRef && (
        <Rect
          x={PAD.left}
          y={y(trend.max!)}
          width={plotW}
          height={Math.max(0.5, y(trend.min!) - y(trend.max!))}
          fill={TEAL}
          fillOpacity={0.1}
        />
      )}
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <Line x1={PAD.left} y1={y(t)} x2={PAD.left + plotW} y2={y(t)} stroke={GRID} strokeWidth={0.5} />
          <Text x={PAD.left - 4} y={y(t) + 2.5} style={{ fontSize: 6.5, fill: "#6B7280" }} textAnchor="end">
            {formatTrendNumber(t)}
          </Text>
        </React.Fragment>
      ))}
      {hasRef && (
        <>
          <Line x1={PAD.left} y1={y(trend.max!)} x2={PAD.left + plotW} y2={y(trend.max!)} stroke={TEAL} strokeWidth={0.6} strokeDasharray="3,2" />
          <Line x1={PAD.left} y1={y(trend.min!)} x2={PAD.left + plotW} y2={y(trend.min!)} stroke={TEAL} strokeWidth={0.6} strokeDasharray="3,2" />
        </>
      )}
      <Polyline points={trend.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} stroke={TEAL} strokeWidth={1.6} fill="none" />
      {trend.points.map((p, i) => {
        const s = trendStatus(p.value, trend);
        return (
          <React.Fragment key={`${p.date}-${i}`}>
            <Circle cx={x(i)} cy={y(p.value)} r={3} fill={statusColor(s === "unknown" ? "normal" : s)} stroke="#FFFFFF" strokeWidth={0.8} />
            <Text x={x(i)} y={y(p.value) - 5} style={{ fontSize: 6.8, fill: statusColor(s), fontWeight: "bold" }} textAnchor="middle">
              {formatTrendNumber(p.value)}
            </Text>
            {i % labelEvery === 0 || i === n - 1 ? (
              <Text x={x(i)} y={CHART_H - 6} style={{ fontSize: 6.5, fill: "#6B7280" }} textAnchor="middle">
                {p.dateLabel}
              </Text>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export interface ExamEvolutionPdfData {
  animalName: string;
  displayId?: string;
  animalSpecies?: string;
  animalBreed?: string;
  tutorName?: string;
  trends: AnalyteTrend[];
}

export const ExamEvolutionPdfContent = ({ animalName, displayId, animalSpecies, animalBreed, tutorName, trends }: ExamEvolutionPdfData) => {
  const single = trends.length === 1;
  const today = new Date().toLocaleDateString("pt-BR");
  return (
    <Document title={single ? `Evolução — ${trends[0]?.name} — ${animalName}` : `Evolução dos exames — ${animalName}`}>
      <Page size="A4" style={styles.page} wrap>
        <Image src="/watermark-pet.png" style={WATERMARK_PET_STYLE} fixed />
        <View style={styles.clinicHeader} fixed>
          <View>
            <Text style={styles.clinicName}>{mockCompanySettings.companyName}</Text>
            <Text style={styles.clinicDetails}>CRMV {mockCompanySettings.crmv}</Text>
            <Text style={styles.clinicDetails}>Registro no MAPA {mockCompanySettings.mapaRegistration}</Text>
          </View>
          <View style={styles.clinicAddressPhone}>
            <Text>{mockCompanySettings.address}</Text>
            <Text>
              {mockCompanySettings.city} - CEP: {mockCompanySettings.zipCode}
            </Text>
            <Text>Telefone: {mockCompanySettings.phone}</Text>
          </View>
        </View>
        <View style={styles.ruleTeal} fixed />

        <Text style={styles.mainTitle}>{single ? `EVOLUÇÃO — ${trends[0].name.toUpperCase()}` : "EVOLUÇÃO DOS EXAMES"}</Text>

        <View style={styles.patientBox}>
          <View style={styles.patientItem}>
            <Text style={styles.patientLabel}>Paciente:</Text>
            <Text>{animalName}</Text>
          </View>
          <View style={styles.patientItem}>
            <Text style={styles.patientLabel}>ID:</Text>
            <Text>{displayId || "-"}</Text>
          </View>
          <View style={styles.patientItem}>
            <Text style={styles.patientLabel}>Espécie:</Text>
            <Text>{animalSpecies || "-"}</Text>
          </View>
          <View style={styles.patientItem}>
            <Text style={styles.patientLabel}>Raça:</Text>
            <Text>{animalBreed || "-"}</Text>
          </View>
          <View style={[styles.patientItem, { width: "66.6%" }]}>
            <Text style={styles.patientLabel}>Tutor:</Text>
            <Text>{tutorName || "-"}</Text>
          </View>
        </View>

        <Text style={styles.intro}>
          Como os resultados de {animalName} mudaram ao longo do tempo. A faixa verde é o valor de referência para a espécie; pontos em
          azul estão acima e em vermelho abaixo da referência (mesmo padrão dos laudos).
        </Text>

        {trends.map((trend) => {
          const ref =
            trend.min !== undefined && trend.max !== undefined
              ? `Referência: ${formatTrendNumber(trend.min)} – ${formatTrendNumber(trend.max)}${trend.unit ? ` ${trend.unit}` : ""}`
              : trend.unit
                ? `Unidade: ${trend.unit}`
                : "";
          return (
            <View key={trend.name} style={styles.card} wrap={false}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.cardCategory}>{trend.category === "hemogram" ? "Hemograma" : trend.category === "biochemical" ? "Bioquímico" : trend.group || "Outros exames"}</Text>
                  <Text style={styles.cardTitle}>{trend.name}</Text>
                </View>
                <Text style={styles.cardRef}>{ref}</Text>
              </View>
              <Text style={styles.summary}>{trendSummary(trend)}</Text>
              <TrendChart trend={trend} />
              <View style={styles.valuesRow}>
                {trend.points.map((p, i) => {
                  const s = trendStatus(p.value, trend);
                  return (
                    <View key={`${p.date}-${i}`} style={styles.valueCell}>
                      <Text style={styles.valueDate}>{p.dateLabel}</Text>
                      <Text style={[styles.valueNum, { color: statusColor(s) }]}>
                        {formatTrendNumber(p.value)}
                        {statusArrow(s)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>
            {mockCompanySettings.companyName} · Gerado em {today}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default ExamEvolutionPdfContent;
