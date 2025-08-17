import orpc from "@/client/orpc";
import { useQuery } from "@tanstack/react-query";
import useAllContacts from "./useAllContacts";

/**
 * Get the contact for a given id
 * @param id The id of the contact
 * @returns The contact
 */
export function useContactById(id: string) {
  const me = useQuery(orpc.auth.me.queryOptions());
  const creatorQuery = useQuery(orpc.user.get.queryOptions({ id }));
  //TODO: get data from the contacts

  const all = useAllContacts();
  const contact = all.data?.find((contact) =>
    contact.phoneNumberHashes?.some(
      (hash) => hash === creatorQuery.data?.phoneNumberHash
    )
  );
  if (contact) return contact;
  if (me.data?.id === id) return me.data;
  return creatorQuery.data;
}

/**
 * Get the contact for a given phone hash
 * @param phoneHash The phone hash of the contact
 * @returns The contact
 */
export function useContactByPhoneHash(phoneHash: string) {
  const all = useAllContacts();
  const contact = all.data?.find((contact) =>
    contact.phoneNumberHashes?.includes(phoneHash)
  );
  const contactQuery = api.user.get.useQuery(
    { phoneNumberHash: phoneHash },
    { enabled: !!contact }
  );
  // TODO: merge with data from contacts
  return contact ?? contactQuery.data;
}
