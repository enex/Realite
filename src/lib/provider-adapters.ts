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

export type AuthProviderVisibilityOptions = {
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

export type CalendarCapabilityAvailability = "available" | "planned" | "fallback_only";

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

export const CALENDAR_CAPABILITY_DEFINITIONS = [
  {
    id: "availability_context",
    label: "Verfugbarkeit und Timing-Kontext",
    layer: "shared_core",
    description:
      "Realite nutzt verbundene Kalender fuer Free/Busy-Abgleich, Vorschlagskontext und vorsichtigere Priorisierung.",
    fallback:
      "Ohne diese Capability bleibt der Kernflow nutzbar; Vorschlaege laufen dann als Schaetzung ohne Kalenderabgleich weiter.",
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
      "Realite kann bestaetigte Aktivitaeten oder bewusste Kalenderkopien in den verbundenen Kalender zurueckschreiben.",
    fallback:
      "Wenn ein Provider das noch nicht traegt, bleiben Event-Link, Sichtbarkeit und manuelle Planung der gemeinsame Rueckweg.",
    availability: {
      google: "available",
      apple: "planned",
      microsoft: "planned",
    },
  },
  {
    id: "event_import",
    label: "Relevante Kalendertermine nach Realite uebernehmen",
    layer: "shared_core",
    description:
      "Kalendertermine koennen als zusaetzlicher Planungskontext nach Realite gespiegelt werden, ohne den Produktkern zu veraendern.",
    fallback:
      "Fehlt diese Capability, bleibt Realite weiter die Aktivitaets- und Zusagenflaeche; nur externer Kalenderkontext fehlt.",
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
      "Teilnehmerversand ueber den angebundenen Kalender bleibt eine Provider-Capability und keine allgemeine Event-Voraussetzung.",
    fallback:
      "Wenn der Provider das nicht gleichwertig traegt, faellt Realite auf Event-Link, Sichtbarkeit und Join-Mechaniken zurueck.",
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
      "Der Ruecksprung in den Quellkalender bleibt technisch providerabhaengig, weil Web-Links und Deep-Links unterschiedlich funktionieren.",
    fallback:
      "Solange ein Provider dafuer noch keinen sauberen Link liefert, bleibt die Aktivitaet in Realite bearbeitbar und teilbar.",
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

  return calendarAdapterDefinitionsById.get(providerId as CalendarAdapterId) ?? null;
}

export function getRequiredCalendarScopes(providerId: string | null | undefined) {
  return getCalendarAdapterDefinition(providerId)?.requiredScopes ?? [];
}

export function getCalendarCapabilitiesByLayer(
  layer: CalendarCapabilityDefinition["layer"],
) {
  return calendarCapabilityDefinitionsByLayer.get(layer) ?? [];
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

export function getVisibleAuthProviders(
  providers: readonly AuthProviderDefinition[],
  options: AuthProviderVisibilityOptions = {},
) {
  return providers.filter((provider) => {
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
