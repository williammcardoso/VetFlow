import { describe, expect, it } from "vitest";
import { buildAppointmentNotice, clinicAddressLine, noticeDateLabel, petRef, phoneFromText } from "./appointmentNotice";

const now = new Date(2026, 9, 30, 9, 0); // sexta, 30/10/2026
const base = {
  title: "",
  clientName: "Maria Souza",
  animalName: "Thor",
  animalGender: "Macho",
  time: "15:00",
  clinicName: "Clínica Moraes Cardoso",
  clinicAddress: "Rua Campos Salles, 175, Centro — Itapira",
  now,
};

describe("noticeDateLabel", () => {
  it("hoje, amanhã e outros dias", () => {
    expect(noticeDateLabel(new Date(2026, 9, 30, 12), now)).toBe("*Hoje* (30/10)");
    expect(noticeDateLabel(new Date(2026, 9, 31, 12), now)).toBe("*Amanhã*, sábado (31/10)");
    expect(noticeDateLabel(new Date(2026, 10, 3, 12), now)).toBe("*Terça-feira, 03/11*");
    expect(noticeDateLabel(new Date(2027, 0, 4, 12), now)).toBe("*Segunda-feira, 04/01/2027*");
  });
});

describe("petRef", () => {
  it("usa o sexo do cadastro", () => {
    expect(petRef("Thor", "Macho")).toBe("do *Thor*");
    expect(petRef("Mel", "Fêmea")).toBe("da *Mel*");
    expect(petRef("Pipoca")).toBe("do(a) *Pipoca*");
    expect(petRef("")).toBe("do seu pet");
  });
});

describe("buildAppointmentNotice", () => {
  it("vacina na clínica: lista as vacinas, endereço e cuidados", () => {
    const text = buildAppointmentNotice({
      ...base,
      kind: "vacina",
      kindInfo: { place: "loja", vaccines: ["V10 importada"], vaccineOther: "Gripe" },
      date: new Date(2026, 9, 31, 12),
    });
    expect(text.split("\n")[0]).toBe("💉 *Vacinação*");
    expect(text).toContain("Olá, Maria! Tudo bem? 😊");
    expect(text).toContain("Passando para confirmar o agendamento do *Thor*:");
    expect(text).toContain("📅 *Amanhã*, sábado (31/10), às *15:00*");
    expect(text).toContain("💉 Vacinas: *V10 importada + Gripe*");
    expect(text).toContain("📍 Na clínica: Rua Campos Salles, 175, Centro — Itapira");
    expect(text).toContain("• Traga a carteirinha de vacinação.");
    expect(text).toContain("caixa de transporte");
    expect(text.endsWith("*Clínica Moraes Cardoso*")).toBe(true);
  });

  it("consulta domiciliar não manda o endereço da clínica", () => {
    const text = buildAppointmentNotice({ ...base, kind: "consulta", kindInfo: { place: "domicilio" }, date: new Date(2026, 10, 3, 12) });
    expect(text.split("\n")[0]).toBe("🏠 *Consulta domiciliar*");
    expect(text).toContain("🏠 Atendimento no seu endereço");
    expect(text).not.toContain("Na clínica");
    expect(text).toContain("cômodo fechado");
  });

  it("no dia, vira lembrete", () => {
    const text = buildAppointmentNotice({ ...base, kind: "consulta", kindInfo: { place: "loja" }, date: new Date(2026, 9, 30, 12) });
    expect(text.split("\n")[0]).toBe("🩺 *Consulta veterinária — hoje*");
    expect(text).toContain("Passando para lembrar do atendimento do *Thor*:");
  });

  it("medicação mostra o remédio e não inventa local", () => {
    const text = buildAppointmentNotice({ ...base, kind: "medicacao", kindInfo: { medication: "Cytopoint", obs: "valor combinado R$ 300" }, date: new Date(2026, 10, 3, 12) });
    expect(text).toContain("💊 Medicação: *Cytopoint*");
    expect(text).not.toContain("📍");
    // observação é interna do balcão
    expect(text).not.toContain("300");
  });

  it("agendamento antigo (sem tipo) usa o texto do agendamento", () => {
    const text = buildAppointmentNotice({ ...base, title: "Retorno pós-cirúrgico", date: new Date(2026, 10, 3, 12) });
    expect(text.split("\n")[0]).toBe("🐾 *Retorno pós-cirúrgico*");
    expect(text).not.toContain("*Para o atendimento:*");
  });

  it("cancelado e falta mudam o recado", () => {
    const date = new Date(2026, 10, 3, 12);
    const cancelled = buildAppointmentNotice({ ...base, kind: "consulta", kindInfo: { place: "loja" }, date, status: "cancelled" });
    expect(cancelled.split("\n")[0]).toBe("❌ *Agendamento cancelado*");
    expect(cancelled).toContain("Quer marcar outro dia?");
    expect(cancelled).not.toContain("Pode confirmar");
    const noShow = buildAppointmentNotice({ ...base, animalName: "Mel", animalGender: "Fêmea", kind: "vacina", kindInfo: { place: "loja" }, date, status: "no_show" });
    expect(noShow).toContain("Sentimos a falta da *Mel* no atendimento:");
    expect(noShow).toContain("Quer remarcar?");
  });

  it("sem nome do cliente e sem clínica", () => {
    const text = buildAppointmentNotice({ ...base, clientName: "", clinicName: "", kind: "outro", kindInfo: { other: "Banho e tosa" }, date: new Date(2026, 10, 3, 12) });
    expect(text).toContain("Olá! Tudo bem? 😊");
    expect(text.split("\n")[0]).toBe("📋 *Banho e tosa*");
    expect(text.trim().endsWith("Se precisar remarcar, é só avisar.")).toBe(true);
  });
});

describe("phoneFromText", () => {
  it("acha telefone na observação", () => {
    expect(phoneFromText("tel (19) 99363-1981, 2 gatos")).toBe("(19) 99363-1981");
    expect(phoneFromText("19 993631981")).toBe("19 993631981");
    expect(phoneFromText("valor R$ 150, 2 animais")).toBeUndefined();
    expect(phoneFromText(undefined)).toBeUndefined();
  });
});

describe("clinicAddressLine", () => {
  it("junta endereço e cidade sem repetir", () => {
    expect(clinicAddressLine("Rua A, 1", "Itapira")).toBe("Rua A, 1 — Itapira");
    expect(clinicAddressLine("Rua A, 1, Itapira", "Itapira")).toBe("Rua A, 1, Itapira");
    expect(clinicAddressLine("", "Itapira")).toBe("Itapira");
  });
});
