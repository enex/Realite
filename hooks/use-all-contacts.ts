import { PHONE_NUMBER_HASH_NAMESPACE } from "@/shared/validation";
import { standardizePhoneNumber } from "@/shared/validation/phone";
import { useQuery } from "@tanstack/react-query";
import * as Contacts from "expo-contacts";
import * as uuid from "uuid";

export default function useAllContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      console.log("🔍 Starting contact loading...");

      // Berechtigungen prüfen
      const { status } = await Contacts.requestPermissionsAsync();
      console.log("📱 Contact permission status:", status);

      if (status !== Contacts.PermissionStatus.GRANTED) {
        console.error("❌ Contact permission denied");
        throw new Error("Keine Berechtigung für Kontaktzugriff");
      }

      try {
        // Alle Kontakte laden
        console.log("📞 Loading contacts...");
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Image,
            Contacts.Fields.Name,
          ],
        });

        console.log(`📋 Found ${data.length} raw contacts`);

        const processedContacts = data
          .filter((contact) => {
            // Filtere Kontakte ohne Namen oder Telefonnummern aus
            const hasName = contact.name && contact.name.trim().length > 0;
            const hasPhoneNumbers =
              contact.phoneNumbers && contact.phoneNumbers.length > 0;

            if (!hasName) {
              console.log("⚠️ Skipping contact without name:", contact.id);
              return false;
            }

            if (!hasPhoneNumbers) {
              console.log(
                "⚠️ Skipping contact without phone numbers:",
                contact.name
              );
              return false;
            }

            return true;
          })
          .map((contact) => {
            try {
              const phoneNumberHashes = contact.phoneNumbers
                ?.map((phone) => {
                  try {
                    // Verwende phone.number als Fallback wenn digits nicht verfügbar ist
                    const phoneNumber = phone.digits || phone.number || "";

                    if (!phoneNumber || phoneNumber.trim().length === 0) {
                      console.log(
                        "⚠️ Empty phone number for contact:",
                        contact.name
                      );
                      return null;
                    }

                    const standardized = standardizePhoneNumber(phoneNumber);
                    const hash = uuid.v5(
                      standardized,
                      PHONE_NUMBER_HASH_NAMESPACE
                    );

                    console.log(
                      `📞 Processed phone for ${contact.name}: ${phoneNumber} -> ${standardized} -> ${hash.substring(0, 8)}...`
                    );

                    return hash;
                  } catch (error) {
                    console.warn(
                      `⚠️ Failed to process phone number for ${contact.name}:`,
                      phone,
                      error
                    );
                    return null;
                  }
                })
                .filter((hash): hash is string => hash !== null);

              const processedContact = {
                id: contact.id,
                name: contact.name || "Unbekannt",
                phoneNumbers: contact.phoneNumbers,
                image: contact.image,
                phoneNumberHashes,
              };

              console.log(
                `✅ Processed contact: ${processedContact.name} with ${phoneNumberHashes?.length || 0} phone hashes`
              );

              return processedContact;
            } catch (error) {
              console.error(
                `❌ Error processing contact ${contact.name}:`,
                error
              );
              return null;
            }
          })
          .filter(
            (contact): contact is NonNullable<typeof contact> =>
              contact !== null
          );

        console.log(
          `✅ Successfully processed ${processedContacts.length} contacts`
        );

        // Log einige Beispiele für Debugging
        if (processedContacts.length > 0) {
          console.log(
            "📋 Sample contacts:",
            processedContacts.slice(0, 3).map((c) => ({
              name: c.name,
              phoneCount: c.phoneNumbers?.length || 0,
              hashCount: c.phoneNumberHashes?.length || 0,
            }))
          );
        }

        return processedContacts;
      } catch (error) {
        console.error("❌ Error loading contacts:", error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 10 * 60 * 1000, // 10 Minuten (früher cacheTime)
  });
}
