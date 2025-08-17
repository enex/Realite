import { standardizePhoneNumber } from "@/shared/validation/phone";
import * as Contacts from "expo-contacts";
import { useCallback, useEffect, useState } from "react";

interface CreatorContact {
  name?: string;
  phoneNumbers?: Contacts.PhoneNumber[];
  image?: string;
  contactId?: string;
}

export const useCreatorContact = (creatorId: string) => {
  const [contact, setContact] = useState<CreatorContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContact = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Berechtigungen prüfen
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== Contacts.PermissionStatus.GRANTED) {
        throw new Error("Keine Berechtigung für Kontaktzugriff");
      }

      // Alle Kontakte laden
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
          Contacts.Fields.Name,
        ],
      });

      // Kontakt mit passender ID finden
      const matchingContact = data.find((contact) =>
        contact.phoneNumbers?.some(
          (phone) =>
            phone.number &&
            standardizePhoneNumber(phone.number) ===
              standardizePhoneNumber(creatorId)
        )
      );

      if (matchingContact) {
        setContact({
          name: matchingContact.name,
          phoneNumbers: matchingContact.phoneNumbers,
          image: matchingContact.image?.uri,
          contactId: matchingContact.id,
        });
      } else {
        setContact(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unbekannter Fehler"));
    } finally {
      setIsLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    void fetchContact();
  }, [fetchContact]);

  return {
    contact,
    isLoading,
    error,
    refetch: fetchContact,
  };
};
