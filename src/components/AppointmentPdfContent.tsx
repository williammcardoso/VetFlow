import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  AppointmentEntry,
  ConsultationDetails,
  ReturnDetails,
  SurgeryDetails,
  VaccinationDetails,
} from "@/types/appointment";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 10, marginTop: 4, color: "#555" },
  section: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: { marginBottom: 4 },
  label: { fontWeight: 700 },
  value: { color: "#111" },
  block: { marginTop: 6, padding: 8, backgroundColor: "#F9FAFB", borderRadius: 4 },
  mono: { fontFamily: "Courier" },
});

const Field = ({ label, value }: { label: string; value: any }) => {
  if (value === undefined || value === null || value === "") return null;
  const text = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Sim" : "Não") : String(value);
  return (
    <Text style={styles.field}>
      <Text style={styles.label}>{label}: </Text>
      <Text style={styles.value}>{text}</Text>
    </Text>
  );
};

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
  const headerLine = `${clientName} • ${animalName}${animalSpecies ? ` (${animalSpecies})` : ""}`;

  const renderType = () => {
    if (appointment.type === "Consulta") {
      const d = appointment.details as ConsultationDetails;
      return (
        <View>
          <Text style={styles.sectionTitle}>Consulta Clínica</Text>
          <Field label="Queixa principal" value={d.queixaPrincipal} />
          <Field label="História / evolução" value={d.historicoClinico} />
          <View style={styles.row}>
            <Field label="Peso (kg)" value={appointment.pesoAtual} />
            <Field label="Temperatura (°C)" value={appointment.temperaturaCorporal} />
          </View>
          <Field label="Estado geral" value={d.estadoGeral} />
          <Field label="Mucosas" value={(d as any).mucosasResumo || (d as any).mucosas} />
          <Field label="Hidratação" value={d.hidratacao} />
          <Field label="Observações do exame físico" value={d.exameFisicoObs} />

          <View style={styles.block}>
            <Field label="Suspeita diagnóstica" value={d.suspeitaDiagnostica} />
            <Field label="Diagnósticos diferenciais" value={d.diagnosticoDiferencial} />
            <Field label="Exames solicitados" value={d.examesSolicitados} />
            <Field label="Conduta / tratamento" value={d.condutaTratamento} />
            <Field label="Retorno (dias)" value={d.retornoRecomendadoEmDias} />
            <Field label="Próximos passos" value={d.proximosPassos} />
          </View>
        </View>
      );
    }

    if (appointment.type === "Cirurgia") {
      const d = appointment.details as SurgeryDetails;
      return (
        <View>
          <Text style={styles.sectionTitle}>Cirurgia</Text>
          <View style={styles.row}>
            <Field label="Início" value={d.horaInicio} />
            <Field label="Término" value={d.horaTermino} />
            <Field label="Anestesista" value={d.anestesista} />
          </View>

          <View style={styles.block}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>Pré-operatório</Text>
            <View style={styles.row}>
              <Field label="Peso (kg)" value={appointment.pesoAtual} />
              <Field label="Temperatura (°C)" value={appointment.temperaturaCorporal} />
              <Field label="FC" value={appointment.frequenciaCardiaca} />
              <Field label="FR" value={appointment.frequenciaRespiratoria} />
            </View>
            <Field label="Mucosas" value={d.mucosas} />
            <Field label="TPC (s)" value={d.tpcSeg} />
            <Field label="Jejum adequado" value={d.jejumAdequado} />
            <Field label="Exames pré-op avaliados" value={d.examesPreOperatoriosAvaliados} />
            <Field label="Observações" value={d.observacoesPreOperatorias} />
          </View>

          <View style={styles.block}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>Procedimento</Text>
            <Field label="Procedimento" value={d.procedimentoRealizado} />
            <Field label="Diagnóstico" value={d.diagnostico} />
            <Field label="Técnica" value={d.tecnicaCirurgica} />
            <Field label="Protocolo anestésico" value={d.protocoloAnestesico} />
            <Field label="Intercorrências" value={d.intercorrenciaIntraOperatoria} />
            {d.intercorrenciaIntraOperatoria && <Field label="Descrição" value={d.intercorrenciaDescricao} />}
          </View>

          {d.suturas && d.suturas.length > 0 && (
            <View style={styles.block}>
              <Text style={{ fontWeight: 700, marginBottom: 4 }}>Materiais & suturas</Text>
              {d.suturas.map((s) => (
                <Text key={s.id} style={styles.field}>
                  <Text style={styles.mono}>{s.tipo}</Text>
                  {s.calibre ? ` • ${s.calibre}` : ""}
                  {s.plano ? ` • ${s.plano}` : ""}
                  {s.padrao ? ` • ${s.padrao}` : ""}
                  {s.quantidade ? ` • Qtd: ${s.quantidade}` : ""}
                  {s.usoLocal ? ` • ${s.usoLocal}` : ""}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.block}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>Pós-operatório</Text>
            <Field label="Condição ao final" value={d.condicaoFinal} />
            <Field label="Prescrição (resumo)" value={d.prescricaoPosOperatoria} />
            <Field label="Orientações ao tutor" value={d.orientacoesTutor} />
            <Field label="Complicações imediatas" value={d.complicacoesImediatas} />
            <Field label="Observações" value={d.observacoesPosOperatorias} />
          </View>
        </View>
      );
    }

    if (appointment.type === "Vacina") {
      const d = appointment.details as VaccinationDetails;
      return (
        <View>
          <Text style={styles.sectionTitle}>Vacinação</Text>
          <Field label="Tipo" value={d.tipoVacina} />
          <Field label="Nome comercial" value={d.nomeComercial} />
          <Field label="Lote" value={d.lote} />
          <Field label="Fabricante" value={d.fabricante} />
          <Field label="Dose (mL)" value={d.doseAplicada} />
          <Field label="Via" value={d.viaAdministracao} />
          <Field label="Local" value={d.localAplicacao} />
          <Field label="Reação adversa" value={d.reacaoAdversaObservada} />
        </View>
      );
    }

    if (appointment.type === "Retorno") {
      const d = appointment.details as ReturnDetails;
      return (
        <View>
          <Text style={styles.sectionTitle}>Retorno</Text>
          <Field label="Atendimento de origem" value={d.atendimentoOrigemId} />
          <Field label="Motivo" value={d.motivoRetorno} />
          <Field label="Evolução" value={d.evolucaoObservada} />
          <Field label="Novo diagnóstico/conduta" value={d.novoDiagnosticoConduta} />
        </View>
      );
    }

    // Legado
    return (
      <View>
        <Text style={styles.sectionTitle}>Atendimento (legado) — {appointment.type}</Text>
        <Field label="Peso (kg)" value={appointment.pesoAtual} />
        <Field label="Temperatura (°C)" value={appointment.temperaturaCorporal} />
        <Field label="FC" value={appointment.frequenciaCardiaca} />
        <Field label="FR" value={appointment.frequenciaRespiratoria} />
        <Text style={[styles.block, styles.mono]}>
          {JSON.stringify(appointment.details || {}, null, 2)}
        </Text>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{clinicName || "SystemVet"}</Text>
          <Text style={styles.subtitle}>{headerLine}</Text>
          <Text style={styles.subtitle}>
            Atendimento: {appointment.type} • {appointment.date} {appointment.time ? ` ${appointment.time}` : ""} • Vet: {appointment.vet}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações administrativas</Text>
          <Field label="Data/Hora" value={`${appointment.date}${appointment.time ? ` ${appointment.time}` : ""}`} />
          <Field label="Tipo" value={appointment.type} />
          <Field label="Veterinário" value={appointment.vet} />
          <Field label="Nota administrativa" value={appointment.observacoesGerais} />
        </View>

        <View style={styles.section}>{renderType()}</View>
      </Page>
    </Document>
  );
}
