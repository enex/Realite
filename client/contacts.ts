import orpc from "@/client/orpc";
import { standardizePhoneNumber } from "@/shared/validation/phone";
import * as Contacts from "expo-contacts";
import { v5 as uuidv5 } from "uuid";

// Namespace für die Telefonnummer-Hashes - sollte mit dem Backend übereinstimmen
const PHONE_NUMBER_NAMESPACE = "f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0";

/**
 * Generiert einen UUID v5 Hash für eine Telefonnummer
 */
function generatePhoneNumberHash(phoneNumber: string): string {
  const normalizedNumber = standardizePhoneNumber(phoneNumber);
  return uuidv5(normalizedNumber, PHONE_NUMBER_NAMESPACE);
}

/**
 * Synchronisiert alle Kontakte mit dem Backend
 * Benötigt die entsprechenden Berechtigungen
 */
export const syncContacts = async () => {
  try {
    // Berechtigungen anfragen
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== Contacts.PermissionStatus.GRANTED) {
      throw new Error("Keine Berechtigung für Kontaktzugriff");
    }

    // Alle Kontakte laden
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
    });

    // Alle Telefonnummern extrahieren und Hashes generieren
    const hashes = data
      .flatMap((contact) => contact.phoneNumbers ?? [])
      .map((phone) => phone.number)
      .filter((number): number is string => !!number)
      .map(generatePhoneNumberHash);

    // Unique Hashes an Backend senden
    if (hashes.length > 0) {
      await orpc.contact.importContacts.mutate({
        hashes: [...new Set(hashes)],
      });
    }

    return {
      success: true,
      contactCount: data.length,
      hashCount: hashes.length,
    };
  } catch (error) {
    console.error("Fehler bei der Kontaktsynchronisierung:", error);
    throw error;
  }
};
