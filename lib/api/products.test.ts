import { describe, expect, it } from "vitest";
import { formatPaisa, paisaToTaka, previewTax, takaToPaisa } from "./products";

describe("takaToPaisa", () => {
  it("turns what a person types into whole paisa", () => {
    expect(takaToPaisa("899")).toBe(89900);
    expect(takaToPaisa("899.5")).toBe(89950);
    expect(takaToPaisa("899.50")).toBe(89950);
    expect(takaToPaisa("1,299")).toBe(129900);
    expect(takaToPaisa(" 0.05 ")).toBe(5);
  });

  it("does not float-round: 19.99 is exactly 1999 paisa", () => {
    expect(takaToPaisa("19.99")).toBe(1999);
    expect(takaToPaisa("1.15")).toBe(115);
  });

  it("refuses what is not an amount", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "12.", ".5", "৳50"]) expect(takaToPaisa(bad)).toBeNull();
  });
});

describe("paisaToTaka and formatPaisa", () => {
  it("shows whole taka without decimals and others with two", () => {
    expect(paisaToTaka(89900)).toBe("899");
    expect(paisaToTaka(89950)).toBe("899.50");
    expect(formatPaisa(89900)).toBe("৳899");
    expect(formatPaisa(89950)).toBe("৳899.50");
    expect(formatPaisa(5)).toBe("৳0.05");
    expect(formatPaisa(12345600)).toBe("৳1,23,456");
  });

  it("round-trips", () => {
    for (const paisa of [1, 99, 100, 1999, 89950, 12345678]) expect(takaToPaisa(paisaToTaka(paisa))).toBe(paisa);
  });
});

describe("previewTax", () => {
  it("adds tax on top when prices are before tax", () => {
    expect(previewTax(89900, { label: "VAT", rate: 15, inclusive: false })).toEqual({ net: 89900, tax: 13485, total: 103385 });
  });

  it("finds the tax inside when prices already contain it", () => {
    expect(previewTax(115000, { label: "VAT", rate: 15, inclusive: true })).toEqual({ net: 100000, tax: 15000, total: 115000 });
  });
});
