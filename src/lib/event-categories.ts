/**
 * Event-Kategorien für Kalenderdarstellung (Google-Calendar-Style).
 * Wird für Gruppierung und Farben genutzt; Kategorie kann automatisch erkannt oder vom Ersteller gesetzt werden.
 */

export const EVENT_CATEGORY_VALUES = [
  "default",
  "meeting",
  "work",
  "personal",
  "sport",
  "social",
  "birthday",
  "date",
] as const;

export type EventCategory = (typeof EVENT_CATEGORY_VALUES)[number];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  default: "Sonstiges",
  meeting: "Besprechung",
  work: "Arbeit",
  personal: "Privat",
  sport: "Sport",
  social: "Soziales",
  birthday: "Geburtstag",
  date: "Verabredung",
};

/** Farbe pro Kategorie für linken Rand / Badge (Google-Calendar-ähnlich). */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  default: "#94a3b8", // slate-400
  meeting: "#3b82f6", // blue-500
  work: "#6366f1", // indigo-500
  personal: "#8b5cf6", // violet-500
  sport: "#22c55e", // green-500
  social: "#f59e0b", // amber-500
  birthday: "#ec4899", // pink-500
  date: "#14b8a6", // teal-500
};

/** Keywords (kleingeschrieben) pro Kategorie für die Auto-Erkennung. */
const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  default: [],
  meeting: [
    "meeting",
    "besprechung",
    "call",
    "termin",
    "sync",
    "standup",
    "review",
    "workshop",
    "sprint",
    "planung",
    "kickoff",
    "retro",
    "all-hands",
    "1:1",
    "one-on-one",
  ],
  work: [
    "arbeit",
    "work",
    "office",
    "büro",
    "projekt",
    "deadline",
    "präsentation",
    "konferenz",
    "messe",
    "kongress",
    "congress",
    "networking",
    "business",
    "kunde",
    "client",
    "expo",
    "trade fair",
    "fachmesse",
    "jobmesse",
    "karriere",
    "recruiting",
    "keynote",
    "pitch",
    "seminar",
  ],
  personal: [
    "privat",
    "personal",
    "erledigen",
    "einkauf",
    "arzt",
    "termin",
    "verwaltung",
    "behörde",
    "bank",
  ],
  sport: [
    "sport",
    "training",
    "laufen",
    "joggen",
    "fitness",
    "gym",
    "yoga",
    "schwimmen",
    "rad",
    "radfahren",
    "fußball",
    "klettern",
    "bouldern",
    "boulder",
    "wandern",
    "workout",
  ],
  social: [
    "party",
    "feier",
    "treffen",
    "stammtisch",
    "grillen",
    "bbq",
    "freunde",
    "afterwork",
    "abend",
    "essen",
    "abendessen",
    "mittagessen",
    "frühstück",
    "dinner",
    "lunch",
    "brunch",
    "cafe",
    "bar",
    "konzert",
    "konzerte",
    "concert",
    "konzertbesuch",
    "theater",
    "kino",
    "film",
    "festival",
    "comedy",
    "stand-up",
    "ausstellung",
    "vernissage",
    "lesung",
    "open air",
    "openair",
    "livemusik",
    "live music",
    "gig",
    "club",
    "disko",
    "disco",
  ],
  birthday: ["geburtstag", "birthday", "geburtstagsparty", "geburtstagsfeier"],
  date: ["date", "verabredung", "kennenlernen", "dating", "tinder", "coffee date"],
};

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Erkennt eine passende Kategorie aus Titel, optional Beschreibung und Tags.
 * Gibt "default" zurück, wenn nichts passt.
 */
export function inferEventCategory(input: {
  title: string;
  description?: string | null;
  tags?: string[];
}): EventCategory {
  const combined = [
    input.title,
    input.description ?? "",
    (input.tags ?? []).join(" "),
  ]
    .join(" ")
    .replace(/#[^\s]+/gi, " "); // Hashtags als Wörter behalten, # entfernen
  const normalized = normalizeForMatch(combined);

  if (!normalized) {
    return "default";
  }

  // #date-Tag oder "date" im Titel → Verabredung
  const tagsLower = (input.tags ?? []).map((t) => t.toLowerCase());
  if (tagsLower.some((t) => t === "#date" || t === "date")) {
    return "date";
  }

  type Score = { category: EventCategory; score: number };
  const scores: Score[] = [];

  for (const category of EVENT_CATEGORY_VALUES) {
    if (category === "default") continue;
    const keywords = CATEGORY_KEYWORDS[category];
    let score = 0;
    for (const keyword of keywords) {
      const idx = normalized.indexOf(normalizeForMatch(keyword));
      if (idx !== -1) {
        // Titel-Treffer höher gewichten
        const inTitle = normalizeForMatch(input.title).includes(normalizeForMatch(keyword));
        score += inTitle ? 2 : 1;
      }
    }
    if (score > 0) {
      scores.push({ category, score });
    }
  }

  if (scores.length === 0) return "default";
  scores.sort((a, b) => b.score - a.score);
  return scores[0]!.category;
}
