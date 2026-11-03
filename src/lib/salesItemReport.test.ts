import { describe, expect, it } from "vitest";
import type { SaleItem } from "./saleItemsApi";
import { ADJUSTMENT_CATEGORY, buildItemReportLines, compareWithAgrocentro, nameScore, parseAgrocentroReport, sumLines, totalsByDay } from "./salesItemReport";

// Relatório "Serviços veterinários" da Agrocentro de outubro/2026, como sai
// do sistema deles (transcrito da imagem que o usuário mandou).
const AGRO_OUTUBRO = `   Categoria
 62    SERVICOS VETERINARIOS
--------------------------------------------------------------------------------------------------------
8931  CONSULTA                    05/10/2026   1   VENDAS          1   S        120,00        120,00
16225 APLICACAO DE MEDICACAO      05/10/2026   1   VENDAS          1   S         15,00         15,00
8931  CONSULTA                    08/10/2026   1   VENDAS          1   S        120,00        120,00
16225 APLICACAO DE MEDICACAO      08/10/2026   1   VENDAS          2   S         30,00         30,00
8931  CONSULTA                    09/10/2026   1   VENDAS          1   S        120,00        120,00
16288 DRENAGEM OTOHEMATOMA        09/10/2026   1   VENDAS          1   S          0,00         50,00
8931  CONSULTA                    10/10/2026   1   VENDAS          1   S        120,00        120,00
16199 CONSULTA DOMICILIAR         10/10/2026   1   VENDAS          1   S          0,00        180,00
16225 APLICACAO DE MEDICACAO      10/10/2026   1   VENDAS          2   S         30,00         30,00
16226 FLUIDOTERAPIA IV / SC ATE 10/10/2026   1   VENDAS          1   S        150,00        150,00
16264 CORTE DE UNHA P             10/10/2026   1   VENDAS          1   S          0,00         20,00
16201 BIOQUIMICO - CREATININA     12/10/2026   1   VENDAS          1   S         16,00         30,00
16202 HEMOGRAMA COMPLETO          12/10/2026   1   VENDAS          1   S         80,00         80,00
16225 APLICACAO DE MEDICACAO      12/10/2026   1   VENDAS          2   S         30,00         30,00
16226 FLUIDOTERAPIA IV / SC ATE 12/10/2026   1   VENDAS          1   S        150,00        150,00
16225 APLICACAO DE MEDICACAO      13/10/2026   1   VENDAS         18   S        270,00        270,00
16228 FLUIDOTERAPIA IV / SC 20    13/10/2026   1   VENDAS          1   S        380,00        380,00
16225 APLICACAO DE MEDICACAO      14/10/2026   1   VENDAS          2   S         30,00         30,00
16292 ATESTADO DE SAUDE ANIMAL    14/10/2026   1   VENDAS          1   S          0,00         30,00
16230 ULTRASSOM                   15/10/2026   1   VENDAS          1   S        170,00        250,00
8931  CONSULTA                    16/10/2026   1   VENDAS          1   S        120,00        120,00
8931  CONSULTA                    16/10/2026   1   VENDAS          1   S        120,00        120,00
16199 CONSULTA DOMICILIAR         16/10/2026   1   VENDAS          1   S          0,00        180,00
16225 APLICACAO DE MEDICACAO      16/10/2026   1   VENDAS          1   S         15,00         15,00
16225 APLICACAO DE MEDICACAO      16/10/2026   1   VENDAS          1   S         15,00         15,00
16225 APLICACAO DE MEDICACAO      16/10/2026   1   VENDAS          2   S         30,00         30,00
16226 FLUIDOTERAPIA IV / SC ATE 16/10/2026   1   VENDAS          1   S        150,00        150,00
8931  CONSULTA                    23/10/2026   1   VENDAS          1   S        120,00        120,00
16199 CONSULTA DOMICILIAR         23/10/2026   1   VENDAS          1   S          0,00        180,00
16225 APLICACAO DE MEDICACAO      23/10/2026   1   VENDAS          2   S         30,00         30,00
16225 APLICACAO DE MEDICACAO      23/10/2026   1   VENDAS          2   S         30,00         30,00
16225 APLICACAO DE MEDICACAO      23/10/2026   1   VENDAS          2   S         30,00         30,00
16225 APLICACAO DE MEDICACAO      23/10/2026   1   VENDAS          1   S         15,00         15,00
16226 FLUIDOTERAPIA IV / SC ATE 23/10/2026   1   VENDAS          1   S        150,00        150,00
16226 FLUIDOTERAPIA IV / SC ATE 23/10/2026   1   VENDAS          1   S        150,00        150,00
16199 CONSULTA DOMICILIAR         28/10/2026   1   VENDAS          1   S          0,00        180,00
16225 APLICACAO DE MEDICACAO      28/10/2026   1   VENDAS          2   S         30,00         30,00
8931  CONSULTA                    30/10/2026   1   VENDAS          1   S        120,00        120,00
16199 CONSULTA DOMICILIAR         30/10/2026   1   VENDAS          1   S          0,00        180,00
16203 EUTANASIA ATE 10KG          30/10/2026   1   VENDAS          1   S          0,00        250,00
16225 APLICACAO DE MEDICACAO      30/10/2026   1   VENDAS          4   S         60,00         60,00
16234 CITOLOGIA                   30/10/2026   1   VENDAS          1   S         80,00        160,00
16309 CULTURA AEROBIA COM ANTIB 30/10/2026   1   VENDAS          1   S        115,00        230,00
                                                                 -------------------------------------
                                          Total               72              2.776,00      4.315,00
--------------------------------------------------------------------------------------------------------
                                          Total            72,00              3.211,00      4.750,00
`;

const item = (saleId: string, name: string, quantity: number, unitPrice: number, extra: Partial<SaleItem> = {}): SaleItem => ({
  id: `${saleId}-${name}`,
  saleId,
  name,
  type: "service",
  quantity,
  unitPrice,
  cost: 0,
  subtotal: quantity * unitPrice,
  ...extra,
});

describe("parseAgrocentroReport", () => {
  it("lê as 43 linhas e os totais impressos", () => {
    const { lines, printedTotals } = parseAgrocentroReport(AGRO_OUTUBRO);
    expect(lines).toHaveLength(43);
    expect(lines[0]).toEqual({ code: "8931", description: "CONSULTA", date: "2026-10-05", quantity: 1, cost: 120, total: 120 });
    expect(lines.find((l) => l.quantity === 18)).toMatchObject({ code: "16225", date: "2026-10-13", total: 270 });
    // descrição colada na data (cortada em 25 letras no sistema deles)
    expect(lines.at(-1)).toMatchObject({ code: "16309", description: "CULTURA AEROBIA COM ANTIB", total: 230 });
    expect(sumLines(lines)).toEqual({ quantity: 72, total: 4750 });
    // O total da categoria impresso (4.315,00) não fecha com as linhas (4.750,00).
    expect(printedTotals).toEqual([
      { quantity: 72, cost: 2776, total: 4315 },
      { quantity: 72, cost: 3211, total: 4750 },
    ]);
  });

  it("devolução entra negativa e linha estranha é ignorada", () => {
    const { lines } = parseAgrocentroReport("8931 CONSULTA 05/10/2026 1 DEVOLUCAO 1 S 120,00 120,00\nqualquer coisa\n");
    expect(lines).toEqual([{ code: "8931", description: "CONSULTA", date: "2026-10-05", quantity: -1, cost: -120, total: -120 }]);
  });
});

describe("buildItemReportLines", () => {
  it("um item por linha, em ordem de data, com desconto/acréscimo/taxa da venda", () => {
    const lines = buildItemReportLines({
      sales: [
        { id: "v2", date: "2026-10-08", time: "10:00", amount: 135 },
        { id: "v1", date: "2026-10-05", time: "09:00", amount: 130, discountAmount: 10, financialFee: 5 },
        { id: "v3", date: "2026-10-09", amount: 80, description: "Venda antiga: Hemograma" },
        { id: "v4", date: "2026-10-09", time: "11:00", amount: 100 },
      ],
      items: [item("v1", "Consulta", 1, 120), item("v1", "Aplicação de medicação", 1, 15), item("v2", "Consulta", 1, 120), item("v2", "Aplicação de medicação", 1, 15), item("v4", "Consulta", 1, 120)],
      codeOf: (i) => (i.name === "Consulta" ? "8931" : undefined),
      peopleOf: (id) => ({ clientName: `Cliente ${id}` }),
    });
    expect(lines.map((l) => [l.date, l.description, l.total])).toEqual([
      ["2026-10-05", "Consulta", 120],
      ["2026-10-05", "Aplicação de medicação", 15],
      ["2026-10-05", "Desconto na venda", -10],
      ["2026-10-05", "Taxa do cartão repassada", 5],
      ["2026-10-08", "Consulta", 120],
      ["2026-10-08", "Aplicação de medicação", 15],
      ["2026-10-09", "Venda antiga: Hemograma", 80],
      ["2026-10-09", "Consulta", 120],
      ["2026-10-09", "Diferença na venda (desconto)", -20],
    ]);
    expect(lines[0]).toMatchObject({ code: "8931", clientName: "Cliente v1", category: "servico" });
    expect(lines[2].category).toBe(ADJUSTMENT_CATEGORY);
    // fecha com o faturado; ajuste não conta como item
    expect(sumLines(lines)).toEqual({ quantity: 6, total: 130 + 135 + 80 + 100 });
    expect(totalsByDay(lines)).toEqual([
      { date: "2026-10-05", quantity: 2, total: 130 },
      { date: "2026-10-08", quantity: 2, total: 135 },
      { date: "2026-10-09", quantity: 2, total: 180 },
    ]);
  });
});

describe("compareWithAgrocentro", () => {
  let n = 0;
  const line = (date: string, description: string, total: number, quantity = 1) => ({
    key: `l${++n}`,
    saleId: "s",
    date,
    description,
    quantity,
    unitPrice: total / quantity,
    total,
    category: "servico",
  });
  const NAMES: Record<string, string> = {
    "8931": "Consulta",
    "16225": "Aplicação de medicação",
    "16199": "Consulta domicílio",
    "16226": "Fluidoterapia IV / SC até 10kg",
    "16228": "Fluidoterapia IV / SC 20 a 40kg",
    "16230": "Ultrassom abdominal",
    "16292": "Atestado de saúde animal (Sem consulta)",
    "16309": "Cultura aeróbia com antibiograma",
  };
  // VetFlow espelhando a Agrocentro, com o nome do VetFlow (sem código).
  const mirror = (agro: ReturnType<typeof parseAgrocentroReport>["lines"]) =>
    agro.map((a) => line(a.date, NAMES[a.code] ?? a.description.toLowerCase(), a.total, a.quantity));

  it("tudo igual: bate, mesmo com lançamento quebrado diferente", () => {
    const { lines: agro } = parseAgrocentroReport(AGRO_OUTUBRO);
    // dia 16: duas aplicações de 15,00 viraram uma de 2× no VetFlow
    const vet = mirror(agro.filter((a) => !(a.date === "2026-10-16" && a.total === 15)));
    vet.push(line("2026-10-16", "Aplicação de medicação", 30, 2));
    const result = compareWithAgrocentro(vet, agro);
    expect(result.diff).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.shifts).toEqual([]);
    expect(result.days.every((d) => d.status === "ok")).toBe(true);
  });

  it("lançado em outro dia não é diferença; aponta só o que falta de verdade", () => {
    // O caso de outubro: consulta domiciliar do dia 10 lançada no 13, ultrassom
    // do 15 lançado no 14, e no 23 faltou uma consulta e uma aplicação (e as
    // fluidoterapias foram lançadas juntas, 2× 150,00).
    const { lines: agro } = parseAgrocentroReport(AGRO_OUTUBRO);
    const vet = mirror(
      agro.filter(
        (a) =>
          !(a.date === "2026-10-10" && a.code === "16199") &&
          !(a.date === "2026-10-15" && a.code === "16230") &&
          !(a.date === "2026-10-23" && ["8931", "16225", "16226"].includes(a.code))
      )
    );
    vet.push(line("2026-10-13", "Consulta domicílio", 180));
    vet.push(line("2026-10-14", "Ultrassom abdominal", 250));
    vet.push(line("2026-10-23", "Fluidoterapia IV / SC até 10kg", 300, 2));
    vet.push(line("2026-10-23", "Aplicação de medicação", 90, 6));

    const result = compareWithAgrocentro(vet, agro);
    expect(result.diff).toBe(-135);
    expect(result.shifts.map((s) => [s.description, s.total, s.vetflowDate, s.agroDate])).toEqual([
      ["Consulta domicílio", 180, "2026-10-13", "2026-10-10"],
      ["Ultrassom abdominal", 250, "2026-10-14", "2026-10-15"],
    ]);
    expect(result.issues.map((i) => [i.date, i.description, i.vetflow, i.agro, i.vetflowQty, i.agroQty, i.diff])).toEqual([
      ["2026-10-23", "Aplicação de medicação", 90, 105, 6, 7, -15],
      ["2026-10-23", "CONSULTA", 0, 120, 0, 1, -120],
    ]);
    const status = Object.fromEntries(result.days.filter((d) => d.status !== "ok").map((d) => [d.date, d.status]));
    expect(status).toEqual({
      "2026-10-10": "shifted",
      "2026-10-13": "shifted",
      "2026-10-14": "shifted",
      "2026-10-15": "shifted",
      "2026-10-23": "wrong",
    });
    // a soma das diferenças de verdade é a diferença do mês
    expect(result.issues.reduce((s, i) => s + i.diff, 0)).toBe(result.diff);
  });

  it("falta de um lado e sobra do outro em dias diferentes, item diferente: não inventa troca de dia", () => {
    const agro = parseAgrocentroReport("16203 EUTANASIA ATE 10KG 30/10/2026 1 VENDAS 1 S 0,00 250,00").lines;
    const vet = [line("2026-10-28", "Ultrassom abdominal", 250)];
    const result = compareWithAgrocentro(vet, agro);
    expect(result.shifts).toEqual([]);
    expect(result.issues.map((i) => [i.date, i.diff])).toEqual([
      ["2026-10-28", 250],
      ["2026-10-30", -250],
    ]);
  });

  it("nome parecido nos dois sistemas", () => {
    expect(nameScore("Aplicação de medicação", "APLICACAO DE MEDICACAO")).toBe(1);
    expect(nameScore("Cultura aeróbia com antibiograma", "CULTURA AEROBIA COM ANTIB")).toBe(1);
    expect(nameScore("Consulta domicílio", "CONSULTA DOMICILIAR")).toBe(1);
    expect(nameScore("Consulta", "CONSULTA")).toBeGreaterThan(nameScore("Consulta", "CONSULTA DOMICILIAR"));
    expect(nameScore("Fluidoterapia IV / SC 20 a 40kg", "FLUIDOTERAPIA IV / SC 20")).toBeGreaterThan(nameScore("Fluidoterapia IV / SC 20 a 40kg", "FLUIDOTERAPIA IV / SC ATE"));
    expect(nameScore("Ultrassom abdominal", "CITOLOGIA")).toBe(0);
  });
});
