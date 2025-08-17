import * as uuid from "uuid";
import { z } from "zod";

import type { CategoryId, Where } from "@realite/validators";

import { saveEventWithAnalytics } from "../events";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Instagram URL patterns
const INSTAGRAM_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)/,
  /https?:\/\/(?:www\.)?instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
  /https?:\/\/(?:www\.)?instagram\.com\/stories\/([A-Za-z0-9_.-]+)\/([0-9]+)/,
];

export interface InstagramMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  hashtags?: string[];
  mentions?: string[];
}

// Category detection based on hashtags and content
const CATEGORY_KEYWORDS = {
  OUTDOOR: [
    "outdoor",
    "draußen",
    "wandern",
    "hiking",
    "spazieren",
    "walking",
    "park",
    "natur",
    "nature",
    "fahrrad",
    "cycling",
    "radfahren",
  ],
  FOOD_DRINK: [
    "food",
    "essen",
    "restaurant",
    "café",
    "cafe",
    "bar",
    "trinken",
    "drinks",
    "dinner",
    "lunch",
    "breakfast",
    "brunch",
  ],
  CULTURE: [
    "museum",
    "kino",
    "cinema",
    "veranstaltung",
    "event",
    "kunst",
    "art",
    "kultur",
    "culture",
    "ausstellung",
    "exhibition",
  ],
  MUSIC_DANCE: [
    "musik",
    "music",
    "tanzen",
    "dancing",
    "club",
    "party",
    "feiern",
    "celebration",
    "tanzkurs",
    "dance",
  ],
  MARKETS_FESTIVALS: [
    "markt",
    "market",
    "wochenmarkt",
    "fest",
    "festival",
    "stadtfest",
    "feier",
    "celebration",
  ],
  SPORTS: [
    "sport",
    "fitness",
    "gym",
    "workout",
    "training",
    "laufen",
    "joggen",
    "running",
    "fußball",
    "soccer",
    "volleyball",
    "basketball",
    "tennis",
    "badminton",
    "kampfsport",
    "boxing",
    "karate",
    "judo",
    "klettern",
    "climbing",
    "schwimmen",
    "swimming",
    "yoga",
    "pilates",
    "wellness",
    "spa",
  ],
  FUN_GAMES: [
    "bowling",
    "darts",
    "spiele",
    "games",
    "brettspiele",
    "boardgames",
    "gaming",
    "videogames",
    "billard",
    "pool",
    "karaoke",
    "spaß",
    "fun",
  ],
  OTHER: ["andere", "other", "sonstiges", "verschiedenes", "misc"],
} as const;

const instagramShareInputSchema = z.object({
  url: z.string().url(),
  content: z.string().optional(),
  platform: z
    .enum(["instagram", "instagram_story", "instagram_reel", "generic"]) // allow generic
    .optional(),
});

export const instagramShareRouter = createTRPCRouter({
  processShare: protectedProcedure
    .input(instagramShareInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      const url = input.url;
      const platform = input.platform;
      const isInstagram =
        platform === "instagram" ||
        platform === "instagram_story" ||
        platform === "instagram_reel" ||
        INSTAGRAM_URL_PATTERNS.some((pattern) => pattern.test(url));

      let extractedData: InstagramMetadata | GenericMetadata;
      if (isInstagram) {
        extractedData = extractInstagramMetadata(input.content ?? "", url);
      } else {
        extractedData = await extractGenericUrlMetadata(url);
      }

      const shareEventId = uuid.v7();
      await saveEventWithAnalytics(ctx.db, {
        type: "instagram-share-received",
        actorId: userId,
        subject: shareEventId,
        data: {
          originalUrl: url,
          extractedData,
          rawContent: input.content ?? "",
          platform: (isInstagram ? (platform ?? "instagram") : "generic") as
            | "instagram"
            | "instagram_story"
            | "instagram_reel"
            | "generic"
            | "whatsapp"
            | "other",
        },
      });

      const autoDetectedCategory = detectCategory({
        title: extractedData.title,
        description: extractedData.description,
        hashtags: (extractedData as InstagramMetadata).hashtags,
        location: extractedData.location,
      } as InstagramMetadata);

      const extractedLocation = extractLocation({
        title: extractedData.title,
        description: extractedData.description,
        location: extractedData.location,
      } as InstagramMetadata);

      const realiteId = uuid.v7();
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-created",
        actorId: userId,
        subject: realiteId,
        data: {
          what: {
            category: autoDetectedCategory,
            title: extractedData.title ?? "Event",
            description: extractedData.description ?? input.content ?? "",
            url,
          },
          when: (extractedData as GenericMetadata).when
            ? (extractedData as GenericMetadata).when!
            : [],
          where: extractedLocation ? [extractedLocation] : [],
          who: { explicit: {}, anyone: null, contacts: true },
        },
      });

      await saveEventWithAnalytics(ctx.db, {
        type: "instagram-share-processed",
        actorId: userId,
        subject: shareEventId,
        data: {
          originalShareEventId: shareEventId,
          realiteId,
          autoDetectedCategory,
          extractedLocation,
          suggestedTimeSlots: [],
        },
      });

      return {
        realiteId,
        extractedData,
        autoDetectedCategory,
        extractedLocation,
      };
    }),

  // Get processing suggestions for a shared Instagram post
  getSuggestions: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        url: z.string().url(),
      }),
    )
    .query(({ input }) => {
      const extractedData = extractInstagramMetadata(input.content, input.url);
      const autoDetectedCategory = detectCategory(extractedData);
      const extractedLocation = extractLocation(extractedData);

      return {
        extractedData,
        autoDetectedCategory,
        extractedLocation,
        suggestions: {
          title: generateTitleSuggestions(extractedData),
          categories: getCategorySuggestions(extractedData),
          locations: getLocationSuggestions(extractedData),
        },
      };
    }),
});

// Generic metadata interface for arbitrary URLs
export interface GenericMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  location?: { name: string; latitude?: number; longitude?: number };
  when?: { start: string; end: string }[];
}

// Minimal OG/LD+JSON extractor for generic URLs (server-side fetch)
async function extractGenericUrlMetadata(
  url: string,
): Promise<GenericMetadata> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "RealiteBot/1.0" },
    });
    const html = await response.text();
    return parseHtmlForMetadata(html);
  } catch {
    return {};
  }
}

// Very lightweight HTML parsing without external deps
function parseHtmlForMetadata(html: string): GenericMetadata {
  const getMeta = (property: string) => {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const match = regex.exec(html);
    return match?.[1];
  };

  const titleMatch = /<title>([^<]+)<\/title>/i.exec(html);
  const title = getMeta("og:title") || titleMatch?.[1] || undefined;
  const description =
    getMeta("og:description") || getMeta("description") || undefined;
  const imageUrl = getMeta("og:image") || undefined;

  // Try JSON-LD event schema
  const ldJsonMatches =
    html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) || [];
  let when: { start: string; end: string }[] | undefined;
  let locationName: string | undefined;
  for (const script of ldJsonMatches) {
    const contentMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(script);
    if (!contentMatch?.[1]) continue;
    try {
      const data: unknown = JSON.parse(contentMatch[1]);
      const items: unknown[] = Array.isArray(data) ? data : [data];
      for (const raw of items) {
        const item = raw as Record<string, unknown>;
        const type = item["@type"] as string | string[] | undefined;
        const isEvent = Array.isArray(type)
          ? type.includes("Event")
          : type === "Event";
        if (isEvent) {
          const start = (item as { startDate?: string }).startDate;
          const end =
            (item as { endDate?: string }).endDate ?? start ?? undefined;
          if (start) {
            const endIso = end
              ? new Date(end).toISOString()
              : new Date(start).toISOString();
            when = [{ start: new Date(start).toISOString(), end: endIso }];
          }
          const loc = (
            item as {
              location?: {
                name?: string;
                address?: { name?: string; streetAddress?: string };
              };
            }
          ).location as
            | {
                name?: string;
                address?: { name?: string; streetAddress?: string };
              }
            | undefined;
          if (loc && typeof loc === "object") {
            locationName =
              loc.name || loc.address?.name || loc.address?.streetAddress;
          }
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  const metadata: GenericMetadata = { title, description, imageUrl };
  if (locationName) metadata.location = { name: locationName };
  if (when) metadata.when = when;
  return metadata;
}

function extractInstagramMetadata(
  content: string,
  _url: string,
): InstagramMetadata {
  const metadata: InstagramMetadata = {};

  // Extract hashtags
  const hashtagMatches = content.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g);
  if (hashtagMatches) {
    metadata.hashtags = hashtagMatches.map((tag) => tag.slice(1).toLowerCase());
  }

  // Extract mentions
  const mentionMatches = content.match(/@[\w.]+/g);
  if (mentionMatches) {
    metadata.mentions = mentionMatches.map((mention) => mention.slice(1));
  }

  // Extract potential title (first line or sentence)
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length > 0 && lines[0]) {
    metadata.title = lines[0].slice(0, 100); // Limit title length
  }

  // Use full content as description
  metadata.description = content;

  // Try to extract location from content
  const locationMatch = /(?:@|bei|at|in)\s+([A-Za-z\s,.-]+?)(?:\s|$|#|@)/i.exec(
    content,
  );
  if (locationMatch?.[1]) {
    metadata.location = {
      name: locationMatch[1].trim(),
    };
  }

  return metadata;
}

function detectCategory(metadata: InstagramMetadata): CategoryId {
  const content = (metadata.description || "").toLowerCase();
  const hashtags = metadata.hashtags || [];
  const allText = content + " " + hashtags.join(" ");

  // Check each category for keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const hasMatch = keywords.some((keyword) =>
      allText.includes(keyword.toLowerCase()),
    );
    if (hasMatch) {
      return category;
    }
  }

  // Default to OTHER if no specific category detected
  return "OTHER";
}

function extractLocation(metadata: InstagramMetadata): Where | undefined {
  if (!metadata.location?.name) return undefined;

  return {
    id: uuid.v7(),
    name: metadata.location.name,
    address: metadata.location.name, // Fallback to name
    latitude: metadata.location.latitude ?? 0, // Will need geocoding
    longitude: metadata.location.longitude ?? 0, // Will need geocoding
  };
}

function generateTitleSuggestions(metadata: InstagramMetadata): string[] {
  const suggestions: string[] = [];

  if (metadata.title) {
    suggestions.push(metadata.title);
  }

  // Generate suggestions based on hashtags
  if (metadata.hashtags && metadata.hashtags.length > 0) {
    const mainHashtag = metadata.hashtags[0];
    if (mainHashtag) {
      suggestions.push(
        `${mainHashtag.charAt(0).toUpperCase() + mainHashtag.slice(1)} Event`,
      );
    }
  }

  // Generate suggestions based on location
  if (metadata.location?.name) {
    suggestions.push(`Event bei ${metadata.location.name}`);
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

function getCategorySuggestions(metadata: InstagramMetadata): CategoryId[] {
  const content = (metadata.description || "").toLowerCase();
  const hashtags = metadata.hashtags || [];
  const allText = content + " " + hashtags.join(" ");

  // Score each category
  const categoryScores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    keywords.forEach((keyword) => {
      const matches = (
        allText.match(new RegExp(keyword.toLowerCase(), "g")) || []
      ).length;
      score += matches;
    });
    if (score > 0) {
      categoryScores[category] = score;
    }
  }

  // Sort by score and return top suggestions
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .map(([category]) => category);

  return sortedCategories.slice(0, 3);
}

function getLocationSuggestions(metadata: InstagramMetadata): string[] {
  const suggestions: string[] = [];

  if (metadata.location?.name) {
    suggestions.push(metadata.location.name);
  }

  // Extract potential locations from hashtags
  if (metadata.hashtags) {
    const locationHashtags = metadata.hashtags.filter(
      (tag) => tag.length > 3 && /^[a-z]+$/i.test(tag),
    );
    suggestions.push(...locationHashtags.slice(0, 2));
  }

  return suggestions.slice(0, 3);
}
