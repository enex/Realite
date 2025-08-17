import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

export interface PhoneNumberValidationResult {
  isValid: boolean;
  standardizedNumber: string;
  error?: string;
}

/**
 * Validiert und standardisiert eine Telefonnummer mit libphonenumber-js.
 *
 * Format: E.164-Standard ohne '+' Präfix - perfekt für SMS-Services
 * Beispiel: "06-12345678" (NL) → "31612345678"
 *
 * - Keine führenden '+' oder '00'
 * - Keine Leerzeichen oder Bindestriche
 * - Kompatibel mit BudgetSMS und anderen SMS-Services
 *
 * @param phoneNumber - Die zu validierende Telefonnummer
 * @param defaultCountryCode - Standard-Ländercode (ISO 3166-1 alpha-2)
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountryCode: CountryCode = "DE",
): PhoneNumberValidationResult {
  try {
    let parsedNumber;

    // First, try to parse without a country code to handle numbers already in international format
    parsedNumber = parsePhoneNumberFromString(phoneNumber);

    // If that didn't work and the number looks like it might already be in international format
    // (starts with digits that could be a country code), try with + prefix
    if (!parsedNumber?.isValid() && /^\d{10,15}$/.test(phoneNumber)) {
      parsedNumber = parsePhoneNumberFromString("+" + phoneNumber);
    }

    // If that still didn't work, try with the default country code
    if (!parsedNumber?.isValid()) {
      parsedNumber = parsePhoneNumberFromString(
        phoneNumber,
        defaultCountryCode,
      );
    }

    // Prüfe ob die Nummer gültig ist
    if (!parsedNumber?.isValid()) {
      return {
        isValid: false,
        standardizedNumber: phoneNumber,
        error: "Ungültige Telefonnummer",
      };
    }

    // Gib die standardisierte Nummer im E.164-Format ohne + zurück
    return {
      isValid: true,
      standardizedNumber: parsedNumber.format("E.164").substring(1),
    };
  } catch {
    return {
      isValid: false,
      standardizedNumber: phoneNumber,
      error: "Ungültiges Nummernformat",
    };
  }
}

/**
 * Standardisiert eine Telefonnummer ins E.164-Format ohne '+' Präfix.
 * Wirft einen Fehler, wenn die Nummer ungültig ist.
 *
 * Perfekt für SMS-Services die E.164 ohne '+' benötigen.
 */
export function standardizePhoneNumber(
  phoneNumber: string,
  defaultCountryCode: CountryCode = "DE",
): string {
  const result = validatePhoneNumber(phoneNumber, defaultCountryCode);
  if (!result.isValid) {
    throw new Error(result.error ?? "Ungültige Telefonnummer");
  }
  return result.standardizedNumber;
}

/**
 * Zod-Schema für Telefonnummer-Validierung
 */
export const phoneNumberSchema = z
  .string()
  .refine((phoneNumber) => validatePhoneNumber(phoneNumber).isValid, {
    message: "Ungültige Telefonnummer",
  });
