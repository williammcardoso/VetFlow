import { describe, expect, it } from "vitest";
import { sha256Hex, sha256HexPureJs } from "./sha256";

// Vetores de teste conhecidos (NIST / uso corrente para validar implementações de SHA-256).
const VECTORS: [string, string][] = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  [
    "The quick brown fox jumps over the lazy dog",
    "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
  ],
];

describe("sha256Hex (crypto.subtle, quando disponível)", () => {
  for (const [input, expected] of VECTORS) {
    it(`hash de ${JSON.stringify(input)}`, async () => {
      expect(await sha256Hex(input)).toBe(expected);
    });
  }
});

describe("sha256HexPureJs (fallback sem crypto.subtle — usado quando o app é acessado por IP da rede local sem HTTPS)", () => {
  for (const [input, expected] of VECTORS) {
    it(`hash de ${JSON.stringify(input)}`, () => {
      expect(sha256HexPureJs(new TextEncoder().encode(input))).toBe(expected);
    });
  }

  it("produz o mesmo resultado que crypto.subtle para um texto longo e com acentuação", async () => {
    const texto = "Atesto, para os devidos fins, que compareceu à clínica não é ç à õ".repeat(50);
    const viaSubtle = await sha256Hex(texto);
    const viaPureJs = sha256HexPureJs(new TextEncoder().encode(texto));
    expect(viaPureJs).toBe(viaSubtle);
  });
});
