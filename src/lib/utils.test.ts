import { describe, it, expect } from "vitest";
import { parseBrNumber } from "./utils";

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
