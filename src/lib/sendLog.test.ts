import { describe, expect, it } from "vitest";
import { formatSendStat, mergeSendEvents, sendKey } from "./sendLog";

describe("contador de envios ao tutor", () => {
  it("soma banco + o que ficou só no aparelho e guarda o último", () => {
    const stats = mergeSendEvents(
      [
        { item_key: "exam:1", sent_at: "2026-09-30T13:00:00+00:00" },
        { item_key: "exam:1", sent_at: "2026-09-30T18:40:00+00:00" },
        { item_key: "prescription:9", sent_at: "2026-09-29T12:00:00+00:00" },
      ],
      { "exam:1": ["2026-09-30T15:00:00.000Z"], "budget:3": ["2026-09-28T10:00:00.000Z"] }
    );
    expect(stats["exam:1"]).toEqual({ count: 3, last: "2026-09-30T18:40:00.000Z" });
    expect(stats["prescription:9"].count).toBe(1);
    expect(stats["budget:3"].count).toBe(1);
    expect(stats["document:x"]).toBeUndefined();
  });
  it("texto do selo e chave", () => {
    expect(sendKey("exam", "abc")).toBe("exam:abc");
    const text = formatSendStat({ count: 2, last: new Date(2026, 8, 30, 15, 40).toISOString() });
    expect(text).toBe("Enviado 2× · último 30/09 15:40");
  });
});
