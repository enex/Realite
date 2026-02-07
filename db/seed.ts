import "dotenv/config";
import { inArray, sql } from "drizzle-orm";
import { v5 as uuidv5 } from "uuid";
import type { Plan } from "@/lib/core/types";
import type { RealiteEvents } from "@/server/events";
import { PHONE_NUMBER_HASH_NAMESPACE } from "@/shared/validation";
import { activityIds, type ActivityId } from "@/shared/activities";
import * as schema from "./schema";
import { db } from "../server/db";
import { es } from "../server/es";

type SeedEvent = {
  id: string;
  type: keyof RealiteEvents;
  actor: string;
  subject: string;
  data: unknown;
  time: Date;
};

type SeedUser = {
  id: string;
  name: string;
  phoneNumber: string;
  city: City;
};

type City = {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

type Venue = {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  url?: string;
  description?: string;
};

const SEED_NAMESPACE = "55a5f3b8-59f6-4d16-a8a5-cc11ca0cc53f";
const DEMO_CODE = "123456";
const DRY_RUN = process.argv.includes("--dry-run");

const USER_COUNT = 30;
const PLAN_COUNT = 280;
const INTENT_COUNT = 160;
const INTENT_REQUEST_COUNT = 100;
const PLAN_EXCHANGE_COUNT = 120;

const USER_NAMES = [
  "Lena Hoffmann",
  "Noah Becker",
  "Mila Schneider",
  "Elias Wagner",
  "Emma Fischer",
  "Ben Weber",
  "Sofia Meyer",
  "Paul Richter",
  "Hannah Wolf",
  "Leon Klein",
  "Mia Schmitt",
  "Finn Braun",
  "Charlotte Zimmer",
  "Jonas Hartmann",
  "Clara Vogel",
  "David Kruger",
  "Nora Otto",
  "Lukas Franke",
  "Greta Lehmann",
  "Theo Schuster",
  "Ava Krause",
  "Liam Kuhn",
  "Ida Peters",
  "Max Sommer",
  "Lina Walter",
  "Felix Haas",
  "Mara Neumann",
  "Tim Kruse",
  "Ella Seidel",
  "Moritz Berg",
] as const;

const DEMO_PHONE_NUMBERS = [
  "495551111111",
  "495552222222",
  "495553333333",
  "12025550001",
  "12025550002",
] as const;

const EXTRA_PHONE_NUMBERS = [
  "12025550100",
  "12025550101",
  "12025550102",
  "12025550103",
  "12025550104",
  "12025550105",
  "12025550106",
  "12025550107",
  "12025550108",
  "12025550109",
  "12025550110",
  "12025550111",
  "12025550112",
  "12025550113",
  "12025550114",
  "12025550115",
  "12025550116",
  "12025550117",
  "12025550118",
  "12025550119",
  "12025550120",
  "12025550121",
  "12025550122",
  "12025550123",
  "12025550124",
  "12025550125",
  "12025550126",
  "12025550127",
  "12025550128",
  "12025550129",
] as const;

const CITIES: City[] = [
  {
    name: "Berlin",
    countryCode: "DE",
    latitude: 52.52,
    longitude: 13.405,
  },
  {
    name: "Hamburg",
    countryCode: "DE",
    latitude: 53.5511,
    longitude: 9.9937,
  },
  {
    name: "Munich",
    countryCode: "DE",
    latitude: 48.1372,
    longitude: 11.5756,
  },
  {
    name: "Cologne",
    countryCode: "DE",
    latitude: 50.9375,
    longitude: 6.9603,
  },
  {
    name: "New York",
    countryCode: "US",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    name: "San Francisco",
    countryCode: "US",
    latitude: 37.7749,
    longitude: -122.4194,
  },
];

const VENUES: Venue[] = [
  {
    title: "Tempelhofer Feld",
    address: "Tempelhofer Damm, 12101 Berlin",
    latitude: 52.4736,
    longitude: 13.4032,
    city: "Berlin",
    description: "Große Freifläche für Sport und Outdoor-Aktivitäten.",
  },
  {
    title: "Mauerpark",
    address: "Gleimstraße 55, 10437 Berlin",
    latitude: 52.5417,
    longitude: 13.4025,
    city: "Berlin",
  },
  {
    title: "Prater Garten",
    address: "Kastanienallee 7-9, 10435 Berlin",
    latitude: 52.5411,
    longitude: 13.4108,
    city: "Berlin",
    url: "https://www.pratergarten.de/",
  },
  {
    title: "Elbphilharmonie Plaza",
    address: "Platz der Deutschen Einheit 4, 20457 Hamburg",
    latitude: 53.5413,
    longitude: 9.9841,
    city: "Hamburg",
  },
  {
    title: "Stadtpark Hamburg",
    address: "Saarlandstraße, 22303 Hamburg",
    latitude: 53.5936,
    longitude: 10.0095,
    city: "Hamburg",
  },
  {
    title: "Schanzenpark",
    address: "Sternschanze, 20357 Hamburg",
    latitude: 53.5609,
    longitude: 9.968,
    city: "Hamburg",
  },
  {
    title: "Englischer Garten",
    address: "80538 München",
    latitude: 48.1642,
    longitude: 11.6056,
    city: "Munich",
  },
  {
    title: "Gasteig HP8",
    address: "Hans-Preißinger-Straße 8, 81379 München",
    latitude: 48.1118,
    longitude: 11.5484,
    city: "Munich",
  },
  {
    title: "Olympiapark München",
    address: "Spiridon-Louis-Ring 21, 80809 München",
    latitude: 48.1755,
    longitude: 11.5518,
    city: "Munich",
  },
  {
    title: "Rheinauhafen",
    address: "Rheinauhafen, 50678 Köln",
    latitude: 50.9234,
    longitude: 6.9657,
    city: "Cologne",
  },
  {
    title: "Belgisches Viertel",
    address: "Aachener Straße, 50674 Köln",
    latitude: 50.9368,
    longitude: 6.9347,
    city: "Cologne",
  },
  {
    title: "Aachener Weiher",
    address: "Aachener Straße 77, 50674 Köln",
    latitude: 50.9358,
    longitude: 6.9238,
    city: "Cologne",
  },
  {
    title: "Bryant Park",
    address: "New York, NY 10018",
    latitude: 40.7536,
    longitude: -73.9832,
    city: "New York",
  },
  {
    title: "Brooklyn Bridge Park",
    address: "334 Furman St, Brooklyn, NY 11201",
    latitude: 40.6993,
    longitude: -73.9977,
    city: "New York",
  },
  {
    title: "Chelsea Market",
    address: "75 9th Ave, New York, NY 10011",
    latitude: 40.7424,
    longitude: -74.006,
    city: "New York",
  },
  {
    title: "Dolores Park",
    address: "19th St & Dolores St, San Francisco, CA 94114",
    latitude: 37.7596,
    longitude: -122.4269,
    city: "San Francisco",
  },
  {
    title: "Ferry Building",
    address: "1 Ferry Building, San Francisco, CA 94111",
    latitude: 37.7955,
    longitude: -122.3937,
    city: "San Francisco",
  },
  {
    title: "Golden Gate Park",
    address: "San Francisco, CA",
    latitude: 37.7694,
    longitude: -122.4862,
    city: "San Francisco",
  },
];

const ACTIVE_ACTIVITY_IDS = activityIds.filter((id) =>
  id.includes("/")
) as ActivityId[];

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(42_1337);

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

function oneIn(chanceDenominator: number): boolean {
  return randomInt(1, chanceDenominator) === 1;
}

function makeId(...parts: string[]): string {
  return uuidv5(parts.join("::"), SEED_NAMESPACE);
}

function shifted(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

function addMinutes(base: Date, minutes: number): Date {
  return shifted(base, minutes * 60 * 1000);
}

function addHours(base: Date, hours: number): Date {
  return shifted(base, hours * 60 * 60 * 1000);
}

function addDays(base: Date, days: number): Date {
  return shifted(base, days * 24 * 60 * 60 * 1000);
}

function withJitter(value: number, amount: number): number {
  return value + randomFloat(-amount, amount);
}

function randomActivity(): ActivityId {
  return pick(ACTIVE_ACTIVITY_IDS);
}

function titleFromActivity(activity: ActivityId): string {
  const [, sub = activity] = activity.split("/");
  const formatted = sub
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return formatted;
}

function makePlanTitle(activity: ActivityId, venue: Venue): string {
  const base = titleFromActivity(activity);
  const variants = [
    `${base} in ${venue.title}`,
    `${base} Runde`,
    `${base} Treffen`,
    `${base} Session`,
    `${base} & Austausch`,
  ] as const;
  return pick(variants);
}

function makePlanDescription(activity: ActivityId, venue: Venue): string {
  const templates = [
    `Entspannte ${titleFromActivity(activity).toLowerCase()}-Session mit lockerer Runde.`,
    `Treffen vor Ort, kurzer Check-in und dann gemeinsam los.`,
    `Offenes Treffen mit Fokus auf gute Stimmung und neue Leute.`,
    `Wir starten pünktlich bei ${venue.title} und schauen dann spontan weiter.`,
  ] as const;
  return pick(templates);
}

function makeIntentTitle(activity: ActivityId): string {
  const base = titleFromActivity(activity);
  const variants = [
    `${base} mal wieder machen`,
    `${base} am Wochenende`,
    `Leute für ${base} gesucht`,
    `${base} in kleiner Gruppe`,
  ] as const;
  return pick(variants);
}

function makeIntentMessage(activity: ActivityId): string {
  const base = titleFromActivity(activity).toLowerCase();
  const variants = [
    `Hättest du Lust auf ${base} in den nächsten Tagen?`,
    `Ich plane ${base}, wäre cool wenn du dabei bist.`,
    `Kurze Runde ${base}? Zeitlich bin ich flexibel.`,
  ] as const;
  return pick(variants);
}

function makeExchangePlan(
  activity: ActivityId,
  venue: Venue,
  start: Date,
  end: Date,
  targetUsers: string[]
): Plan {
  return {
    when: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    what: {
      activity,
      title: makePlanTitle(activity, venue),
      description: makePlanDescription(activity, venue),
    },
    where: {
      name: venue.title,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      radiusMeters: pick([150, 250, 400]),
    },
    participation: {
      visibility: targetUsers.length > 0 ? "specific" : pick(["public", "contacts"]),
      mode: pick(["collaborative", "personal", "gathering"]),
      maxParticipants: pick([3, 4, 5, 6, 8]),
      targetUsers: targetUsers.length > 0 ? targetUsers : undefined,
    },
    certainty: Number(randomFloat(0.35, 0.95).toFixed(2)),
  };
}

function getVenuesForCity(city: City): Venue[] {
  return VENUES.filter((venue) => venue.city === city.name);
}

function buildUsers(): SeedUser[] {
  const phones = [...DEMO_PHONE_NUMBERS, ...EXTRA_PHONE_NUMBERS].slice(
    0,
    USER_COUNT
  );
  return USER_NAMES.slice(0, USER_COUNT).map((name, index) => ({
    id: makeId("seed", "user", String(index)),
    name,
    phoneNumber: phones[index]!,
    city: CITIES[index % CITIES.length]!,
  }));
}

function buildEvents(users: SeedUser[]): SeedEvent[] {
  const events: SeedEvent[] = [];
  let timeOffsetMs = 0;
  const now = new Date();

  const push = (event: Omit<SeedEvent, "id" | "time"> & { key: string; time: Date }) => {
    events.push({
      id: makeId("seed", "event", event.key),
      type: event.type,
      actor: event.actor,
      subject: event.subject,
      data: event.data,
      time: shifted(event.time, timeOffsetMs++),
    });
  };

  const eventTimeBase = addDays(now, -180);

  for (const [index, user] of users.entries()) {
    const registeredAt = addDays(eventTimeBase, index * 2);
    const phoneHash = uuidv5(user.phoneNumber, PHONE_NUMBER_HASH_NAMESPACE);
    const age = randomInt(21, 42);
    const birthYear = now.getUTCFullYear() - age;
    const birthMonth = randomInt(1, 12).toString().padStart(2, "0");
    const birthDay = randomInt(1, 28).toString().padStart(2, "0");
    const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

    push({
      key: `user/${index}/registered`,
      actor: user.id,
      subject: user.id,
      type: "realite.user.registered",
      time: registeredAt,
      data: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        deviceInfo: {
          platform: pick(["ios", "android"]),
          seed: true,
        },
      },
    });

    push({
      key: `user/${index}/phone-requested`,
      actor: phoneHash,
      subject: phoneHash,
      type: "realite.auth.phone-code-requested",
      time: addMinutes(registeredAt, 1),
      data: {
        phoneNumber: user.phoneNumber,
        code: DEMO_CODE,
        expiresAt: addMinutes(registeredAt, 16).toISOString(),
        deviceInfo: { seeded: true },
        userId: user.id,
      },
    });

    push({
      key: `user/${index}/phone-verified-hash`,
      actor: phoneHash,
      subject: phoneHash,
      type: "realite.auth.phone-code-verified",
      time: addMinutes(registeredAt, 2),
      data: {
        phoneNumber: user.phoneNumber,
        userId: user.id,
      },
    });

    push({
      key: `user/${index}/phone-verified-user`,
      actor: user.id,
      subject: user.id,
      type: "realite.auth.phone-code-verified",
      time: addMinutes(registeredAt, 3),
      data: {
        phoneNumber: user.phoneNumber,
        userId: user.id,
      },
    });

    push({
      key: `user/${index}/profile`,
      actor: user.id,
      subject: user.id,
      type: "realite.profile.updated",
      time: addMinutes(registeredAt, 4),
      data: {
        name: user.name,
        email: `${user.name.toLowerCase().replaceAll(" ", ".")}@example.com`,
        gender: pick([
          "MALE",
          "FEMALE",
          "NON_BINARY",
          "PREFER_NOT_TO_SAY",
        ]),
        relationshipStatus: pick([
          "SINGLE",
          "IN_RELATIONSHIP",
          "MARRIED",
          "COMPLICATED",
          "PREFER_NOT_TO_SAY",
        ]),
        birthDate,
        privacySettings: {
          showAge: oneIn(4),
          showGender: oneIn(3),
          showRelationshipStatus: oneIn(2),
        },
      },
    });

    push({
      key: `user/${index}/onboarded`,
      actor: user.id,
      subject: user.id,
      type: "realite.user.onboarded",
      time: addMinutes(registeredAt, 5),
      data: {},
    });

    push({
      key: `user/${index}/location`,
      actor: user.id,
      subject: user.id,
      type: "realite.user.location-updated",
      time: addMinutes(registeredAt, 6),
      data: {
        latitude: withJitter(user.city.latitude, 0.02),
        longitude: withJitter(user.city.longitude, 0.02),
        accuracy: randomInt(10, 40),
      },
    });
  }

  for (let i = 0; i < PLAN_COUNT; i++) {
    const creator = users[i % users.length]!;
    const activity = randomActivity();
    const cityVenues = getVenuesForCity(creator.city);
    const venue = pick(cityVenues.length > 0 ? cityVenues : VENUES);
    const planId = makeId("seed", "plan", String(i));
    const dayOffset = randomInt(-30, 90);
    const hour = randomInt(7, 21);
    const minute = pick([0, 15, 30, 45]);
    const startDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + dayOffset,
        hour,
        minute,
        0
      )
    );
    const durationMin = pick([60, 90, 120, 150, 180, 210]);
    let currentStart = startDate;
    let currentEnd = addMinutes(startDate, durationMin);
    const scheduledAt = addDays(startDate, -randomInt(2, 30));
    const openTo = pick(["specific", "contacts", "public"] as const);

    push({
      key: `plan/${i}/scheduled`,
      actor: creator.id,
      subject: planId,
      type: "realite.plan.scheduled",
      time: scheduledAt,
      data: {
        activity,
        startDate: currentStart.toISOString(),
        endDate: currentEnd.toISOString(),
        title: makePlanTitle(activity, venue),
        description: makePlanDescription(activity, venue),
        location: {
          title: venue.title,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          url: venue.url,
          description: venue.description,
        },
        openTo,
        maxParticipants: openTo === "specific" ? undefined : pick([4, 6, 8, 10, 12]),
      },
    });

    if (oneIn(4)) {
      const updatesAt = addHours(scheduledAt, randomInt(6, 72));
      push({
        key: `plan/${i}/details`,
        actor: creator.id,
        subject: planId,
        type: "realite.plan.details-updated",
        time: updatesAt,
        data: {
          title: `${makePlanTitle(activity, venue)} (Update)`,
          description: `${makePlanDescription(activity, venue)} Bitte 10 Minuten vorher da sein.`,
          openTo: pick(["specific", "contacts", "public"]),
          maxParticipants: pick([4, 6, 8, 10]),
        },
      });
    }

    if (oneIn(6)) {
      const deltaHours = pick([-3, -2, -1, 1, 2, 3, 4, 5]);
      currentStart = addHours(currentStart, deltaHours);
      currentEnd = addHours(currentEnd, deltaHours);
      push({
        key: `plan/${i}/rescheduled`,
        actor: creator.id,
        subject: planId,
        type: "realite.plan.rescheduled",
        time: addHours(scheduledAt, randomInt(10, 120)),
        data: {
          startDate: currentStart.toISOString(),
          endDate: currentEnd.toISOString(),
          reason: "Termin leicht verschoben",
          applyTo: "this",
        },
      });
    }

    if (oneIn(8)) {
      const otherVenue = pick(getVenuesForCity(creator.city));
      push({
        key: `plan/${i}/relocated`,
        actor: creator.id,
        subject: planId,
        type: "realite.plan.relocated",
        time: addHours(scheduledAt, randomInt(8, 96)),
        data: {
          location: {
            title: otherVenue.title,
            address: otherVenue.address,
            latitude: otherVenue.latitude,
            longitude: otherVenue.longitude,
            url: otherVenue.url,
            description: otherVenue.description,
          },
          reason: "Besser erreichbarer Ort",
          applyTo: "this",
        },
      });
    }

    if (oneIn(3)) {
      const otherUser = pick(users.filter((u) => u.id !== creator.id));
      push({
        key: `plan/${i}/joined`,
        actor: otherUser.id,
        subject: planId,
        type: "realite.plan.joined",
        time: addHours(scheduledAt, randomInt(6, 60)),
        data: {
          planId,
          creatorId: creator.id,
          message: "Ich bin dabei!",
        },
      });
    }

    if (oneIn(5)) {
      const otherUser = pick(users.filter((u) => u.id !== creator.id));
      push({
        key: `plan/${i}/declined`,
        actor: otherUser.id,
        subject: planId,
        type: "realite.plan.declined",
        time: addHours(scheduledAt, randomInt(6, 54)),
        data: {
          planId,
          creatorId: creator.id,
          reason: pick([
            "no-time",
            "not-interested",
            "too-far",
            "not-with-person",
            "other",
          ]),
          message: "Schaffe ich diesmal leider nicht.",
          hideReason: oneIn(3),
        },
      });
    }

    const inPast = currentEnd.getTime() < now.getTime();
    if (inPast && oneIn(3)) {
      push({
        key: `plan/${i}/realized`,
        actor: creator.id,
        subject: planId,
        type: "realite.plan.realized",
        time: addHours(currentEnd, randomInt(1, 24)),
        data: {
          comment: "War super, gerne wieder.",
          rating: pick([4, 5]),
          wouldRepeat: true,
        },
      });
    } else if (!inPast && oneIn(8)) {
      const cancelAt = addHours(currentStart, -randomInt(2, 48));
      push({
        key: `plan/${i}/cancelled`,
        actor: creator.id,
        subject: planId,
        type: "realite.plan.cancelled",
        time: cancelAt,
        data: {
          reason: pick(["schedule-conflict", "no-participants", "other"]),
          message: "Müssen wir verschieben.",
          applyTo: "this",
        },
      });
    }
  }

  for (let i = 0; i < INTENT_COUNT; i++) {
    const owner = users[i % users.length]!;
    const activity = randomActivity();
    const intentId = makeId("seed", "intent", String(i));
    const expressedAt = addDays(now, randomInt(-75, 12));

    push({
      key: `intent/${i}/expressed`,
      actor: owner.id,
      subject: intentId,
      type: "realite.intent.expressed",
      time: expressedAt,
      data: {
        title: makeIntentTitle(activity),
        description: oneIn(2)
          ? `Ich hätte Lust auf ${titleFromActivity(activity).toLowerCase()} mit 2-4 Leuten.`
          : undefined,
        activity,
        visibility: pick(["public", "contacts"]),
      },
    });

    if (oneIn(4)) {
      push({
        key: `intent/${i}/refined`,
        actor: owner.id,
        subject: intentId,
        type: "realite.intent.refined",
        time: addDays(expressedAt, randomInt(1, 20)),
        data: {
          title: `${makeIntentTitle(activity)} (konkretisiert)`,
          description: "Vorzugsweise unter der Woche abends.",
          visibility: pick(["public", "contacts"]),
        },
      });
    }

    if (oneIn(6)) {
      push({
        key: `intent/${i}/withdrawn`,
        actor: owner.id,
        subject: intentId,
        type: "realite.intent.withdrawn",
        time: addDays(expressedAt, randomInt(3, 30)),
        data: {
          reason: pick(["not-interested-anymore", "found-alternative", "other"]),
        },
      });
    } else if (oneIn(5)) {
      const planId = makeId("seed", "plan", String(randomInt(0, PLAN_COUNT - 1)));
      push({
        key: `intent/${i}/fulfilled`,
        actor: owner.id,
        subject: intentId,
        type: "realite.intent.fulfilled",
        time: addDays(expressedAt, randomInt(3, 25)),
        data: {
          fulfilledByPlanId: planId,
          comment: "Hat sich schnell ergeben.",
        },
      });
    }
  }

  for (let i = 0; i < INTENT_REQUEST_COUNT; i++) {
    const fromUser = users[randomInt(0, users.length - 1)]!;
    let toUser = users[randomInt(0, users.length - 1)]!;
    while (toUser.id === fromUser.id) {
      toUser = users[randomInt(0, users.length - 1)]!;
    }
    const requestId = makeId("seed", "intent-request", String(i));
    const activity = randomActivity();
    const sentAt = addDays(now, randomInt(-45, 10));

    push({
      key: `intent-request/${i}/sent`,
      actor: fromUser.id,
      subject: requestId,
      type: "realite.intent-request.sent",
      time: sentAt,
      data: {
        toUserId: toUser.id,
        activity,
        title: makeIntentTitle(activity),
        message: makeIntentMessage(activity),
      },
    });

    if (oneIn(4)) continue;

    const status = pick(["accepted", "declined", "counter"] as const);
    push({
      key: `intent-request/${i}/responded`,
      actor: toUser.id,
      subject: requestId,
      type: "realite.intent-request.responded",
      time: addHours(sentAt, randomInt(4, 72)),
      data: {
        status,
        message: status === "declined" ? "Diese Woche passt es leider nicht." : "Klingt gut!",
        planId:
          status === "accepted"
            ? makeId("seed", "plan", String(randomInt(0, PLAN_COUNT - 1)))
            : undefined,
      },
    });
  }

  for (let i = 0; i < PLAN_EXCHANGE_COUNT; i++) {
    const creator = users[randomInt(0, users.length - 1)]!;
    const activity = randomActivity();
    const cityVenue = pick(getVenuesForCity(creator.city));
    const exchangeId = makeId("seed", "exchange", String(i));
    const start = addDays(now, randomInt(-8, 35));
    const end = addHours(start, pick([1, 2, 3]));
    const visibility = pick(["public", "contacts", "specific"] as const);
    const specificTargets =
      visibility === "specific"
        ? [pick(users.filter((u) => u.id !== creator.id)).id]
        : [];
    const createdAt = addDays(now, randomInt(-20, 8));

    push({
      key: `exchange/${i}/created`,
      actor: creator.id,
      subject: exchangeId,
      type: "realite.plan-exchange.created",
      time: createdAt,
      data: {
        plan: makeExchangePlan(activity, cityVenue, start, end, specificTargets),
        visibility,
        toUserIds: specificTargets.length > 0 ? specificTargets : undefined,
      },
    });

    if (oneIn(4)) {
      push({
        key: `exchange/${i}/refined`,
        actor: creator.id,
        subject: exchangeId,
        type: "realite.plan-exchange.refined",
        time: addHours(createdAt, randomInt(4, 48)),
        data: {
          plan: {
            certainty: Number(randomFloat(0.45, 0.99).toFixed(2)),
            what: {
              title: `${makePlanTitle(activity, cityVenue)} (angepasst)`,
            },
          },
        },
      });
    }

    if (oneIn(3)) {
      const responder = pick(users.filter((u) => u.id !== creator.id));
      const responseStatus = pick(["accepted", "declined", "counter"] as const);
      push({
        key: `exchange/${i}/responded`,
        actor: responder.id,
        subject: exchangeId,
        type: "realite.plan-exchange.responded",
        time: addHours(createdAt, randomInt(6, 96)),
        data: {
          status: responseStatus,
          message:
            responseStatus === "declined"
              ? "Danke, aber diesmal nicht."
              : "Sieht gut aus.",
          counterPlan:
            responseStatus === "counter"
              ? {
                  certainty: Number(randomFloat(0.4, 0.8).toFixed(2)),
                  when: {
                    start: addDays(start, 1).toISOString(),
                    end: addDays(end, 1).toISOString(),
                  },
                }
              : undefined,
        },
      });
    }

    if (oneIn(9)) {
      push({
        key: `exchange/${i}/withdrawn`,
        actor: creator.id,
        subject: exchangeId,
        type: "realite.plan-exchange.withdrawn",
        time: addHours(createdAt, randomInt(12, 120)),
        data: {
          reason: pick(["not-interested-anymore", "done", "other"]),
        },
      });
    }
  }

  events.sort((a, b) => a.time.getTime() - b.time.getTime());
  return events;
}

async function run() {
  const users = buildUsers();
  const events = buildEvents(users);
  const ids = events.map((event) => event.id);
  const totalByType = new Map<string, number>();

  for (const event of events) {
    totalByType.set(event.type, (totalByType.get(event.type) ?? 0) + 1);
  }

  console.log(`Seed prepared: ${events.length} events for ${users.length} users.`);
  console.log("Event distribution:");
  for (const [type, count] of [...totalByType.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`  - ${type}: ${count}`);
  }

  if (DRY_RUN) {
    console.log("Dry run enabled, no database writes performed.");
    return;
  }

  const existingRows =
    ids.length === 0
      ? []
      : await db
          .select({ id: schema.events.id })
          .from(schema.events)
          .where(inArray(schema.events.id, ids));
  const existingIds = new Set(existingRows.map((row) => row.id));

  const missingEvents = events.filter((event) => !existingIds.has(event.id));
  console.log(
    `Existing seed events: ${existingIds.size}. Missing events to insert: ${missingEvents.length}.`
  );

  let inserted = 0;
  for (const event of missingEvents) {
    await es.add({
      id: event.id,
      type: event.type as any,
      actor: event.actor,
      subject: event.subject,
      data: event.data as any,
      time: event.time,
    });
    inserted += 1;
    if (inserted % 100 === 0) {
      console.log(`Inserted ${inserted}/${missingEvents.length} events...`);
    }
  }

  const [planCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.plans);
  const [intentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.intents);
  const [intentRequestCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.intentRequests);
  const [eventCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.events);

  console.log("Seed completed.");
  console.log(`Inserted new events: ${inserted}`);
  console.log(`Skipped existing events: ${events.length - inserted}`);
  console.log("Current database totals:");
  console.log(`  - events: ${eventCount?.count ?? 0}`);
  console.log(`  - plans: ${planCount?.count ?? 0}`);
  console.log(`  - intents: ${intentCount?.count ?? 0}`);
  console.log(`  - intent_requests: ${intentRequestCount?.count ?? 0}`);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
  });
