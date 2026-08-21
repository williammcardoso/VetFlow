import React from "react";
import { Document, Page, StyleSheet, Text, View, Image, Font } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const TEAL = "#0F766E";
const DARK = "#111827";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F9FAFB";
const WHITE = "#FFFFFF";
const BORDER = "#D8DDE2";
const SLATE = "#4B5563";

const formatDateBR = (iso?: string) => {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const styles = StyleSheet.create({
  page: {
    padding: 34,
    paddingBottom: 44,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: DARK,
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  clinicName: { fontSize: 15, fontWeight: 700, color: DARK },
  clinicSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  contactText: { fontSize: 7.5, color: GRAY, marginTop: 1, textAlign: "right" },

  ruleTeal: { height: 2, backgroundColor: TEAL, marginTop: 6 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 12 },

  docTitle: { fontSize: 15, fontWeight: 700, color: TEAL, letterSpacing: 0.8, marginBottom: 10 },

  // Faixa de destaque: laboratório e data da coleta, os 2 dados mais
  // importantes para quem vai executar a coleta e enviar ao laboratório.
  highlightRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 5,
    backgroundColor: "#ECFDF5",
    marginBottom: 10,
    overflow: "hidden",
  },
  highlightCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  highlightDivider: { width: 1, backgroundColor: "#A7D9CE" },
  highlightLabel: { fontSize: 7, color: TEAL, fontWeight: 700, letterSpacing: 0.6, marginBottom: 2 },
  highlightValue: { fontSize: 13, color: DARK, fontWeight: 700 },

  metaLine: { fontSize: 8, color: SLATE, marginBottom: 10 },

  // Tutor / Paciente sem caixas — só rótulo pequeno + valor, separados por
  // uma linha fina (evita a sensação de "quadrados empilhados").
  peopleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  peopleCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 8,
    backgroundColor: LIGHT_GRAY,
  },
  peopleTitle: {
    fontSize: 7.5,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  peopleName: { fontSize: 10.5, fontWeight: 700, color: DARK, marginBottom: 2 },
  peopleDetail: { fontSize: 8.3, color: SLATE, lineHeight: 1.4 },

  sectionCard: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 9,
    backgroundColor: WHITE,
  },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 3,
  },
  bodyText: { fontSize: 9, color: DARK, lineHeight: 1.35 },

  // Checklist de exames: sem borda por item, só um marcador colorido + texto,
  // em colunas — visual de formulário/checklist, não de "chips".
  examGrid: { flexDirection: "row", flexWrap: "wrap" },
  examItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "33.33%",
    paddingVertical: 2.5,
  },
  examCheck: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    backgroundColor: TEAL,
  },
  examLabel: { fontSize: 8.5, color: DARK },

  sigRow: { flexDirection: "row", justifyContent: "center", marginTop: 26 },
  sigArea: { flex: 1, maxWidth: 240, alignItems: "center" },
  sigImage: { height: 42, marginBottom: 4, objectFit: "contain" },
  sigLine: { height: 1, backgroundColor: "#9AA3AE", width: "100%", marginTop: 22, marginBottom: 4 },
  sigName: { fontSize: 8.5, color: DARK, fontWeight: 700, textAlign: "center" },
  sigSub: { fontSize: 7, color: GRAY, textAlign: "center", marginTop: 1 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 6.5, color: "#9CA3AF" },
});

export interface ExamRequestPdfData {
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  animalName: string;
  animalCode?: string;
  animalSpecies?: string;
  animalBreed?: string;
  animalGender?: string;
  animalAge?: string;
  animalWeight?: string;
  animalCoatColor?: string;
  animalMicrochip?: string;
  laboratorio: string;
  vetSolicitante: string;
  crmv?: string;
  dataColeta: string;
  horarioColeta?: string;
  suspeita?: string;
  observacoes?: string;
  exames: string[];
  signatureUrl?: string;
  useDigitalSignature: boolean;
}

export default function ExamRequestPdfContent({ data }: { data: ExamRequestPdfData }) {
  const company = mockCompanySettings;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const animalDetails = [
    [data.animalSpecies, data.animalBreed].filter(Boolean).join(" · "),
    [data.animalGender, data.animalAge].filter(Boolean).join(" · "),
    [data.animalWeight, data.animalCoatColor].filter(Boolean).join(" · "),
    data.animalMicrochip ? `Microchip: ${data.animalMicrochip}` : "",
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.clinicName}>{company.companyName}</Text>
            <Text style={styles.clinicSub}>
              CRMV {company.crmv}  ·  MAPA {company.mapaRegistration}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.contactText}>{company.phone}  ·  {company.email}</Text>
            <Text style={styles.contactText}>{company.address}  ·  {company.city}  ·  CEP {company.zipCode}</Text>
          </View>
        </View>
        <View style={styles.ruleTeal} fixed />
        <View style={styles.ruleLight} fixed />

        <Text style={styles.docTitle}>PEDIDO DE EXAMES LABORATORIAIS</Text>

        <View style={styles.highlightRow}>
          <View style={styles.highlightCell}>
            <Text style={styles.highlightLabel}>LABORATÓRIO</Text>
            <Text style={styles.highlightValue}>{data.laboratorio}</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightCell}>
            <Text style={styles.highlightLabel}>DATA / HORÁRIO DA COLETA</Text>
            <Text style={styles.highlightValue}>
              {formatDateBR(data.dataColeta)}{data.horarioColeta ? `  ${data.horarioColeta}` : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.metaLine}>Emitido em {today}</Text>

        <View style={styles.peopleRow}>
          <View style={styles.peopleCol}>
            <Text style={styles.peopleTitle}>TUTOR</Text>
            <Text style={styles.peopleName}>{data.clientName || "Não informado"}</Text>
            {data.clientPhone && <Text style={styles.peopleDetail}>Tel.: {data.clientPhone}</Text>}
            {data.clientAddress && <Text style={styles.peopleDetail}>{data.clientAddress}</Text>}
          </View>
          <View style={styles.peopleCol}>
            <Text style={styles.peopleTitle}>PACIENTE</Text>
            <Text style={styles.peopleName}>
              {data.animalName || "Não informado"}{data.animalCode ? `  ·  #${data.animalCode}` : ""}
            </Text>
            {animalDetails.map((line, i) => (
              <Text key={i} style={styles.peopleDetail}>{line}</Text>
            ))}
          </View>
          <View style={styles.peopleCol}>
            <Text style={styles.peopleTitle}>VETERINÁRIO SOLICITANTE</Text>
            <Text style={styles.peopleName}>{data.vetSolicitante}</Text>
            {data.crmv && <Text style={styles.peopleDetail}>CRMV {data.crmv}</Text>}
          </View>
        </View>

        {data.suspeita && (
          <View style={styles.sectionCard} wrap>
            <Text style={styles.sectionLabel}>SUSPEITA CLÍNICA / MOTIVO</Text>
            <Text style={styles.bodyText}>{data.suspeita}</Text>
          </View>
        )}

        <View style={styles.sectionCard} wrap>
          <Text style={styles.sectionLabel}>EXAMES SOLICITADOS ({data.exames.length})</Text>
          <View style={styles.examGrid}>
            {data.exames.map((exame, i) => (
              <View key={`${exame}-${i}`} style={styles.examItem} wrap={false}>
                <View style={styles.examCheck} />
                <Text style={styles.examLabel}>{exame}</Text>
              </View>
            ))}
          </View>
        </View>

        {data.observacoes && (
          <View style={styles.sectionCard} wrap>
            <Text style={styles.sectionLabel}>OBSERVAÇÕES</Text>
            <Text style={styles.bodyText}>{data.observacoes}</Text>
          </View>
        )}

        <View style={styles.sigRow}>
          <View style={styles.sigArea}>
            {data.useDigitalSignature && data.signatureUrl ? (
              <Image src={data.signatureUrl} style={styles.sigImage} />
            ) : (
              <View style={styles.sigLine} />
            )}
            <Text style={styles.sigName}>{data.vetSolicitante}</Text>
            <Text style={styles.sigSub}>{data.crmv ? `CRMV ${data.crmv} · ` : ""}Veterinário(a) Solicitante</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.companyName} — Documento gerado pelo sistema</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>
      </Page>
    </Document>
  );
}
