import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { genderSchema, relationshipStatusSchema } from "./user";

export const categories = [
  // Hauptkategorien
  { id: "OUTDOOR", name: "Outdoor" },
  { id: "FOOD_DRINK", name: "Essen & Trinken" },
  { id: "CULTURE", name: "Kultur" },
  { id: "MUSIC_DANCE", name: "Musik & Tanzen" },
  { id: "MARKETS_FESTIVALS", name: "Märkte & Feste" },
  { id: "SPORTS", name: "Sport" },
  { id: "FUN_GAMES", name: "Spaß & Spiele" },
  { id: "OTHER", name: "Anderes" },

  // Outdoor-Unterkategorien
  { id: "HIKING", name: "Wandern", parentId: "OUTDOOR" },
  { id: "WALKING", name: "Spazieren", parentId: "OUTDOOR" },
  { id: "CYCLING", name: "Radfahren", parentId: "OUTDOOR" },
  { id: "PARK", name: "Park besuchen", parentId: "OUTDOOR" },
  { id: "SIGHTSEEING", name: "Sightseeing", parentId: "OUTDOOR" },

  // Essen & Trinken-Unterkategorien
  { id: "RESTAURANT", name: "Restaurant", parentId: "FOOD_DRINK" },
  { id: "BAR", name: "Bar/Drinks", parentId: "FOOD_DRINK" },
  { id: "CAFE", name: "Café", parentId: "FOOD_DRINK" },
  { id: "COOKING", name: "Kochen", parentId: "FOOD_DRINK" },
  { id: "PICNIC", name: "Picknick", parentId: "FOOD_DRINK" },

  // Kultur-Unterkategorien
  { id: "MUSEUM", name: "Museum", parentId: "CULTURE" },
  { id: "CINEMA", name: "Kino", parentId: "CULTURE" },
  { id: "THEATER", name: "Theater", parentId: "CULTURE" },
  { id: "CONCERT", name: "Konzert", parentId: "CULTURE" },
  { id: "EXHIBITION", name: "Ausstellung", parentId: "CULTURE" },
  { id: "EVENTS", name: "Veranstaltungen", parentId: "CULTURE" },

  // Musik & Tanzen-Unterkategorien
  { id: "CLUB", name: "Club", parentId: "MUSIC_DANCE" },
  { id: "PARTY", name: "Party", parentId: "MUSIC_DANCE" },
  { id: "CELEBRATION", name: "Feiern", parentId: "MUSIC_DANCE" },
  { id: "DANCE_COURSE", name: "Tanzkurs", parentId: "MUSIC_DANCE" },

  // Märkte & Feste-Unterkategorien
  { id: "WEEKLY_MARKET", name: "Wochenmarkt", parentId: "MARKETS_FESTIVALS" },
  { id: "CITY_FESTIVAL", name: "Stadtfest", parentId: "MARKETS_FESTIVALS" },

  // Sport-Unterkategorien
  { id: "RUNNING", name: "Laufen/Joggen", parentId: "SPORTS" },
  { id: "FITNESS", name: "Fitness/Gym", parentId: "SPORTS" },
  { id: "BALL_SPORTS", name: "Ballsport", parentId: "SPORTS" },
  { id: "RACKET_SPORTS", name: "Racketsport", parentId: "SPORTS" },
  { id: "MARTIAL_ARTS", name: "Kampfsport", parentId: "SPORTS" },
  { id: "CLIMBING", name: "Klettern", parentId: "SPORTS" },
  { id: "SWIMMING", name: "Schwimmen", parentId: "SPORTS" },
  { id: "YOGA", name: "Yoga/Pilates", parentId: "SPORTS" },
  { id: "WELLNESS", name: "Wellness/Spa", parentId: "SPORTS" },

  // Spaß & Spiele-Unterkategorien
  { id: "BOWLING", name: "Bowling", parentId: "FUN_GAMES" },
  { id: "DARTS", name: "Darts", parentId: "FUN_GAMES" },
  { id: "BOARD_GAMES", name: "Brettspiele", parentId: "FUN_GAMES" },
  { id: "VIDEO_GAMES", name: "Gaming", parentId: "FUN_GAMES" },
  { id: "BILLIARDS", name: "Billard", parentId: "FUN_GAMES" },
  { id: "KARAOKE", name: "Karaoke", parentId: "FUN_GAMES" },

  // Anderes-Unterkategorien
  { id: "EVERYTHING_ELSE", name: "Alles weitere", parentId: "OTHER" },
] satisfies { id: string; name: string; parentId?: string }[];

export type CategoryId = (typeof categories)[number]["id"];

export type Category = (typeof categories)[number];

export const categoryIdSchema = z.enum(
  categories.map((c) => c.id) as [CategoryId, ...CategoryId[]],
);

export const whatSchema = z.object({
  category: categoryIdSchema,
  title: z.string(),
  description: z.string(),
  url: z.string().url().optional(),
  minParticipants: z.number().min(0).optional(),
  maxParticipants: z.number().min(0).optional(),
});

// Hilfsfunktionen für die Kategoriefilterung
export const getAllSubcategories = (categoryId: CategoryId): Category[] => {
  return categories.filter((category) => category.parentId === categoryId);
};

export const getAllCategoriesInHierarchy = (
  categoryId: CategoryId,
): Category[] => {
  const result: Category[] = [categories.find((c) => c.id === categoryId)!];
  const subcategories = getAllSubcategories(categoryId);
  return [...result, ...subcategories];
};

// Typ für die Validierung
export const isCategoryId = (id: string): id is CategoryId => {
  return categories.some((category) => category.id === id);
};

export const whenSchema = z.object({
  start: z.iso.datetime(),
  end: z.iso.datetime(),
});
export type When = z.infer<typeof whenSchema>;

export const whereInputSchema = z.object({
  id: z.uuid().default(() => uuidv4()),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  photoUrl: z.url().optional(),
});
export type WhereInput = z.input<typeof whereInputSchema>;
export type Where = z.infer<typeof whereInputSchema>;

export const whoInputSchema = z.object({
  explicit: z.record(z.string(), z.boolean()).default({}),
  anyone: z
    .object({
      gender: genderSchema.array().optional(),
      relationshipStatus: relationshipStatusSchema.array().optional(),
    })
    .optional()
    .nullable(),
  contacts: z.boolean().default(true),
});

export type WhoInput = z.input<typeof whoInputSchema>;
export type Who = z.infer<typeof whoInputSchema>;
