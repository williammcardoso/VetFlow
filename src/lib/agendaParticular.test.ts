import { describe, expect, it } from "vitest";
import {
  diasOf,
  isDue,
  joinDevices,
  nextLabel,
  parsePrivateData,
  repeatModeOf,
  ruleLabel,
  splitDevices,
  upcomingDays,
  upcomingLabel,
} from "@/lib/agendaParticular";

const TODAY = "2026-11-23"; // segunda

describe("parsePrivateData", () => {
  it("lê o que o banco devolve (uma vez só = intervalo nulo)", () => {
    const d = parsePrivateData({
      dono: "williamcardoso",
      config: { token_particular: "ABCD", pushover_ok: true, aparelhos_particular: "iphone-pessoal", aparelhos_vetflow: null, hora_padrao: "07:30", som_padrao: null },
      lembretes: [
        { id: 1, texto: "Regar", detalhes: null, a_cada_dias: 3, hora: "08:00", proximo: "2026-11-26T08:00", ultimo: null, ativo: true, prioridade: 2, som: "magic" },
        { id: 2, texto: "Banco", a_cada_dias: null, hora: "09:00", proximo: "2026-11-23T09:00", ativo: false, prioridade: 0 },
      ],
    });
    expect(d.dono).toBe("williamcardoso");
    expect(d.config).toMatchObject({ tokenParticular: "ABCD", pushoverOk: true, aparelhosParticular: "iphone-pessoal", horaPadrao: "07:30" });
    expect(d.lembretes[0]).toMatchObject({ id: 1, aCadaDias: 3, prioridade: 2, som: "magic", ativo: true });
    expect(d.lembretes[1]).toMatchObject({ id: 2, aCadaDias: null, prioridade: 0, ativo: false, detalhes: null });
  });
});

describe("repetição", () => {
  it("modo ↔ dias", () => {
    expect([null, 1, 7, 3].map(repeatModeOf)).toEqual(["uma", "dia", "semana", "cada"]);
    expect([diasOf("uma", 3), diasOf("dia", 3), diasOf("semana", 3), diasOf("cada", 3), diasOf("cada", 0)]).toEqual([null, 1, 7, 3, 1]);
  });

  it("rótulo em português", () => {
    expect(ruleLabel(null, "08:00")).toBe("Uma vez só");
    expect(ruleLabel(1, "08:00")).toBe("Todo dia às 08:00");
    expect(ruleLabel(3, "08:00")).toBe("A cada 3 dias às 08:00");
    expect(ruleLabel(7, "19:30", "2026-11-26T19:30")).toBe("Toda quinta às 19:30");
    expect(ruleLabel(7, "10:00", "2026-11-29T10:00")).toBe("Todo domingo às 10:00");
  });
});

describe("próximos avisos", () => {
  it("próximo aviso relativo a hoje", () => {
    expect(nextLabel("2026-11-23T08:00", TODAY)).toBe("hoje às 08:00");
    expect(nextLabel("2026-11-26T08:00", TODAY)).toBe("qui 26/11 às 08:00");
  });

  it("prévia dos 3 próximos (ou só um)", () => {
    expect(upcomingDays("2026-11-23", 3)).toEqual(["2026-11-23", "2026-11-26", "2026-11-29"]);
    expect(upcomingDays("2026-11-30", 3)).toEqual(["2026-11-30", "2026-12-03", "2026-12-06"]);
    expect(upcomingLabel("2026-11-23", "08:00", 3, TODAY)).toBe("hoje, qui 26/11 e dom 29/11 às 08:00…");
    expect(upcomingLabel("2026-11-24", "09:00", null, TODAY)).toBe("amanhã às 09:00");
  });

  it("já venceu?", () => {
    const agora = new Date(2026, 10, 23, 10, 0);
    expect(isDue("2026-11-23T08:00", agora)).toBe(true);
    expect(isDue("2026-11-23T10:30", agora)).toBe(false);
  });
});

describe("aparelhos", () => {
  it("texto ↔ lista", () => {
    expect(splitDevices(" iphone-a, ,iphone-b ")).toEqual(["iphone-a", "iphone-b"]);
    expect(splitDevices(null)).toEqual([]);
    expect(joinDevices(["iphone-a", "iphone-b"])).toBe("iphone-a,iphone-b");
  });
});
