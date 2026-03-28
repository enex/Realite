export type AuthProviderId = "google" | "apple" | "email";
export type CalendarAdapterId = "google" | "apple" | "microsoft";

export type AuthProviderDefinition = {
  id: AuthProviderId;
  label: string;
  status: "active" | "planned";
  loginStartPath: string | null;
  scopes: string[];
};

export type CalendarAdapterDefinition = {
  id: CalendarAdapterId;
  label: string;
  status: "active" | "planned";
  requiredScopes: string[];
  capabilities: {
    readAvailability: boolean;
    writeEvents: boolean;
    importEvents: boolean;
    watchChanges: boolean;
  };
};

export const GOOGLE_CALENDAR_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
] as const;

export const GOOGLE_CONTACTS_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/contacts.readonly",
] as const;

export const GOOGLE_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "google",
  label: "Google",
  status: "active",
  loginStartPath: "/api/auth/signin/google",
  scopes: [
    "openid",
    "email",
    "profile",
    ...GOOGLE_CALENDAR_REQUIRED_SCOPES,
    ...GOOGLE_CONTACTS_REQUIRED_SCOPES,
  ],
};

export const AUTH_PROVIDER_DEFINITIONS = [
  GOOGLE_AUTH_PROVIDER,
  {
    id: "apple",
    label: "Apple",
    status: "planned",
    loginStartPath: null,
    scopes: [],
  },
  {
    id: "email",
    label: "E-Mail",
    status: "planned",
    loginStartPath: null,
    scopes: [],
  },
] as const satisfies readonly AuthProviderDefinition[];

export const CALENDAR_ADAPTER_DEFINITIONS = [
  {
    id: "google",
    label: "Google Kalender",
    status: "active",
    requiredScopes: [...GOOGLE_CALENDAR_REQUIRED_SCOPES],
    capabilities: {
      readAvailability: true,
      writeEvents: true,
      importEvents: true,
      watchChanges: true,
    },
  },
  {
    id: "apple",
    label: "Apple Kalender",
    status: "planned",
    requiredScopes: [],
    capabilities: {
      readAvailability: false,
      writeEvents: false,
      importEvents: false,
      watchChanges: false,
    },
  },
  {
    id: "microsoft",
    label: "Microsoft Kalender",
    status: "planned",
    requiredScopes: [],
    capabilities: {
      readAvailability: false,
      writeEvents: false,
      importEvents: false,
      watchChanges: false,
    },
  },
] as const satisfies readonly CalendarAdapterDefinition[];

const calendarAdapterDefinitionsById = new Map(
  CALENDAR_ADAPTER_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getCalendarAdapterDefinition(
  providerId: string | null | undefined,
) {
  if (!providerId) {
    return null;
  }

  return calendarAdapterDefinitionsById.get(providerId as CalendarAdapterId) ?? null;
}

export function getRequiredCalendarScopes(providerId: string | null | undefined) {
  return getCalendarAdapterDefinition(providerId)?.requiredScopes ?? [];
}

export function hasRequiredCalendarScopes(
  scope: string | null | undefined,
  providerId: string | null | undefined,
) {
  const requiredScopes = getRequiredCalendarScopes(providerId);
  if (!requiredScopes.length || !scope) {
    return false;
  }

  const grantedScopes = new Set(
    scope
      .split(/\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return requiredScopes.every((requiredScope) => grantedScopes.has(requiredScope));
}
