---
name: posthog-feature-flags
description: Anlegen und Verwalten von PostHog Feature Flags im Realite-Projekt. Nutzen wenn Feature Flags erstellt, gelöscht oder im Code eingebunden werden sollen, oder wenn PostHog-MCP-Tools verwendet werden.
---

# PostHog Feature Flags (Realite)

## Wann anwenden

- Neuen Feature-Flag anlegen oder bestehende verwalten
- Flag im Frontend einbinden (React/Next.js)
- PostHog-MCP nutzen (create/delete/list feature flags)

## Flag anlegen (PostHog MCP)

Tool: `user-posthog` → `create-feature-flag`

**Pflichtparameter:**

```json
{
  "key": "kebab-case-key",
  "name": "Anzeigename",
  "description": "Kurze Beschreibung der Funktion.",
  "filters": {
    "groups": [
      {
        "rollout_percentage": 100,
        "properties": []
      }
    ]
  },
  "active": true
}
```

- `key`: Eindeutiger Key, im Code verwendet (z. B. `smart-meetings`). Kebab-case.
- `filters.groups`: Mindestens eine Gruppe. `rollout_percentage: 100` = für alle; für Targeting `properties` befüllen.
- Weitere Gruppen = weitere Zielgruppen (OR-Verknüpfung).

## Flag löschen (PostHog MCP)

Tool: `user-posthog` → `delete-feature-flag`

```json
{ "flagKey": "key-des-flags" }
```

Parameter ist `flagKey` (String), nicht die numerische ID.

## Flags auflisten (PostHog MCP)

Tool: `user-posthog` → `feature-flag-get-all`

Argument: `{}` – liefert alle Feature Flags des aktuellen PostHog-Projekts.

## Flag im Code verwenden

**Quelle:** `src/lib/posthog/feature-flags.ts` (PostHog React Hooks).

- **Ein/Aus:** `useRealiteFeatureFlag(flagKey, fallback?)`  
  - `flagKey`: Key wie in PostHog.  
  - `fallback`: Optional, Default `false`; wird genutzt bis PostHog geladen hat.
- **Varianten (A/B):** `useRealiteFeatureVariant(flagKey)`  
  - Gibt Varianten-Key oder `null` zurück.

**Beispiel:**

```tsx
import { useRealiteFeatureFlag } from "@/src/lib/posthog/feature-flags";

// In einer Client Component:
const smartMeetingsEnabled = useRealiteFeatureFlag("smart-meetings", true);
// Nutzung: {smartMeetingsEnabled && <SmartMeetingsSection />}
```

Hooks nur in Client Components („use client“) oder in anderen Client-Hooks verwenden.

## Ablauf: Neuer Flag

1. Flag in PostHog anlegen: MCP `create-feature-flag` mit key, name, description, filters, active.
2. Im Code: `useRealiteFeatureFlag("dein-key", fallback)` bzw. `useRealiteFeatureVariant("dein-key")` aus `@/src/lib/posthog/feature-flags` importieren und UI bedingt rendern.
3. Optional: Nutzer-Doku in `content/docs/*.md` anpassen, wenn sich sichtbares Verhalten ändert (laut AGENTS.md).

## Aktuell genutzte Flags

| Key              | Verwendung                          |
|------------------|-------------------------------------|
| `smart-meetings` | Dashboard: Smart-Meetings-Bereich   |

Weitere Flags sind in PostHog angelegt und können jederzeit im Code mit dem gleichen Hook unter dem jeweiligen Key genutzt werden.
