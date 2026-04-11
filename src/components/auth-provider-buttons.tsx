"use client";

import { MICROSOFT_AUTH_FLAG } from "@/src/lib/auth-provider-flags";
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";
import {
  buildAuthStartPath,
  getVisibleAuthProviders,
  type AuthProviderDefinition,
} from "@/src/lib/provider-adapters";

type AuthProviderButtonsProps = {
  callbackUrl: string;
  providers: readonly AuthProviderDefinition[];
};

function ProviderIcon({ providerId }: { providerId: AuthProviderDefinition["id"] }) {
  if (providerId === "google") {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.7h5.39a4.61 4.61 0 0 1-2 3.03v2.52h3.23c1.89-1.75 2.98-4.32 2.98-7.29Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.45l-3.23-2.52c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.75-5.58-4.1H3.08v2.58A9.99 9.99 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.42 13.88A5.99 5.99 0 0 1 6.1 12c0-.65.11-1.28.32-1.88V7.54H3.08A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.08 4.46l3.34-2.58Z" />
          <path fill="#EA4335" d="M12 6.02c1.47 0 2.8.5 3.84 1.49l2.88-2.88C16.95 2.98 14.7 2 12 2A9.99 9.99 0 0 0 3.08 7.54l3.34 2.58c.78-2.35 2.98-4.1 5.58-4.1Z" />
        </svg>
      </span>
    );
  }

  if (providerId === "apple") {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
          <path d="M16.37 12.2c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.03-.99 2.04-.6.87-1.22 1.73-2.2 1.75-.96.02-1.27-.57-2.37-.57-1.11 0-1.45.55-2.35.59-.95.03-1.67-.95-2.28-1.82-1.24-1.79-2.19-5.05-.92-7.26.63-1.1 1.76-1.8 2.99-1.82.93-.02 1.82.63 2.37.63.55 0 1.58-.78 2.66-.67.45.02 1.72.18 2.53 1.36-.07.04-1.51.88-1.49 2.91Zm-1.88-5.58c.5-.61.84-1.46.75-2.3-.72.03-1.59.48-2.11 1.08-.46.53-.87 1.39-.76 2.21.8.06 1.62-.4 2.12-.99Z" />
        </svg>
      </span>
    );
  }

  if (providerId === "microsoft") {
    return (
      <span className="grid h-11 w-11 grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <span className="rounded-sm bg-[#f25022]" />
        <span className="rounded-sm bg-[#7fba00]" />
        <span className="rounded-sm bg-[#00a4ef]" />
        <span className="rounded-sm bg-[#ffb900]" />
      </span>
    );
  }

  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M7 7h10v10H7z" />
        <path d="M9.5 9.5h5v5h-5z" />
      </svg>
    </span>
  );
}

export function AuthProviderButtons({ callbackUrl, providers }: AuthProviderButtonsProps) {
  const microsoftEnabled = useRealiteFeatureFlag(MICROSOFT_AUTH_FLAG, false);
  const visibleProviders = getVisibleAuthProviders(providers, {
    microsoftEnabled,
  });

  if (visibleProviders.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        Aktuell ist kein freigeschalteter Login-Provider sichtbar.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleProviders.map((provider) => (
        <a
          key={provider.id}
          href={buildAuthStartPath(provider.id, callbackUrl) ?? "/login"}
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/60"
        >
          <ProviderIcon providerId={provider.id} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Weiter mit {provider.label}</p>
              {provider.status === "dev_only" ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                  Dev
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{provider.description}</p>
          </div>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-teal-700 dark:group-hover:text-teal-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </a>
      ))}
    </div>
  );
}
