export const PUBLIC_MEMBER_FALLBACK_LABEL = "Realite Mitglied";

export function getPersonDisplayLabel(input: {
  name?: string | null;
  email?: string | null;
  allowEmail?: boolean;
  fallbackLabel?: string;
}) {
  const name = input.name?.trim();
  if (name) {
    return name;
  }

  const email = input.email?.trim();
  if (input.allowEmail !== false && email) {
    return email;
  }

  return input.fallbackLabel ?? PUBLIC_MEMBER_FALLBACK_LABEL;
}
