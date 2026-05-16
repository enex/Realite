import { describe, expect, test } from "bun:test";

import {
  appendQrPrintVariant,
  normalizeQrPrintVariant,
} from "@/src/lib/qr-print-variants";

describe("qr print variants", () => {
  test("normalizes unknown values to the existing variant", () => {
    expect(normalizeQrPrintVariant("a")).toBe("a");
    expect(normalizeQrPrintVariant("b")).toBe("b");
    expect(normalizeQrPrintVariant("c")).toBe("c");
    expect(normalizeQrPrintVariant("h")).toBe("h");
    expect(normalizeQrPrintVariant("l")).toBe("l");
    expect(normalizeQrPrintVariant("x")).toBe("a");
    expect(normalizeQrPrintVariant(null)).toBe("a");
  });

  test("adds the short variant code without replacing existing query params", () => {
    expect(appendQrPrintVariant("/e/abc", "b")).toBe("/e/abc?s=b");
    expect(appendQrPrintVariant("/e/abc?ref=flyer", "c")).toBe("/e/abc?ref=flyer&s=c");
  });
});
