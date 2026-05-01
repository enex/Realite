/**
 * Display name the better-auth anonymous plugin assigns on first sign-in.
 * Must stay in sync with `generateName` in `src/lib/auth.ts`.
 */
export const ANONYMOUS_SESSION_DISPLAY_NAME = "Gast";

/**
 * When linking the auth session to the app `users` row, the session often
 * still carries the anonymous placeholder name even after the user saved a
 * real name in Realite. Never clobber a stored real name with that placeholder.
 */
export function resolveSyncedAppUserName(
  sessionName: string | null | undefined,
  existingName: string | null | undefined,
): string | null {
  if (sessionName === undefined || sessionName === null) {
    return existingName ?? null;
  }
  const trimmedSession = sessionName.trim();
  if (trimmedSession === "") {
    return existingName ?? null;
  }
  const existingTrimmed = existingName?.trim() ?? "";
  if (
    trimmedSession === ANONYMOUS_SESSION_DISPLAY_NAME &&
    existingTrimmed.length > 0 &&
    existingTrimmed !== ANONYMOUS_SESSION_DISPLAY_NAME
  ) {
    return existingTrimmed;
  }
  return trimmedSession;
}
