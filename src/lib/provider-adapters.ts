export type AuthProviderId = "google" | "apple" | "microsoft" | "dev";
export type CalendarAdapterId = "google" | "apple" | "microsoft";

export type AuthProviderDefinition = {
  id: AuthProviderId;
  label: string;
  status: "active" | "dev_only";
  loginStartPath: string | null;
  scopes: string[];
  description: string;
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
  description: "Konto-Login plus optionaler Kalender- und Kontakte-Kontext.",
};

export const APPLE_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "apple",
  label: "Apple",
  status: "active",
  loginStartPath: "/api/auth/signin/apple",
  scopes: ["email", "name"],
  description: "Konto-Login ohne automatische Kalenderfreigabe.",
};

export const MICROSOFT_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "microsoft",
  label: "Microsoft",
  status: "active",
  loginStartPath: "/api/auth/signin/microsoft",
  scopes: ["openid", "profile", "email", "User.Read", "offline_access"],
  description: "Konto-Login fuer Microsoft-/Entra-Konten.",
};

export const DEV_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "dev",
  label: "Dev-Login",
  status: "dev_only",
  loginStartPath: "/api/auth/signin/dev",
  scopes: [],
  description: "Nur lokal fuer Entwicklung, Agents und E2E-Tests.",
};

export const AUTH_PROVIDER_DEFINITIONS = [
  GOOGLE_AUTH_PROVIDER,
  APPLE_AUTH_PROVIDER,
  MICROSOFT_AUTH_PROVIDER,
  DEV_AUTH_PROVIDER,
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

function hasGoogleAuthCredentials() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

function hasAppleAuthCredentials() {
  return Boolean(process.env.APPLE_CLIENT_ID?.trim() && process.env.APPLE_CLIENT_SECRET?.trim());
}

function hasMicrosoftAuthCredentials() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim());
}

export function isDevelopmentAuthMode() {
  return process.env.NODE_ENV !== "production";
}

export function isAuthProviderEnabled(providerId: AuthProviderId) {
  switch (providerId) {
    case "google":
      return hasGoogleAuthCredentials();
    case "apple":
      return hasAppleAuthCredentials();
    case "microsoft":
      return hasMicrosoftAuthCredentials();
    case "dev":
      return isDevelopmentAuthMode();
    default:
      return false;
  }
}

export function getAvailableAuthProviders() {
  return AUTH_PROVIDER_DEFINITIONS.filter((definition) => isAuthProviderEnabled(definition.id));
}

export function getPrimaryAuthProvider() {
  return getAvailableAuthProviders()[0] ?? null;
}

export function buildAuthStartPath(
  providerId: AuthProviderId,
  callbackUrl?: string | null,
) {
  const provider = AUTH_PROVIDER_DEFINITIONS.find((definition) => definition.id === providerId);
  if (!provider?.loginStartPath) {
    return null;
  }

  if (!callbackUrl) {
    return provider.loginStartPath;
  }

  return `${provider.loginStartPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function buildLoginPath(callbackUrl?: string | null) {
  if (!callbackUrl) {
    return "/login";
  }

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
