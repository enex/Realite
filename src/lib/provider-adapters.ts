export type AuthProviderId =
  | "anonymous"
  | "google"
  | "apple"
  | "microsoft"
  | "dev";
export type CalendarAdapterId = "google" | "apple" | "microsoft";

export type AuthProviderDefinition = {
  id: AuthProviderId;
  label: string;
  status: "active" | "dev_only";
  loginStartPath: string | null;
  scopes: string[];
  description: string;
  ctaLabel?: string;
};

export type AuthProviderVisibilityOptions = {
  anonymousEnabled?: boolean;
  microsoftEnabled?: boolean;
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

export type CalendarCapabilityAvailability =
  | "available"
  | "planned"
  | "fallback_only";

export type CalendarCapabilityDefinition = {
  id:
    | "availability_context"
    | "calendar_copies"
    | "event_import"
    | "calendar_invites"
    | "calendar_edit_links";
  label: string;
  layer: "shared_core" | "provider_extra";
  description: string;
  fallback: string;
  availability: Record<CalendarAdapterId, CalendarCapabilityAvailability>;
};

export const GOOGLE_CALENDAR_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
] as const;

export const GOOGLE_CONTACTS_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/contacts.readonly",
] as const;

/**
 * Minimale Login-Scopes: nur Konto-Basis (Name, E-Mail, Profilbild).
 * Kalender- und Kontakte-Berechtigungen werden separat über /api/auth/connect/google
 * angefragt, wenn der Nutzer sie aktiv nutzen möchte.
 */
export const GOOGLE_LOGIN_SCOPES = ["openid", "email", "profile"] as const;

/** Basis-Pfad für den inkrementellen Berechtigungs-Connect. */
export const GOOGLE_CONNECT_BASE_PATH = "/api/auth/connect/google";

export const GOOGLE_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "google",
  label: "Google",
  status: "active",
  loginStartPath: "/api/auth/signin/google",
  scopes: [...GOOGLE_LOGIN_SCOPES],
  description:
    "Konto-Login mit E-Mail, Name und Profilbild. Kalender und Kontakte verbindest du danach optional.",
};

export const ANONYMOUS_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "anonymous",
  label: "Gastzugang",
  status: "active",
  loginStartPath: "/api/auth/signin/anonymous",
  scopes: [],
  description: "Sofort testen ohne Google, Kalender oder dauerhaftes Konto.",
  ctaLabel: "Ohne Konto starten",
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
  description: "Konto-Login für Microsoft-/Entra-Konten.",
};

export const DEV_AUTH_PROVIDER: AuthProviderDefinition = {
  id: "dev",
  label: "Dev-Login",
  status: "dev_only",
  loginStartPath: "/api/auth/signin/dev",
  scopes: [],
  description: "Nur lokal für Entwicklung, Agents und E2E-Tests.",
};

export const AUTH_PROVIDER_DEFINITIONS = [
  ANONYMOUS_AUTH_PROVIDER,
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

export const CALENDAR_CAPABILITY_DEFINITIONS = [
  {
    id: "availability_context",
    label: "Verfügbarkeit und Timing-Kontext",
    layer: "shared_core",
    description:
      "Realite nutzt verbundene Kalender für Free/Busy-Abgleich, Vorschlagskontext und vorsichtigere Priorisierung.",
    fallback:
      "Ohne diese Capability bleibt der Kernflow nutzbar; Vorschläge laufen dann als Schätzung ohne Kalenderabgleich weiter.",
    availability: {
      google: "available",
      apple: "planned",
      microsoft: "planned",
    },
  },
  {
    id: "calendar_copies",
    label: "Realite-Events in deinen Kalender schreiben",
    layer: "shared_core",
    description:
      "Realite kann bestätigte Aktivitäten oder bewusste Kalenderkopien in den verbundenen Kalender zurückschreiben.",
    fallback:
      "Wenn ein Provider das noch nicht trägt, bleiben Event-Link, Sichtbarkeit und manuelle Planung der gemeinsame Rückweg.",
    availability: {
      google: "available",
      apple: "planned",
      microsoft: "planned",
    },
  },
  {
    id: "event_import",
    label: "Relevante Kalendertermine nach Realite übernehmen",
    layer: "shared_core",
    description:
      "Kalendertermine können als zusätzlicher Planungskontext nach Realite gespiegelt werden, ohne den Produktkern zu verändern.",
    fallback:
      "Fehlt diese Capability, bleibt Realite weiter die Aktivitäts- und Zusagenfläche; nur externer Kalenderkontext fehlt.",
    availability: {
      google: "available",
      apple: "planned",
      microsoft: "planned",
    },
  },
  {
    id: "calendar_invites",
    label: "Kalendereinladungen und Teilnehmerpflege",
    layer: "provider_extra",
    description:
      "Teilnehmerversand über den angebundenen Kalender bleibt eine Provider-Capability und keine allgemeine Event-Voraussetzung.",
    fallback:
      "Wenn der Provider das nicht gleichwertig trägt, fällt Realite auf Event-Link, Sichtbarkeit und Join-Mechaniken zurück.",
    availability: {
      google: "available",
      apple: "fallback_only",
      microsoft: "planned",
    },
  },
  {
    id: "calendar_edit_links",
    label: "Direkte Bearbeiten-im-Kalender-Links",
    layer: "provider_extra",
    description:
      "Der Rücksprung in den Quellkalender bleibt technisch providerabhängig, weil Web-Links und Deep-Links unterschiedlich funktionieren.",
    fallback:
      "Solange ein Provider dafür noch keinen sauberen Link liefert, bleibt die Aktivität in Realite bearbeitbar und teilbar.",
    availability: {
      google: "available",
      apple: "planned",
      microsoft: "planned",
    },
  },
] as const satisfies readonly CalendarCapabilityDefinition[];

const calendarAdapterDefinitionsById = new Map(
  CALENDAR_ADAPTER_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const calendarCapabilityDefinitionsByLayer = new Map<
  CalendarCapabilityDefinition["layer"],
  CalendarCapabilityDefinition[]
>([
  ["shared_core", []],
  ["provider_extra", []],
]);

for (const definition of CALENDAR_CAPABILITY_DEFINITIONS) {
  const existing = calendarCapabilityDefinitionsByLayer.get(definition.layer);
  if (existing) {
    existing.push(definition);
  }
}

export function getCalendarAdapterDefinition(
  providerId: string | null | undefined,
) {
  if (!providerId) {
    return null;
  }

  return (
    calendarAdapterDefinitionsById.get(providerId as CalendarAdapterId) ?? null
  );
}

export function getRequiredCalendarScopes(
  providerId: string | null | undefined,
) {
  return getCalendarAdapterDefinition(providerId)?.requiredScopes ?? [];
}

export function getCalendarCapabilitiesByLayer(
  layer: CalendarCapabilityDefinition["layer"],
) {
  return calendarCapabilityDefinitionsByLayer.get(layer) ?? [];
}

export function hasRequiredContactsScopes(scope: string | null | undefined) {
  if (!scope) {
    return false;
  }

  const grantedScopes = new Set(
    scope
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return GOOGLE_CONTACTS_REQUIRED_SCOPES.every((requiredScope) =>
    grantedScopes.has(requiredScope),
  );
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
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return requiredScopes.every((requiredScope) =>
    grantedScopes.has(requiredScope),
  );
}

function hasGoogleAuthCredentials() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function hasAppleAuthCredentials() {
  return Boolean(
    process.env.APPLE_CLIENT_ID?.trim() &&
    process.env.APPLE_CLIENT_SECRET?.trim(),
  );
}

function hasMicrosoftAuthCredentials() {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() &&
    process.env.MICROSOFT_CLIENT_SECRET?.trim(),
  );
}

export function isDevelopmentAuthMode() {
  return process.env.NODE_ENV !== "production";
}

export function isAuthProviderEnabled(providerId: AuthProviderId) {
  switch (providerId) {
    case "anonymous":
      return true;
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
  return AUTH_PROVIDER_DEFINITIONS.filter((definition) =>
    isAuthProviderEnabled(definition.id),
  );
}

export function getVisibleAuthProviders(
  providers: readonly AuthProviderDefinition[],
  options: AuthProviderVisibilityOptions = {},
) {
  return providers.filter((provider) => {
    if (provider.id === "anonymous") {
      return options.anonymousEnabled ?? true;
    }

    if (provider.id === "microsoft") {
      return options.microsoftEnabled ?? false;
    }

    return true;
  });
}

export function getPrimaryAuthProvider() {
  return getAvailableAuthProviders()[0] ?? null;
}

export function buildAuthStartPath(
  providerId: AuthProviderId,
  callbackUrl?: string | null,
  oauthQuery?: string | null,
) {
  const provider = AUTH_PROVIDER_DEFINITIONS.find(
    (definition) => definition.id === providerId,
  );
  if (!provider?.loginStartPath) {
    return null;
  }

  const params = new URLSearchParams();
  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }
  if (oauthQuery) {
    params.set("oauthQuery", oauthQuery);
  }

  const qs = params.toString();
  return qs ? `${provider.loginStartPath}?${qs}` : provider.loginStartPath;
}

export function buildLoginPath(callbackUrl?: string | null) {
  if (!callbackUrl) {
    return "/login";
  }

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
