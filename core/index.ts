import { ActivityId, activityIds } from "@/shared/activities";
import * as z from "zod";

export const timeWindowSchema = z
  .tuple([z.number().min(0).max(1440), z.number().min(0).max(1440)])
  .describe("time window in minutes");

export const availabilitySchema = z.object({
  id: z.uuid().describe("unique id for the availability"),
  start: z.iso.date(),
  end: z.iso.date(),
  daily: z
    .array(z.array(timeWindowSchema))
    .length(7)
    .describe(
      "daily availability, one array per day, one tuple per time window, 24 hours in minutes"
    ),
  exceptions: z.record(
    z.iso.date(),
    z
      .array(timeWindowSchema)
      .describe(
        "exceptions to the daily availability, overrides the daily availability for the given date"
      )
  ),
});

export type Availability = z.infer<typeof availabilitySchema>;

// ============================================
// LOCATION SCHEMA
// ============================================

export const locationOptionSchema = z.object({
  title: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().positive().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const locationSchema = z.union([
  locationOptionSchema,
  z.object({ anyOf: z.array(locationOptionSchema).min(1) }),
]);

export type Location = z.infer<typeof locationSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

export const toHHMM = (mins: number) =>
  `${Math.floor(mins / 60)
    .toString()
    .padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;

export const fromHHMM = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
};

// ============================================
// VISIBILITY & COMMON SCHEMAS
// ============================================

export const visibilitySchema = z.enum(["public", "contacts", "private"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const openToSchema = z.enum(["specific", "contacts", "public"]);
export type OpenTo = z.infer<typeof openToSchema>;

// ============================================
// PLAN SCHEMA (Projection)
// Ein Plan ist ein konkretes Vorhaben mit Zeit, Ort und Aktivität
// ============================================

export const planParticipantSchema = z.object({
  userId: z.string(),
  status: z.enum(["invited", "joined", "declined"]),
  message: z.string().optional(),
  respondedAt: z.iso.datetime().optional(),
});

export const planSchema = z.object({
  id: z.string(),
  activity: z.enum(activityIds),
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),

  // Location ist mandatory für Pläne
  location: locationSchema,

  // Mit wem?
  withUsers: z.array(planParticipantSchema).optional(),

  // Offen für weitere Teilnehmer?
  openTo: openToSchema.optional(),
  maxParticipants: z.number().optional(),

  // Basiert auf Plan einer anderen Person?
  basedOn: z
    .object({
      planId: z.string(),
      userId: z.string(),
    })
    .optional(),

  // Serien-Info (wie Google Calendar)
  seriesId: z.string().optional(),
  seriesIndex: z.number().optional(),

  // Bezug zu Gathering
  gatheringId: z.string().optional(),

  // Status
  status: z.enum(["scheduled", "cancelled", "realized"]).default("scheduled"),

  // Timestamps
  createdAt: z.iso.datetime(),
});

export type Plan = z.infer<typeof planSchema>;
export type PlanParticipant = z.infer<typeof planParticipantSchema>;

// ============================================
// INTENT SCHEMA (Projection)
// "Ich hätte Lust auf..." - Wünsche ohne feste Zeit/Ort
// ============================================

export const timePreferenceSchema = z.object({
  label: z.string().optional(), // z.B. "Wochenenden", "Abends"
  dayOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0-6 (So-Sa)
  timeRange: timeWindowSchema.optional(), // Minuten seit Mitternacht
});

export const intentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  activity: z.enum(activityIds),
  visibility: visibilitySchema,

  // Wo würde ich das gerne machen?
  locationPreferences: z.array(locationSchema).optional(),

  // Wann hätte ich Zeit?
  timePreferences: z.array(timePreferenceSchema).optional(),

  // Status
  status: z.enum(["active", "fulfilled", "withdrawn"]).default("active"),
  fulfilledByPlanId: z.string().optional(),

  createdAt: z.iso.datetime(),
});

export type Intent = z.infer<typeof intentSchema>;
export type TimePreference = z.infer<typeof timePreferenceSchema>;

// ============================================
// GATHERING SCHEMA (Projection)
// Ein Gathering ist ein externes Event (Festival, Meetup, FB-Event, etc.)
// Es impliziert keine Teilnahme - es ist einfach "dieses Event existiert"
// ============================================

export const gatheringSourceSchema = z.enum([
  "manual", // Vom Nutzer erstellt
  "facebook", // Facebook Event
  "eventbrite", // Eventbrite
  "meetup", // Meetup
  "instagram", // Instagram Event
  "ical", // iCal/ICS Import
  "scrape", // Von Website gescraped
  "other", // Sonstige Quelle
]);

export type GatheringSource = z.infer<typeof gatheringSourceSchema>;

export const gatheringOrganizerSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const gatheringSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().optional(), // Link zum Original-Event

  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),

  // Location (optional bei Online-Events)
  location: locationSchema.optional(),

  // Quelle
  source: gatheringSourceSchema,
  sourceId: z.string().optional(), // ID beim Ursprung (z.B. Facebook Event ID)
  sourceUrl: z.string().optional(), // URL zum Original
  lastSyncedAt: z.iso.datetime().optional(),

  // Kategorisierung
  activity: z.enum(activityIds).optional(),
  tags: z.array(z.string()).optional(),

  // Medien
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),

  // Organisator
  organizer: gatheringOrganizerSchema.optional(),

  // Wer hat es hinzugefügt?
  addedBy: z.string().optional(), // userId

  // Status
  status: z.enum(["active", "cancelled", "ended", "removed"]).default("active"),

  // Timestamps
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().optional(),
});

export type Gathering = z.infer<typeof gatheringSchema>;
export type GatheringOrganizer = z.infer<typeof gatheringOrganizerSchema>;

// ============================================
// USER SCHEMA (Projection)
// ============================================

export const fullUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthDate: z.iso.date().optional(),
  relationshipStatus: z
    .enum(["single", "in_relationship", "married", "other"])
    .optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string(),
  image: z.string().optional(),
  onboardedAt: z.iso.datetime().optional(),

  privacySettings: z.object({
    showGender: z.boolean(),
    showAge: z.boolean(),
    showRelationshipStatus: z.boolean(),
  }),

  // Pläne des Users
  plans: z.array(planSchema),

  // Verfügbarkeitsregeln
  availability: z.array(availabilitySchema),

  // Wünsche/Intents ("Ich hätte Lust auf...")
  intents: z.array(intentSchema),

  // Kontakte (User-IDs oder Phone-Hashes)
  contacts: z.array(z.string()),

  // Blockierte User
  blockedUsers: z.array(z.string()),
});

export type FullUser = z.infer<typeof fullUserSchema>;

export const defaultFullUser: FullUser = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "",
  phoneNumber: "",
  availability: [],
  blockedUsers: [],
  contacts: [],
  intents: [],
  plans: [],
  privacySettings: {
    showAge: true,
    showGender: true,
    showRelationshipStatus: true,
  },
};

// ============================================
// BEISPIEL-DATEN
// ============================================

export const simon: FullUser = {
  id: "user-simon",
  name: "Simon",
  gender: "male",
  birthDate: "1996-11-11",
  relationshipStatus: "single",
  email: "simon@example.com",
  phoneNumber: "+491234567890",
  image: "https://example.com/image.jpg",
  onboardedAt: "2026-01-01T00:00:00+01:00",
  privacySettings: {
    showGender: true,
    showAge: true,
    showRelationshipStatus: true,
  },
  plans: [
    {
      id: "p1",
      title: "Takama Karate Training",
      activity: "sport/martial_arts" as ActivityId,
      startDate: "2026-01-10T09:00:00+01:00",
      endDate: "2026-01-10T12:00:00+01:00",
      location: {
        title: "SV 1945 Königshofen",
        address: "Unnamed Road, 63776 Mömbris, Deutschland",
        latitude: 50.0636076,
        longitude: 9.2005,
      },
      status: "scheduled",
      createdAt: "2026-01-01T10:00:00+01:00",
    },
    {
      id: "p2",
      title: "Laufen mit Laufacher Läufer",
      activity: "sport/running" as ActivityId,
      startDate: "2026-01-06T15:15:00+01:00",
      endDate: "2026-01-06T16:15:00+01:00",
      location: {
        title: "Treffpunkt Laufach",
        address: "Hauptstraße 1, Laufach",
        latitude: 50.0636076,
        longitude: 9.2005,
      },
      status: "scheduled",
      createdAt: "2026-01-01T10:00:00+01:00",
    },
    {
      // Jens hat Simon zum Essen eingeladen - Simon sieht das als Plan mit withUsers
      id: "p3",
      title: "Essen gehen bei Da Luigi",
      activity: "food_drink/restaurant" as ActivityId,
      startDate: "2026-01-10T19:30:00+01:00",
      endDate: "2026-01-10T22:00:00+01:00",
      location: {
        title: "Da Luigi",
        address: "Hauptstraße 42, 63739 Aschaffenburg",
        latitude: 49.9769,
        longitude: 9.158,
        url: "https://daluigi.de",
        description: "Italienisches Restaurant",
      },
      withUsers: [
        {
          userId: "user-jens",
          status: "joined", // Jens ist dabei (er hat eingeladen)
          message: "Hey Simon! Habe gesehen, dass du auch Lust hast.",
        },
      ],
      // Dieser Plan basiert auf Jens' Plan
      basedOn: {
        planId: "p-jens-1",
        userId: "user-jens",
      },
      status: "scheduled",
      createdAt: "2026-01-04T14:30:00+01:00",
    },
  ],
  availability: [
    {
      id: "av-simon-1",
      start: "2026-01-01",
      end: "2026-03-01",
      daily: [
        [[1140, 1439]], // Monday: 19:00-23:59
        [[1140, 1439]], // Tuesday
        [[1140, 1439]], // Wednesday
        [], // Thursday: nicht verfügbar
        [[1140, 1439]], // Friday
        [[1140, 1439]], // Saturday
        [[1140, 1439]], // Sunday
      ],
      exceptions: {
        "2026-01-15": [], // Ausnahme: An diesem Mittwoch nicht verfügbar
        "2026-02-14": [[1080, 1380]], // Valentinstag: 18:00-23:00
      },
    },
  ],
  intents: [
    {
      id: "i1",
      title: "Mit alten bekannten was essen gehen",
      description:
        "Ich möchte mit alten bekannten was essen gehen. Wir können uns austauschen und uns wieder kennenlernen.",
      activity: "food_drink/restaurant" as ActivityId,
      visibility: "contacts",
      status: "active",
      locationPreferences: [
        {
          title: "Aschaffenburg Innenstadt",
          address: "Aschaffenburg",
          latitude: 49.9769,
          longitude: 9.158,
        },
      ],
      timePreferences: [
        {
          label: "Abends unter der Woche",
          dayOfWeek: [1, 2, 3, 4, 5], // Mo-Fr
          timeRange: [1080, 1320], // 18:00-22:00
        },
      ],
      createdAt: "2026-01-01T10:00:00+01:00",
    },
    {
      id: "i2",
      title: "Boldern gehen",
      description:
        "War schon lange nicht mehr im Klettern und habe mal wieder lust drauf.",
      activity: "sport/climbing" as ActivityId,
      visibility: "public",
      status: "active",
      createdAt: "2026-01-01T10:00:00+01:00",
    },
  ],
  contacts: ["user-jens", "c1", "c2", "c3", "c4"],
  blockedUsers: ["c5", "c6"],
};

export const jens: FullUser = {
  ...defaultFullUser,
  id: "user-jens",
  name: "Jens",
  gender: "male",
  birthDate: "1990-01-01",
  relationshipStatus: "single",
  email: "jens@example.com",
  phoneNumber: "+4915123456789",
  image: "https://example.com/jens.jpg",
  onboardedAt: "2026-01-01T00:00:00+01:00",
  privacySettings: {
    showGender: true,
    showAge: true,
    showRelationshipStatus: true,
  },
  plans: [
    {
      // Jens' Plan mit Simon essen zu gehen
      id: "p-jens-1",
      title: "Essen gehen bei Da Luigi",
      activity: "food_drink/restaurant" as ActivityId,
      startDate: "2026-01-10T19:30:00+01:00",
      endDate: "2026-01-10T22:00:00+01:00",
      location: {
        title: "Da Luigi",
        address: "Hauptstraße 42, 63739 Aschaffenburg",
        latitude: 49.9769,
        longitude: 9.158,
        url: "https://daluigi.de",
      },
      withUsers: [
        {
          userId: "user-simon",
          status: "joined", // Simon hat zugesagt
          message: "Bin dabei!",
          respondedAt: "2026-01-04T18:00:00+01:00",
        },
      ],
      openTo: "specific", // Nur die eingeladenen
      status: "scheduled",
      createdAt: "2026-01-04T14:30:00+01:00",
    },
  ],
  availability: [
    {
      id: "av-jens-1",
      start: "2026-01-01",
      end: "2026-03-01",
      daily: [
        [[1080, 1320]], // Montag: 18:00-22:00
        [[1080, 1320]], // Dienstag
        [[1080, 1320]], // Mittwoch
        [[1080, 1320]], // Donnerstag
        [[1080, 1380]], // Freitag: 18:00-23:00
        [[600, 1380]], // Samstag: 10:00-23:00
        [[600, 1260]], // Sonntag: 10:00-21:00
      ],
      exceptions: {},
    },
  ],
  intents: [
    {
      id: "jens-i1",
      title: "Alte Freunde treffen",
      description: "Möchte mal wieder mit alten Bekannten was unternehmen",
      activity: "food_drink/restaurant" as ActivityId,
      visibility: "contacts",
      status: "active",
      createdAt: "2026-01-01T10:00:00+01:00",
    },
  ],
  contacts: ["user-simon", "c7", "c8"],
  blockedUsers: [],
};
