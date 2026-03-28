"use client";

import {
  type CalendarCapabilityAvailability,
  type CalendarCapabilityDefinition,
  type CalendarAdapterId,
  getCalendarCapabilitiesByLayer,
} from "@/src/lib/provider-adapters";

const PROVIDER_LABELS: Record<CalendarAdapterId, string> = {
  google: "Google",
  apple: "Apple",
  microsoft: "Microsoft",
};

const AVAILABILITY_STYLES: Record<
  CalendarCapabilityAvailability,
  { label: string; className: string }
> = {
  available: {
    label: "Verfuegbar",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  planned: {
    label: "Geplant",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  fallback_only: {
    label: "Fallback",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const SECTION_COPY: Record<
  CalendarCapabilityDefinition["layer"],
  { title: string; description: string }
> = {
  shared_core: {
    title: "Gemeinsamer Kalender-Kern",
    description:
      "Diese Faehigkeiten sollen fuer alle Kalenderadapter gleich gedacht bleiben. Unterschiede duerfen nur in der technischen Verfuegbarkeit liegen.",
  },
  provider_extra: {
    title: "Provider-spezifische Extras",
    description:
      "Diese Pfade koennen sich je Provider unterscheiden und duerfen nie den Realite-Kernflow blockieren.",
  },
};

const SUMMARY_ITEMS = [
  {
    title: "Gemeinsamer Kern",
    description:
      "Verfuegbarkeitsabgleich, Kalenderkopien und Import bleiben dieselben Produktpfade, auch wenn sie technisch je Provider unterschiedlich weit sind.",
  },
  {
    title: "Provider-Extras",
    description:
      "Einladungsversand und Bearbeiten-im-Kalender-Links duerfen abweichen. Wenn sie fehlen, faellt Realite auf Links, Sichtbarkeit und Join-Flow zurueck.",
  },
] as const;

function CapabilityRow({ capability }: { capability: CalendarCapabilityDefinition }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-900">{capability.label}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">{capability.description}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{capability.fallback}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          Object.entries(capability.availability) as Array<
            [CalendarAdapterId, CalendarCapabilityAvailability]
          >
        ).map(([providerId, availability]) => {
          const style = AVAILABILITY_STYLES[availability];
          return (
            <span
              key={`${capability.id}-${providerId}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${style.className}`}
            >
              <span>{PROVIDER_LABELS[providerId]}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>{style.label}</span>
            </span>
          );
        })}
      </div>
    </article>
  );
}

export function ProviderCapabilityCard() {
  const sharedCore = getCalendarCapabilitiesByLayer("shared_core");
  const providerExtras = getCalendarCapabilitiesByLayer("provider_extra");

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Kalender-Kern und Provider-Pfade</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Realite trennt hier bewusst zwischen gemeinsamem Produktkern und technischen Provider-Unterschieden. So bleibt
        klar, welche Kalenderfunktionen spaeter fuer Apple und Microsoft anschliessen sollen und wo Realite im Zweifel
        immer auf den Link-, Sichtbarkeits- und Join-Flow zurueckfaellt.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {SUMMARY_ITEMS.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">{item.description}</p>
          </article>
        ))}
      </div>

      {[sharedCore, providerExtras].map((sectionCapabilities) => {
        const layer = sectionCapabilities[0]?.layer;
        if (!layer) {
          return null;
        }

        const section = SECTION_COPY[layer];

        return (
          <div key={layer} className="mt-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p>
            </div>
            <div className="grid gap-3">
              {sectionCapabilities.map((capability) => (
                <CapabilityRow key={capability.id} capability={capability} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
