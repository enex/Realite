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

export const placeSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export type Place = z.infer<typeof placeSchema>;

export const toHHMM = (mins: number) =>
  `${Math.floor(mins / 60)
    .toString()
    .padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;

export const fromHHMM = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
};

export const visibilitySchema = z.enum(["public", "contacts"]);

export const planSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  start: z.iso.date(),
  end: z.iso.date(),
  activity: z.enum(activityIds),
  place: placeSchema,
  visibility: visibilitySchema,
});

export const intentSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  activity: z.enum(activityIds),
  visibility: visibilitySchema,
});

export type Intent = z.infer<typeof intentSchema>;

// Proposal: Ein Vorschlag von User A an User B für eine gemeinsame Aktivität
export const proposalStatusSchema = z.enum([
  "pending", // Noch keine Antwort
  "accepted", // Angenommen → wird zum Plan
  "declined", // Abgelehnt
  "counter_proposed", // Gegenvorschlag gemacht
  "expired", // Abgelaufen (keine Antwort)
  "cancelled", // Vom Ersteller zurückgezogen
]);

export const proposalSchema = z.object({
  id: z.uuid(),
  fromUserId: z.uuid(),
  toUserId: z.uuid(),
  activity: z.enum(activityIds),
  title: z.string(),
  message: z
    .string()
    .optional()
    .describe("Persönliche Nachricht zum Vorschlag"),
  proposedTime: z.iso.datetime(),
  proposedEndTime: z.iso.datetime().optional(),
  proposedPlace: placeSchema.optional(),
  matchedIntentId: z
    .uuid()
    .optional()
    .describe("Falls der Vorschlag zu einem Intent des Empfängers passt"),
  status: proposalStatusSchema,
  respondedAt: z.iso.datetime().optional(),
  responseMessage: z.string().optional(),
  counterProposalId: z
    .uuid()
    .optional()
    .describe("Falls status='counter_proposed', ID des Gegenvorschlags"),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso
    .datetime()
    .optional()
    .describe("Wann der Vorschlag automatisch abläuft"),
});

export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const fullUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  gender: z.enum(["male", "female", "other"]),
  birthDate: z.iso.date(),
  relationshipStatus: z.enum(["single", "in_relationship", "married", "other"]),
  email: z.email().optional(),
  phoneNumber: z.string(),
  image: z.string(),
  onboardedAt: z.iso.date().optional(),
  privacySettings: z.object({
    showGender: z.boolean(),
    showAge: z.boolean(),
    showRelationshipStatus: z.boolean(),
  }),
  plans: z.array(planSchema),
  availability: z.array(availabilitySchema),
  intents: z.array(intentSchema),
  // Proposals die dieser User erhalten hat (incoming)
  incomingProposals: z.array(proposalSchema),
  // Proposals die dieser User gesendet hat (outgoing)
  outgoingProposals: z.array(proposalSchema),
  contacts: z.array(z.uuid()),
  blockedUsers: z.array(z.uuid()),
});
export type FullUser = z.infer<typeof fullUserSchema>;

export const defaultFullUser: FullUser = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "",
  gender: "other",
  birthDate: "1996-11-11",
  relationshipStatus: "single",
  phoneNumber: "+491234567890",
  image: "",
  availability: [],
  blockedUsers: [],
  contacts: [],
  intents: [],
  plans: [],
  incomingProposals: [],
  outgoingProposals: [],
  privacySettings: {
    showAge: true,
    showGender: true,
    showRelationshipStatus: true,
  },
};

// Beispiel-Proposal: Jens schlägt Simon vor, essen zu gehen
export const jensProposalToSimon: Proposal = {
  id: "prop-1",
  fromUserId: "user-jens",
  toUserId: "user-simon",
  activity: "food_drink/restaurant" as ActivityId,
  title: "Essen gehen bei Da Luigi",
  message:
    "Hey Simon! Habe gesehen, dass du auch Lust hast, mal wieder essen zu gehen. Wie wäre es Freitag Abend?",
  proposedTime: "2026-01-10T19:30:00+01:00",
  proposedEndTime: "2026-01-10T22:00:00+01:00",
  proposedPlace: {
    id: "place-1",
    title: "Da Luigi",
    address: "Hauptstraße 42, 63739 Aschaffenburg",
    latitude: 49.9769,
    longitude: 9.158,
    url: "https://daluigi.de",
    description: "Italienisches Restaurant",
  },
  matchedIntentId: "i1", // Passt zu Simons Intent "Mit alten bekannten was essen gehen"
  status: "pending",
  createdAt: "2026-01-04T14:30:00+01:00",
  expiresAt: "2026-01-09T23:59:00+01:00", // Läuft einen Tag vor dem Termin ab
};

export const simon: FullUser = {
  id: "user-simon",
  name: "Simon",
  gender: "male",
  birthDate: "1996-11-11",
  relationshipStatus: "single",
  email: "simon@example.com",
  phoneNumber: "+491234567890",
  image: "https://example.com/image.jpg",
  onboardedAt: "2026-01-01",
  privacySettings: {
    showGender: true,
    showAge: true,
    showRelationshipStatus: true,
  },
  plans: [
    {
      id: "p1",
      title: "Takama Karate Training",
      start: "2026-01-10T09:00:00+01:00",
      end: "2026-01-10T12:00:00+01:00",
      activity: "sport/martial_arts" satisfies ActivityId,
      place: {
        id: "place-simon-1",
        title: "SV 1945 Känigshofen",
        address: "Unnamed Road, 63776 Mömbris, Deutschland",
        latitude: 50.0636076,
        longitude: 9.2005,
      },
      visibility: "public",
    },
    {
      id: "p2",
      title: "Laufen mit Laufacher Läufer",
      start: "2026-01-06T15:15:00+01:00",
      end: "2026-01-06T16:15:00+01:00",
      activity: "sport/running" satisfies ActivityId,
      place: {
        id: "place-simon-2",
        title: "Haus von XY",
        address: "Irgendwo in Laufach",
        latitude: 50.0636076,
        longitude: 9.2005,
      },
      visibility: "public",
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
      activity: "food_drink/restaurant" satisfies ActivityId,
      visibility: "contacts",
    },
    {
      id: "i2",
      title: "Boldern gehen",
      description:
        "War schon lange nicht mehr im Klettern und habe mal wieder lust drauf.",
      activity: "sport/climbing" satisfies ActivityId,
      visibility: "public",
    },
    {
      id: "i3",
      title: "Spazieren gehen",
      description: "Bils Frische Luft schnappen",
      activity: "outdoors" satisfies ActivityId,
      visibility: "public",
    },
  ],
  incomingProposals: [jensProposalToSimon], // Simon hat einen Vorschlag von Jens
  outgoingProposals: [],
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
  onboardedAt: "2026-01-01",
  privacySettings: {
    showGender: true,
    showAge: true,
    showRelationshipStatus: true,
  },
  plans: [],
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
        [[600, 1380]], // Samstag: 10:00-23:00 (ganzer Tag)
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
    },
  ],
  incomingProposals: [],
  outgoingProposals: [jensProposalToSimon], // Jens hat den Vorschlag gesendet
  contacts: ["user-simon", "c7", "c8"],
  blockedUsers: [],
};
