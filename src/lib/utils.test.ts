import { describe, it, expect } from "vitest";
import {
  buildPdfFileName,
  cleanDownloadFileName,
  extensionForMime,
  formatDateBRForFileName,
  parseBrNumber,
  storageFileName,
  withDownloadName,
} from "./utils";

describe("parseBrNumber", () => {
  it("parses plain integers", () => {
    expect(parseBrNumber("45")).toBe(45);
  });

  it("parses Brazilian decimal comma", () => {
    expect(parseBrNumber("12,5")).toBe(12.5);
  });

  it("parses Brazilian thousand separator with decimal comma", () => {
    expect(parseBrNumber("1.250,75")).toBe(1250.75);
  });

  it("parses a bare thousand separator (no decimals) as a whole number", () => {
    expect(parseBrNumber("166.000")).toBe(166000);
  });

  it("parses American decimal point", () => {
    expect(parseBrNumber("12.5")).toBe(12.5);
  });

  it("strips non-numeric characters like units", () => {
    expect(parseBrNumber("80 mg/dL")).toBe(80);
  });

  it("returns undefined for empty or invalid input", () => {
    expect(parseBrNumber("")).toBeUndefined();
    expect(parseBrNumber("   ")).toBeUndefined();
  });
});

describe("nomes de arquivo dos PDFs", () => {
  it("buildPdfFileName: nome legível com acento, partes separadas por traço", () => {
    expect(buildPdfFileName("Atestado de vacinação", "Thor", formatDateBRForFileName("2026-11-23"))).toBe(
      "Atestado de vacinação - Thor - 23-11-2026.pdf"
    );
  });

  it("buildPdfFileName: barra vira traço e some o que o Windows recusa", () => {
    expect(buildPdfFileName("Atestado / Declaração de Vacinação", 'Bob "Max"', "23-11-2026")).toBe(
      "Atestado ou Declaração de Vacinação - Bob Max - 23-11-2026.pdf"
    );
    expect(buildPdfFileName("Laudo", "Ureia/Creatinina", "Thor")).toBe("Laudo - Ureia-Creatinina - Thor.pdf");
  });

  it("buildPdfFileName: pula parte vazia e nunca devolve nome vazio", () => {
    expect(buildPdfFileName("Receita", undefined, "", "Thor")).toBe("Receita - Thor.pdf");
    expect(buildPdfFileName()).toBe("Documento.pdf");
  });

  it("storageFileName: sem acento, espaço ou símbolo (o Storage recusa chave com acento)", () => {
    expect(storageFileName("Atestado de vacinação - Thor - 23-11-2026.pdf")).toBe("atestado-de-vacinacao-thor-23-11-2026.pdf");
    expect(storageFileName("Atestado (via cão/gato) № 5.pdf")).toMatch(/^[a-z0-9-]+\.pdf$/);
    expect(storageFileName("A   B   C")).not.toMatch(/--/);
    expect(storageFileName("")).toBe("documento.pdf");
  });

  it("cleanDownloadFileName: mantém acento e garante .pdf", () => {
    expect(cleanDownloadFileName("Receita - Mimí")).toBe("Receita - Mimí.pdf");
    expect(cleanDownloadFileName("Receita: Thor.pdf")).toBe("Receita Thor.pdf");
  });

  it("withDownloadName: só em link público do Storage, com o nome codificado", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/documents/generated_pdfs/1_a/atestado.pdf";
    expect(withDownloadName(url, "Atestado de vacinação - Thor.pdf")).toBe(
      `${url}?download=Atestado%20de%20vacina%C3%A7%C3%A3o%20-%20Thor.pdf`
    );
    expect(withDownloadName("https://exemplo.com/a.pdf", "x.pdf")).toBe("https://exemplo.com/a.pdf");
    expect(withDownloadName(`${url}?download=a.pdf`, "b.pdf")).toBe(`${url}?download=a.pdf`);
  });

  it("arquivo anexado: nome com a extensão do tipo real", () => {
    expect(cleanDownloadFileName("Raio-X tórax - Thor - 23-11-2026", "jpg")).toBe("Raio-X tórax - Thor - 23-11-2026.jpg");
    expect(cleanDownloadFileName("Foto.png", "png")).toBe("Foto.png");
    // só tira a extensão de verdade, não "xpdf" no fim do nome
    expect(cleanDownloadFileName("Exame xpdf")).toBe("Exame xpdf.pdf");
    const url = "https://x.supabase.co/storage/v1/object/public/documents/patient_documents/p1/1_abc";
    expect(withDownloadName(url, "Raio-X - Thor", "jpg")).toBe(`${url}?download=Raio-X%20-%20Thor.jpg`);
  });

  it("extensionForMime: tipo do arquivo → extensão", () => {
    expect(extensionForMime("application/pdf")).toBe("pdf");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png; charset=binary")).toBe("png");
    expect(extensionForMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
    expect(extensionForMime("application/octet-stream")).toBeNull();
    expect(extensionForMime(null)).toBeNull();
  });
});
