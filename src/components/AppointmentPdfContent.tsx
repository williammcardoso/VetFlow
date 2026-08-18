import React from "react";
import { Document, Page, StyleSheet, Text, View, Font } from "@react-pdf/renderer";
import { mockCompanySettings, mockUserSettings } from "@/mockData/settings";
import type {
  AppointmentEntry,
  ConsultationDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
} from "@/types/appointment";

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
const AMBER = "#B45309";
const BORDER = "#E5E7EB";
const SLATE = "#64748B";

const formatDateBR = (iso?: string) => {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

const TYPE_LABELS: Record<string, string> = {
  Consulta: "Consulta Clínica",
  "Consulta (Modelo Antigo)": "Consulta Clínica",
  Cirurgia: "Cirurgia",
  Vacina: "Vacinação",
  Retorno: "Retorno",
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
  ruleLight: { height: 1, backgroundColor: BORDER, marginTop: 2, marginBottom: 9 },

  docMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  docTitle: { fontSize: 16, fontWeight: 700, color: TEAL, letterSpacing: 0.8 },
  docType: { fontSize: 8, color: SLATE, marginTop: 2 },
  docRef: { fontSize: 8, color: SLATE, textAlign: "right" },
  docDate: { fontSize: 8, color: SLATE, marginTop: 1, textAlign: "right" },

  infoRow: { flexDirection: "row", gap: 8, marginBottom: 7 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 6,
    backgroundColor: LIGHT_GRAY,
  },
  infoLabel: { fontSize: 6.5, color: SLATE, fontWeight: 700, letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 9.5, color: DARK, fontWeight: 700 },
  infoSub: { fontSize: 7.5, color: GRAY, marginTop: 1 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: TEAL,
  },
  statusBadgeText: { fontSize: 7.5, fontWeight: 700, color: WHITE },
  statusSep: { width: 1, height: 10, backgroundColor: BORDER, marginHorizontal: 1 },
  statusInfo: { fontSize: 7.5, color: SLATE },

  sectionCard: {
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 5,
    padding: 8,
    backgroundColor: WHITE,
  },
  sectionLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 3,
  },
  subLabel: { fontSize: 7.5, fontWeight: 700, color: DARK, marginBottom: 3, marginTop: 1 },

  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 4 },
  statBox: {
    minWidth: 82,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: LIGHT_GRAY,
  },
  statLabel: { fontSize: 6.5, color: SLATE, fontWeight: 700, letterSpacing: 0.2, marginBottom: 1 },
  statValue: { fontSize: 10.5, fontWeight: 700, color: TEAL },

  textField: { marginBottom: 4 },
  textFieldLabel: { fontSize: 6.5, color: SLATE, fontWeight: 700, letterSpacing: 0.3, marginBottom: 1 },
  textFieldValue: { fontSize: 9, color: DARK, lineHeight: 1.3 },

  highlightBox: {
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
  },
  highlightLabel: { fontSize: 6.5, color: AMBER, fontWeight: 700, marginBottom: 1, letterSpacing: 0.2 },
  highlightValue: { fontSize: 9, color: "#78350F", lineHeight: 1.3 },

  suturaCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 5,
    marginBottom: 4,
    backgroundColor: LIGHT_GRAY,
  },
  suturaTitle: { fontSize: 8.5, fontWeight: 700, color: DARK, marginBottom: 2 },
  suturaMeta: { fontSize: 7.5, color: SLATE },

  obsBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
    backgroundColor: LIGHT_GRAY,
  },
  obsLabel: { fontSize: 6.5, fontWeight: 700, color: SLATE, marginBottom: 2 },
  obsText: { fontSize: 8, color: GRAY },

  mono: { fontFamily: "Courier", fontSize: 7.5, color: DARK, lineHeight: 1.3 },

  sigRow: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  sigArea: { flex: 1, maxWidth: 240, alignItems: "center" },
  sigLine: { height: 1, backgroundColor: "#CBD5E1", width: "100%", marginTop: 22, marginBottom: 4 },
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

const toDisplay = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
};

const StatBox = ({ label, value, unit }: { label: string; value?: number | string; unit?: string }) => {
  const text = toDisplay(value);
  if (text === null) return null;
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{text}{unit ? ` ${unit}` : ""}</Text>
    </View>
  );
};

const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const filtered = React.Children.toArray(children).filter(Boolean);
  if (filtered.length === 0) return null;
  return <View style={styles.statRow}>{filtered}</View>;
};

const TextField = ({ label, value }: { label: string; value: unknown }) => {
  const text = toDisplay(value);
  if (text === null) return null;
  const lines = text.split("\n");
  return (
    <View style={styles.textField} wrap>
      <Text style={styles.textFieldLabel}>{label.toUpperCase()}</Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.textFieldValue}>{line.trim() === "" ? " " : line}</Text>
      ))}
    </View>
  );
};

const HighlightField = ({ label, value }: { label: string; value: unknown }) => {
  const text = toDisplay(value);
  if (text === null) return null;
  return (
    <View style={styles.highlightBox} wrap>
      <Text style={styles.highlightLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.highlightValue}>{text}</Text>
    </View>
  );
};

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.sectionCard} wrap>
    <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
    {children}
  </View>
);

export default function AppointmentPdfContent({
  appointment,
  clinicName,
  clientName,
  animalName,
  animalSpecies,
}: {
  appointment: AppointmentEntry;
  clinicName?: string;
  clientName: string;
  animalName: string;
  animalSpecies?: string;
}) {
  const company = mockCompanySettings;
  const user = mockUserSettings;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const renderType = () => {
    if (appointment.type === "Consulta" || appointment.type === "Consulta (Modelo Antigo)") {
      const d = appointment.details as ConsultationDetails;
      const isOld = appointment.type === "Consulta (Modelo Antigo)";
      const vacStatus = d.vacinacaoEmDia || d.vacinacaoPaciente;
      const mucosas = (d as any).mucosasResumo || (d as any).mucosas;

      const showComplete =
        !isOld &&
        !!(
          d.sec_digestorio_status || d.sec_digestorio_obs ||
          d.sec_respiratorio_status || d.sec_respiratorio_obs ||
          d.sec_cabeca_pescoco_status || d.sec_cabeca_pescoco_obs ||
          d.sec_torax_abdomen_status || d.sec_torax_abdomen_obs ||
          d.sec_linfonodos_pele_status || d.sec_linfonodos_pele_obs ||
          d.observacoesComplementares
        );

      return (
        <>
          <SectionCard title="Queixa e Anamnese">
            <TextField label="Queixa principal" value={d.queixaPrincipal} />
            <TextField label="História / evolução" value={d.historicoClinico} />
            <StatRow>
              {toDisplay(vacStatus) && <StatBox label="Vacinação" value={vacStatus} />}
              {!isOld && <StatBox label="Uso de medicação" value={d.usoMedicacao} />}
              {!isOld && <StatBox label="Alergias" value={d.alergiasPaciente} />}
            </StatRow>
            {!isOld && <TextField label="Obs. vacinação" value={(d as any).vacinacaoEmDiaObs} />}
            {d.usoMedicacao === "sim" && <TextField label="Medicação (quais)" value={d.usoMedicacaoQuais} />}
            {d.alergiasPaciente === "sim" && (
              <HighlightField label="⚠ Alergias — descrição" value={d.alergiasPacienteObs} />
            )}
          </SectionCard>

          <SectionCard title="Sinais Vitais e Avaliação">
            <StatRow>
              <StatBox label="Peso" value={appointment.pesoAtual} unit="kg" />
              <StatBox label="Temperatura" value={appointment.temperaturaCorporal} unit="°C" />
              {!isOld && <StatBox label="FC" value={appointment.frequenciaCardiaca} unit="bpm" />}
              {!isOld && <StatBox label="FR" value={appointment.frequenciaRespiratoria} unit="mpm" />}
            </StatRow>
            {!isOld && (
              <StatRow>
                <StatBox label="Estado geral" value={d.estadoGeral} />
                <StatBox label="Mucosas" value={mucosas} />
                <StatBox label="Hidratação" value={d.hidratacao} />
                <StatBox label="Dor" value={d.dor === "escala" ? `${d.dorEscala ?? 0}/10` : d.dor} />
              </StatRow>
            )}
            <TextField label="Observações do exame físico" value={d.exameFisicoObs} />
          </SectionCard>

          <SectionCard title="Diagnóstico e Conduta">
            <TextField label="Suspeita diagnóstica" value={d.suspeitaDiagnostica} />
            <TextField label="Diagnóstico presuntivo" value={d.diagnosticoPresuntivo} />
            <TextField label="Diagnóstico definitivo" value={d.diagnosticoDefinitivo} />
            <TextField label="Diagnósticos diferenciais" value={d.diagnosticoDiferencial} />
            <TextField label="Exames solicitados" value={d.examesSolicitados} />
            <TextField label="Conduta / tratamento" value={d.condutaTratamento} />
            <StatRow>
              <StatBox label="Próximo acompanhamento" value={d.retornoRecomendadoEmDias} unit="dias" />
            </StatRow>
            <TextField label="Próximos passos" value={d.proximosPassos} />

            {showComplete && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.subLabel}>Exame clínico completo</Text>
                <TextField label="Sistema digestório" value={d.sec_digestorio_status} />
                <TextField label="Obs. digestório" value={d.sec_digestorio_obs} />
                <TextField label="Sistema respiratório" value={d.sec_respiratorio_status} />
                <TextField label="Obs. respiratório" value={d.sec_respiratorio_obs} />
                <TextField label="Cabeça e pescoço" value={d.sec_cabeca_pescoco_status} />
                <TextField label="Obs. cabeça e pescoço" value={d.sec_cabeca_pescoco_obs} />
                <TextField label="Tórax e abdômen" value={d.sec_torax_abdomen_status} />
                <TextField label="Obs. tórax e abdômen" value={d.sec_torax_abdomen_obs} />
                <TextField label="Linfonodos e pele" value={d.sec_linfonodos_pele_status} />
                <TextField label="Obs. linfonodos e pele" value={d.sec_linfonodos_pele_obs} />
                <TextField label="Observações complementares" value={d.observacoesComplementares} />
              </View>
            )}
          </SectionCard>
        </>
      );
    }

    if (appointment.type === "Cirurgia") {
      const d = appointment.details as SurgeryDetails;
      return (
        <>
          <SectionCard title="Dados Básicos">
            <StatRow>
              <StatBox label="Início" value={d.horaInicio} />
              <StatBox label="Término" value={d.horaTermino} />
              <StatBox label="Anestesista" value={d.anestesista} />
              <StatBox label="Instrumentador" value={d.instrumentador} />
            </StatRow>
          </SectionCard>

          <SectionCard title="Avaliação Pré-operatória">
            <StatRow>
              <StatBox label="Peso" value={appointment.pesoAtual} unit="kg" />
              <StatBox label="Temperatura" value={appointment.temperaturaCorporal} unit="°C" />
              <StatBox label="FC" value={appointment.frequenciaCardiaca} unit="bpm" />
              <StatBox label="FR" value={appointment.frequenciaRespiratoria} unit="mpm" />
            </StatRow>
            <StatRow>
              <StatBox label="Mucosas" value={d.mucosas} />
              <StatBox label="TPC" value={d.tpcSeg} unit="s" />
              <StatBox label="Jejum adequado" value={d.jejumAdequado} />
              <StatBox label="Estado geral" value={d.estadoGeral} />
            </StatRow>
            <TextField label="Exames pré-op avaliados" value={d.examesPreOperatoriosAvaliados} />
            <TextField label="Observações pré-operatórias" value={d.observacoesPreOperatorias} />
          </SectionCard>

          <SectionCard title="Procedimento">
            <TextField label="Procedimento realizado" value={d.procedimentoRealizado} />
            <TextField label="Diagnóstico" value={d.diagnostico} />
            <TextField label="Técnica cirúrgica" value={d.tecnicaCirurgica} />
            <TextField label="Protocolo anestésico" value={d.protocoloAnestesico} />
            {d.intercorrenciaIntraOperatoria ? (
              <HighlightField label="⚠ Intercorrência intraoperatória" value={d.intercorrenciaDescricao || "Sim"} />
            ) : (
              <StatRow><StatBox label="Intercorrências" value={d.intercorrenciaIntraOperatoria} /></StatRow>
            )}
          </SectionCard>

          {d.suturas && d.suturas.length > 0 && (
            <SectionCard title="Materiais e Suturas">
              {d.suturas.map((s) => (
                <View key={s.id} style={styles.suturaCard} wrap={false}>
                  <Text style={styles.suturaTitle}>{s.tipo}{s.calibre ? ` · ${s.calibre}` : ""}</Text>
                  <Text style={styles.suturaMeta}>
                    {[s.plano, s.padrao, s.quantidade ? `Qtd: ${s.quantidade}` : undefined, s.usoLocal]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </Text>
                </View>
              ))}
            </SectionCard>
          )}

          <SectionCard title="Pós-operatório e Alta">
            <StatRow>
              <StatBox label="Condição ao final" value={d.condicaoFinal} />
            </StatRow>
            <TextField label="Prescrição (resumo)" value={d.prescricaoPosOperatoria} />
            <TextField label="Orientações ao tutor" value={d.orientacoesTutor} />
            {d.complicacoesImediatas ? (
              <HighlightField label="⚠ Complicações imediatas" value={d.complicacoesImediatas} />
            ) : null}
            <TextField label="Observações pós-operatórias" value={d.observacoesPosOperatorias} />
          </SectionCard>
        </>
      );
    }

    if (appointment.type === "Vacina") {
      const d = appointment.details as VaccinationDetails;
      return (
        <SectionCard title="Vacinação">
          <StatRow>
            <StatBox label="Vacina" value={d.tipoVacina} />
            <StatBox label="Dose" value={d.dose} />
            <StatBox label="Local" value={d.localAplicacao} />
            <StatBox label="Via" value={d.viaAdministracao} />
          </StatRow>
          <StatRow>
            <StatBox label="Nome comercial" value={d.nomeComercial} />
            <StatBox label="Lote" value={d.lote} />
            <StatBox label="Fabricante" value={d.fabricante} />
            <StatBox label="Dose aplicada" value={d.doseAplicada} unit="mL" />
          </StatRow>
          <StatRow>
            <StatBox label="Fabricação" value={formatDateBR(d.dataFabricacao)} />
            <StatBox label="Validade" value={formatDateBR(d.dataValidade)} />
            <StatBox label="Próxima dose" value={formatDateBR(d.proximaDose)} />
          </StatRow>
          {d.reacaoAdversaObservada ? (
            <HighlightField label="⚠ Reação adversa observada" value={d.reacaoAdversaObservada} />
          ) : null}
        </SectionCard>
      );
    }

    if (appointment.type === "Retorno") {
      const d = appointment.details as ReturnDetails;
      return (
        <SectionCard title="Retorno">
          <TextField label="Atendimento de origem (ref.)" value={d.atendimentoOrigemId} />
          <TextField label="Motivo" value={d.motivoRetorno} />
          <TextField label="Evolução observada" value={d.evolucaoObservada} />
          <TextField label="Novo diagnóstico / conduta" value={d.novoDiagnosticoConduta} />
          <StatRow>
            <StatBox label="Próximo acompanhamento" value={d.retornoRecomendadoEmDias} unit="dias" />
          </StatRow>
        </SectionCard>
      );
    }

    return (
      <SectionCard title={`Atendimento (legado) — ${appointment.type}`}>
        <StatRow>
          <StatBox label="Peso" value={appointment.pesoAtual} unit="kg" />
          <StatBox label="Temperatura" value={appointment.temperaturaCorporal} unit="°C" />
          <StatBox label="FC" value={appointment.frequenciaCardiaca} unit="bpm" />
          <StatBox label="FR" value={appointment.frequenciaRespiratoria} unit="mpm" />
        </StatRow>
        <Text style={[styles.mono, { marginTop: 6 }]}>
          {JSON.stringify(appointment.details || {}, null, 2)}
        </Text>
      </SectionCard>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Cabecalho */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.clinicName}>{clinicName || company.companyName}</Text>
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

        {/* Titulo */}
        <View style={styles.docMeta}>
          <View>
            <Text style={styles.docTitle}>FICHA DE ATENDIMENTO</Text>
            <Text style={styles.docType}>
              {TYPE_LABELS[appointment.type] || appointment.type}  ·  Emitido por {user.userName}  ·  CRMV {company.crmv}
            </Text>
          </View>
          <View>
            <Text style={styles.docRef}>Ref. {appointment.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.docDate}>
              {formatDateBR(appointment.date)}{appointment.time ? `  ${appointment.time}` : ""}
            </Text>
          </View>
        </View>

        {/* Info tutor e paciente */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>TUTOR / RESPONSAVEL</Text>
            <Text style={styles.infoValue}>{clientName || "Nao informado"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>PACIENTE</Text>
            <Text style={styles.infoValue}>{animalName || "Nao informado"}</Text>
            {animalSpecies && <Text style={styles.infoSub}>{animalSpecies}</Text>}
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{(TYPE_LABELS[appointment.type] || appointment.type).toUpperCase()}</Text>
          </View>
          <View style={styles.statusSep} />
          <Text style={styles.statusInfo}>Veterinário(a): {appointment.vet}</Text>
          <View style={styles.statusSep} />
          <Text style={styles.statusInfo}>
            {formatDateBR(appointment.date)}{appointment.time ? `  ·  ${appointment.time}` : ""}
          </Text>
        </View>

        {appointment.observacoesGerais && (
          <View style={styles.obsBox}>
            <Text style={styles.obsLabel}>NOTA ADMINISTRATIVA</Text>
            <Text style={styles.obsText}>{appointment.observacoesGerais}</Text>
          </View>
        )}

        <View style={{ marginTop: 4 }}>{renderType()}</View>

        {/* Assinatura */}
        <View style={styles.sigRow}>
          <View style={styles.sigArea}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{appointment.vet || user.userName}</Text>
            <Text style={styles.sigSub}>CRMV {company.crmv} · Responsavel Tecnico</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.companyName} — Documento gerado pelo sistema</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages} — Emitido em ${today}`}
          />
        </View>
      </Page>
    </Document>
  );
}
