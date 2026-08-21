import React from "react";
import { Document, Page, StyleSheet, Text, View, Font, Image } from "@react-pdf/renderer";
import { mockCompanySettings } from "@/mockData/settings";
import { parseCorpoIntoSegments, type IdCard } from "@/lib/documentPdfLayout";

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
const SLATE = "#4B5563";
const BORDER = "#D8DDE2";
const LIGHT_GRAY = "#F9FAFB";
const WHITE = "#FFFFFF";
const WATERMARK_GRAY = "#9CA3AF";
const WATERMARK_RED = "#DC2626";

const styles = StyleSheet.create({
  page: {
    padding: 34,
    paddingBottom: 54,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: DARK,
    backgroundColor: WHITE,
  },

  header: { marginBottom: 4 },
  clinicName: { fontSize: 13, fontWeight: 700, color: DARK },
  clinicSub: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  vetLine: { fontSize: 7.5, color: SLATE, marginTop: 3, fontWeight: 700 },

  ruleTeal: { height: 2, backgroundColor: TEAL, marginTop: 6 },
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 10 },

  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  docTitle: { fontSize: 14, fontWeight: 700, color: TEAL, letterSpacing: 0.5 },
  docSub: { fontSize: 7.5, color: SLATE, marginTop: 2 },
  docRef: { fontSize: 8, color: SLATE, textAlign: "right" },
  docDate: { fontSize: 8, color: SLATE, marginTop: 1, textAlign: "right" },

  // Segmentos do corpo
  corpoTitulo: { fontSize: 11, fontWeight: 700, color: DARK, marginBottom: 8, letterSpacing: 0.3 },
  secao: {
    fontSize: 9,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  subtitulo: { fontSize: 9, fontWeight: 700, color: DARK, marginTop: 8, marginBottom: 3 },
  paragrafo: { fontSize: 9, color: DARK, lineHeight: 1.5, marginBottom: 5, textAlign: "justify" },
  linha: { fontSize: 9, color: DARK, lineHeight: 1.45, marginBottom: 1 },
  linhaRotulo: { fontWeight: 700 },

  idRow: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 6 },
  idCardBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 7,
    backgroundColor: LIGHT_GRAY,
  },
  // Com os dois cartões (paciente + responsável), cada um ocupa metade da
  // linha. Sozinho, não deve esticar até a borda da página — largura fixa.
  idCardDouble: { flex: 1 },
  idCardSingle: { alignSelf: "flex-start", width: 170 },
  idCardTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  idCardField: { flexDirection: "row", marginBottom: 1.5 },
  idCardLabel: { fontSize: 8, fontWeight: 700, color: SLATE, width: 68 },
  idCardValue: { fontSize: 8, color: DARK, flex: 1 },

  tabela: { marginTop: 6, marginBottom: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 3 },
  tabelaHeaderRow: { flexDirection: "row", backgroundColor: LIGHT_GRAY, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabelaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  tabelaCabecalho: {
    flex: 1,
    padding: 4,
    fontSize: 7,
    fontWeight: 700,
    color: TEAL,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  tabelaCelula: {
    flex: 1,
    padding: 4,
    fontSize: 7.5,
    color: DARK,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    minHeight: 18,
  },

  sigRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 16, marginBottom: 4 },
  sigArea: { flex: 1, maxWidth: 220, alignItems: "center" },
  sigImage: { height: 36, maxWidth: 180, marginBottom: 2 },
  sigLine: { height: 1, backgroundColor: "#9AA3AE", width: "100%", marginBottom: 4 },
  sigDate: { fontSize: 8, color: SLATE, textAlign: "center", marginBottom: 10 },
  sigName: { fontSize: 8.5, color: DARK, fontWeight: 700, textAlign: "center" },
  sigDoc: { fontSize: 7.5, color: GRAY, textAlign: "center", marginTop: 1 },
  sigRole: { fontSize: 7, color: SLATE, textAlign: "center", marginTop: 1 },

  watermark: {
    position: "absolute",
    top: "44%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 52,
    fontWeight: 700,
    letterSpacing: 4,
    opacity: 0.14,
    transform: "rotate(-32deg)",
  },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerLeft: { flexDirection: "column", maxWidth: 380 },
  footerText: { fontSize: 6.5, color: "#9CA3AF" },
  footerHash: { fontSize: 6, color: "#9CA3AF", fontFamily: "Courier" },
  qrImage: { width: 46, height: 46 },
});

function IdCardView({ card, single }: { card: IdCard; single: boolean }) {
  return (
    <View style={[styles.idCardBox, single ? styles.idCardSingle : styles.idCardDouble]} wrap={false}>
      <Text style={styles.idCardTitle}>{card.titulo}</Text>
      {card.campos.map((campo, i) => (
        <View key={i} style={styles.idCardField}>
          {campo.rotulo ? <Text style={styles.idCardLabel}>{campo.rotulo}</Text> : null}
          <Text style={styles.idCardValue}>{campo.valor || "-"}</Text>
        </View>
      ))}
    </View>
  );
}

// Linhas como "Causa básica: ......." ou "Local: valor" ganham o rótulo em
// negrito — mesma lógica visual dos cartões de identificação, sem precisar
// tratar essas linhas como um card completo.
function LinhaComRotulo({ texto }: { texto: string }) {
  const m = texto.match(/^([^:]{1,50}):\s*(.*)$/);
  if (!m) return <Text style={styles.linha}>{texto}</Text>;
  return (
    <Text style={styles.linha}>
      <Text style={styles.linhaRotulo}>{m[1]}:</Text> {m[2]}
    </Text>
  );
}

// Casa cada entrada de assinatura (extraída do texto pelo "papel", ex.:
// "Médico-Veterinário" / "Responsável pelo animal") com a imagem já
// coletada, se houver — as chaves batem com o texto literal dos partials em
// documentTemplateEngine.ts (BLOCO DE ASSINATURAS / ...DO MÉDICO-VETERINÁRIO).
function encontrarImagemAssinatura(papel: string, assinaturas?: Record<string, string>): string | undefined {
  if (!assinaturas) return undefined;
  if (papel.includes("Médico-Veterinário")) return assinaturas["veterinario"];
  if (papel.includes("Responsável pelo animal")) return assinaturas["responsavel"];
  if (papel.startsWith("Testemunha 1")) return assinaturas["testemunha1"];
  if (papel.startsWith("Testemunha 2")) return assinaturas["testemunha2"];
  return undefined;
}

function BodyFromSegments({ texto, assinaturas }: { texto: string; assinaturas?: Record<string, string> }) {
  const segmentos = parseCorpoIntoSegments(texto);
  return (
    <View wrap>
      {segmentos.map((seg, i) => {
        switch (seg.kind) {
          case "titulo":
            return (
              <Text key={i} style={styles.corpoTitulo}>
                {seg.texto}
              </Text>
            );
          case "secao":
            return (
              <Text key={i} style={styles.secao}>
                {seg.texto}
              </Text>
            );
          case "subtitulo":
            return (
              <Text key={i} style={styles.subtitulo}>
                {seg.texto}
              </Text>
            );
          case "paragrafo":
            return (
              <Text key={i} style={styles.paragrafo}>
                {seg.texto}
              </Text>
            );
          case "tabela":
            return (
              <View key={i} style={styles.tabela} wrap={false}>
                <View style={styles.tabelaHeaderRow}>
                  {seg.cabecalhos.map((c, ci) => (
                    <Text key={ci} style={styles.tabelaCabecalho}>
                      {c}
                    </Text>
                  ))}
                </View>
                {seg.linhas.map((linha, li) => (
                  <View key={li} style={styles.tabelaRow}>
                    {linha.map((celula, ci) => (
                      <Text key={ci} style={styles.tabelaCelula}>
                        {celula}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          case "identificacao": {
            const idSingle = Boolean(seg.paciente) !== Boolean(seg.responsavel);
            return (
              <View key={i} style={styles.idRow} wrap={false}>
                {seg.paciente && <IdCardView card={seg.paciente} single={idSingle} />}
                {seg.responsavel && <IdCardView card={seg.responsavel} single={idSingle} />}
              </View>
            );
          }
          case "assinaturas":
            return (
              <View key={i} style={styles.sigRow} wrap={false}>
                {seg.entradas.map((entrada, j) => {
                  const imagem = encontrarImagemAssinatura(entrada.papel, assinaturas);
                  return (
                    <View key={j} style={styles.sigArea}>
                      {imagem && <Image src={imagem} style={styles.sigImage} />}
                      <View style={styles.sigLine} />
                      <Text style={styles.sigName}>{entrada.nome}</Text>
                      {entrada.documento ? <Text style={styles.sigDoc}>{entrada.documento}</Text> : null}
                      {entrada.papel ? <Text style={styles.sigRole}>{entrada.papel}</Text> : null}
                    </View>
                  );
                })}
              </View>
            );
          case "linha":
            return <LinhaComRotulo key={i} texto={seg.texto} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

export interface DocumentTemplatePdfContentProps {
  codigo: string;
  titulo: string;
  numero: number;
  corpoRenderizado: string;
  status: "rascunho" | "emitido" | "assinado" | "cancelado";
  /** Qual via está sendo impressa — controla a marca d'água quando o documento não está cancelado. */
  via?: "responsavel" | "clinica";
  emitidoEm: Date;
  hash: string;
  /** Data URI (PNG) já gerada — ver src/lib/qrCode.ts. */
  qrDataUrl?: string;
  vetNome?: string;
  vetCrmv?: string;
  /** Imagens de assinatura já coletadas, por papel: veterinario/responsavel/testemunha1/testemunha2. */
  assinaturas?: Record<string, string>;
}

export default function DocumentTemplatePdfContent({
  codigo,
  titulo,
  numero,
  corpoRenderizado,
  status,
  via,
  assinaturas,
  emitidoEm,
  hash,
  qrDataUrl,
  vetNome,
  vetCrmv,
}: DocumentTemplatePdfContentProps) {
  const company = mockCompanySettings;
  const dataEmissao = emitidoEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const watermarkText =
    status === "cancelado" ? "CANCELADO" : via === "clinica" ? "VIA DA CLÍNICA" : via === "responsavel" ? "VIA DO RESPONSÁVEL" : null;
  const watermarkColor = status === "cancelado" ? WATERMARK_RED : WATERMARK_GRAY;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {watermarkText && (
          <Text style={[styles.watermark, { color: watermarkColor }]} fixed>
            {watermarkText}
          </Text>
        )}

        <View style={styles.header} fixed>
          <Text style={styles.clinicName}>{company.razaoSocial || company.companyName}</Text>
          <Text style={styles.clinicSub}>
            {company.cnpj ? `CNPJ ${company.cnpj} · ` : ""}CRMV {company.crmv}
          </Text>
          <Text style={styles.clinicSub}>
            {company.address} · {company.city} · CEP {company.zipCode} · Tel.: {company.phone} · {company.email}
          </Text>
          {vetNome && (
            <Text style={styles.vetLine}>
              Médico-Veterinário Responsável: {vetNome}
              {vetCrmv ? ` — CRMV ${vetCrmv}` : ""}
            </Text>
          )}
        </View>
        <View style={styles.ruleTeal} fixed />
        <View style={styles.ruleLight} fixed />

        <View style={styles.docMeta}>
          <View>
            <Text style={styles.docTitle}>{titulo.toUpperCase()}</Text>
            <Text style={styles.docSub}>Modelo {codigo} · Status: {status}</Text>
          </View>
          <View>
            <Text style={styles.docRef}>Documento nº {numero}</Text>
            <Text style={styles.docDate}>{dataEmissao}</Text>
          </View>
        </View>

        <BodyFromSegments texto={corpoRenderizado} assinaturas={assinaturas} />

        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              {company.razaoSocial || company.companyName} — Documento nº {numero} ({codigo})
            </Text>
            <Text style={styles.footerHash}>Hash: {hash}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
            {qrDataUrl && <Image src={qrDataUrl} style={styles.qrImage} />}
          </View>
        </View>
      </Page>
    </Document>
  );
}
