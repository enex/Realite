import { describe, expect, it } from "bun:test";
import { validatePhoneNumber } from "./phone";

describe("validatePhoneNumber", () => {
  it("should standardize German number starting with 0 to include country code", () => {
    const result = validatePhoneNumber("01234567890");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("491234567890");
  });

  it("should standardize number starting with 00 to include country code", () => {
    const result = validatePhoneNumber("0049123456789");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("49123456789");
  });

  it("should handle number with + prefix correctly", () => {
    const result = validatePhoneNumber("+491234567890");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("491234567890");
  });

  it("should recognize US numbers correctly", () => {
    const result = validatePhoneNumber("+12025551234");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("12025551234");
  });

  it("should handle formatted numbers", () => {
    const result = validatePhoneNumber("(030) 123-456-789", "DE");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("4930123456789");
  });

  it("should reject invalid numbers", () => {
    const result = validatePhoneNumber("123");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Ungültige Telefonnummer");
  });

  it("should handle UK numbers with specific country code", () => {
    const result = validatePhoneNumber("02071234567", "GB");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("442071234567");
  });

  it("should handle international format correctly", () => {
    const result = validatePhoneNumber("+33 1 42 34 56 78");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("33142345678");
  });

  it("should format Netherlands number for SMS service (E.164 without + prefix)", () => {
    // Exaktes Beispiel aus der SMS-Service Dokumentation
    const result = validatePhoneNumber("06-12345678", "NL");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("31612345678"); // Ohne +, ohne 00, ohne Leerzeichen/Bindestriche
  });

  it("should format numbers without + prefix for SMS service compatibility", () => {
    // Weitere Tests für verschiedene Länder
    const germanResult = validatePhoneNumber("030 123 456 789", "DE");
    expect(germanResult.isValid).toBe(true);
    expect(germanResult.standardizedNumber).toBe("4930123456789");

    const usResult = validatePhoneNumber("(202) 555-1234", "US");
    expect(usResult.isValid).toBe(true);
    expect(usResult.standardizedNumber).toBe("12025551234");
  });
  it("validating twice should return the same result", () => {
    const result = validatePhoneNumber("030 123 456 789", "DE");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("4930123456789");

    const result2 = validatePhoneNumber("030 123 456 789", "DE");
    expect(result2.isValid).toBe(true);
    expect(result2.standardizedNumber).toBe("4930123456789");
  });
  it("validating my phone number should return the correct result", () => {
    const result = validatePhoneNumber("01794364608", "DE");
    expect(result.isValid).toBe(true);
    expect(result.standardizedNumber).toBe("491794364608");
    const result2 = validatePhoneNumber(result.standardizedNumber, "DE");
    expect(result2.isValid).toBe(true);
    expect(result2.standardizedNumber).toBe("491794364608");
  });
});
