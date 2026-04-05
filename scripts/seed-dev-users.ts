/**
 * Lokalen Dev-Datensatz mit 10 Testnutzern anlegen (Auth + App-Tabellen).
 *
 * Voraussetzungen: DATABASE_URL (z. B. .env.local), Migrationen angewendet.
 * Login (nur wenn E-Mail/Passwort in better-auth aktiv, typisch Development):
 *   E-Mail: seed.user.<1-10>@realite.local
 *   Passwort: siehe SEED_USER_PASSWORD unten oder Env REALITE_SEED_USER_PASSWORD
 *
 * Idempotent: Bereits vorhandene Nutzer (gleiche E-Mail in auth_user) werden übersprungen.
 *
 * Ausführung: bun run db:seed
 */
import { config as loadEnv } from "dotenv";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { authAccount, authUser } from "@/src/db/auth-schema";
import { getDb } from "@/src/db/client";
import {
  datingProfiles,
  eventComments,
  events,
  eventTags,
  groupContacts,
  tagPreferences,
} from "@/src/db/schema";
import {
  ensureAlleGroupForUser,
  ensureKontakteGroupForUser,
  ensureUserDatingProfile,
  ensureUserSuggestionSettings,
  upsertUser,
} from "@/src/lib/repository";

loadEnv({ path: ".env.local" });
loadEnv();

const SEED_EMAIL_DOMAIN = "realite.local";
const SEED_USER_PASSWORD =
  process.env.REALITE_SEED_USER_PASSWORD?.trim() || "RealiteSeed-10users!";

type Persona = {
  slug: string;
  givenName: string;
  familyName: string;
  city: string;
  /** Profilbild (stabiler externer Avatar) */
  imageSeed: string;
  dating?: {
    enabled: boolean;
    birthYear: number;
    gender: "woman" | "man" | "non_binary";
    isSingle: boolean;
  };
};

const PERSONAS: Persona[] = [
  {
    slug: "lena",
    givenName: "Lena",
    familyName: "Krämer",
    city: "Berlin",
    imageSeed: "lena-k",
    dating: { enabled: true, birthYear: 1996, gender: "woman", isSingle: true },
  },
  {
    slug: "jonas",
    givenName: "Jonas",
    familyName: "Weber",
    city: "Hamburg",
    imageSeed: "jonas-w",
    dating: { enabled: false, birthYear: 1992, gender: "man", isSingle: false },
  },
  {
    slug: "mira",
    givenName: "Mira",
    familyName: "Öztürk",
    city: "Köln",
    imageSeed: "mira-o",
    dating: { enabled: true, birthYear: 1999, gender: "woman", isSingle: true },
  },
  {
    slug: "felix",
    givenName: "Felix",
    familyName: "Brandt",
    city: "München",
    imageSeed: "felix-b",
  },
  {
    slug: "sophie",
    givenName: "Sophie",
    familyName: "Nguyen",
    city: "Frankfurt",
    imageSeed: "sophie-n",
    dating: { enabled: true, birthYear: 1994, gender: "woman", isSingle: false },
  },
  {
    slug: "tim",
    givenName: "Tim",
    familyName: "Hoffmann",
    city: "Leipzig",
    imageSeed: "tim-h",
  },
  {
    slug: "aya",
    givenName: "Aya",
    familyName: "Schmidt",
    city: "Stuttgart",
    imageSeed: "aya-s",
    dating: { enabled: false, birthYear: 2001, gender: "non_binary", isSingle: true },
  },
  {
    slug: "max",
    givenName: "Max",
    familyName: "Klein",
    city: "Dresden",
    imageSeed: "max-k",
  },
  {
    slug: "julia",
    givenName: "Julia",
    familyName: "Meier",
    city: "Nürnberg",
    imageSeed: "julia-m",
  },
  {
    slug: "omar",
    givenName: "Omar",
    familyName: "Haddad",
    city: "Bremen",
    imageSeed: "omar-h",
  },
];

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

async function seedAuthAndAppUser(persona: Persona, index1: number) {
  const db = getDb();
  const email = `seed.user.${index1}@${SEED_EMAIL_DOMAIN}`;
  const displayName = `${persona.givenName} ${persona.familyName}`;
  const image = avatarUrl(persona.imageSeed);

  const [existingAuth] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  if (existingAuth) {
    console.log(`[seed] überspringe (bereits vorhanden): ${email}`);
    const appUser = await upsertUser({ email, name: displayName, image });
    await ensureUserSuggestionSettings(appUser.id);
    await ensureUserDatingProfile(appUser.id);
    await ensureAlleGroupForUser(appUser.id);
    await ensureKontakteGroupForUser(appUser.id);
    return appUser;
  }

  const authUserId = generateId();
  const accountRowId = generateId();
  const passwordHash = await hashPassword(SEED_USER_PASSWORD);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(authUser).values({
      id: authUserId,
      name: displayName,
      email,
      emailVerified: true,
      image,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(authAccount).values({
      id: accountRowId,
      accountId: authUserId,
      providerId: "credential",
      userId: authUserId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  });

  const appUser = await upsertUser({ email, name: displayName, image });
  await ensureUserSuggestionSettings(appUser.id);
  await ensureUserDatingProfile(appUser.id);
  await ensureAlleGroupForUser(appUser.id);
  await ensureKontakteGroupForUser(appUser.id);

  if (persona.dating) {
    await db
      .update(datingProfiles)
      .set({
        enabled: persona.dating.enabled,
        birthYear: persona.dating.birthYear,
        gender: persona.dating.gender,
        isSingle: persona.dating.isSingle,
        soughtGenders: "woman,man",
        soughtAgeMin: 24,
        soughtAgeMax: 38,
        soughtOnlySingles: false,
        updatedAt: new Date(),
      })
      .where(eq(datingProfiles.userId, appUser.id));
  }

  console.log(`[seed] angelegt: ${email} → App-User ${appUser.id}`);
  return appUser;
}

async function seedTagPreferences(userId: string, tags: Array<{ tag: string; weight: number; votes: number }>) {
  const db = getDb();
  for (const row of tags) {
    await db
      .insert(tagPreferences)
      .values({
        userId,
        tag: row.tag,
        weight: row.weight,
        votes: row.votes,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tagPreferences.userId, tagPreferences.tag],
        set: {
          weight: row.weight,
          votes: row.votes,
          updatedAt: new Date(),
        },
      });
  }
}

async function seedSharedDemoContent(appUsers: { id: string; email: string }[]) {
  if (appUsers.length < 3) {
    return;
  }

  const db = getDb();
  const u = (i: number) => appUsers[i - 1];
  const inDays = (d: number, h: number, m: number) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(h, m, 0, 0);
    return x;
  };

  const demoEvents: Array<{
    seedKey: string;
    title: string;
    description: string | null;
    location: string | null;
    startsAt: Date;
    endsAt: Date;
    visibility: "public" | "group" | "friends" | "friends_of_friends" | "smart_date";
    joinMode: "direct" | "request" | "interest";
    category: "default" | "meeting" | "work" | "personal" | "sport" | "social" | "birthday" | "date";
    createdBy: string;
    tags: string[];
  }> = [
    {
      seedKey: "demo-after-work-lauf",
      title: "After-Work Lauf #alle",
      description: "Lockerer 5k am Kanal, danach optional Getränk.",
      location: "Treffpunkt: Maybachufer, Berlin",
      startsAt: inDays(2, 18, 30),
      endsAt: inDays(2, 20, 0),
      visibility: "public",
      joinMode: "direct",
      category: "sport",
      createdBy: u(1).id,
      tags: ["#alle", "sport", "laufen"],
    },
    {
      seedKey: "demo-kaffeerunde-samstag",
      title: "Kaffeerunde Samstag",
      description: "Platz für 4–5 Personen, kein Stress.",
      location: "Café Lotte, Hamburg",
      startsAt: inDays(5, 10, 0),
      endsAt: inDays(5, 12, 0),
      visibility: "friends",
      joinMode: "request",
      category: "social",
      createdBy: u(2).id,
      tags: ["kaffee", "samstag"],
    },
    {
      seedKey: "demo-konzert-indie",
      title: "Konzert: Indie im Club",
      description: "Tickets sind schon da, es gibt noch 1 Platz.",
      location: "Club Bahnhof, Köln",
      startsAt: inDays(9, 20, 0),
      endsAt: inDays(9, 23, 30),
      visibility: "public",
      joinMode: "interest",
      category: "social",
      createdBy: u(3).id,
      tags: ["#alle", "musik", "abend"],
    },
    {
      seedKey: "demo-sonntagsbrunch",
      title: "Sonntagsbrunch (klein)",
      description: "Vegetarisch-heavy, bringt was mit wenn ihr mögt.",
      location: "Glockenbach, München",
      startsAt: inDays(7, 11, 0),
      endsAt: inDays(7, 14, 0),
      visibility: "friends_of_friends",
      joinMode: "direct",
      category: "social",
      createdBy: u(4).id,
      tags: ["brunch", "sonntag"],
    },
    {
      seedKey: "demo-spieleabend",
      title: "Spieleabend: Brett + Switch",
      description: "Wingspan und Mario Kart, gern kurz zusagen.",
      location: "Bei Sophie, Frankfurt",
      startsAt: inDays(3, 19, 0),
      endsAt: inDays(3, 22, 30),
      visibility: "friends",
      joinMode: "direct",
      category: "personal",
      createdBy: u(5).id,
      tags: ["spiele", "abend"],
    },
  ];

  for (const ev of demoEvents) {
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.sourceProvider, "realite_seed"), eq(events.sourceEventId, ev.seedKey)))
      .limit(1);

    if (existing) {
      continue;
    }

    const [row] = await db
      .insert(events)
      .values({
        title: ev.title,
        description: ev.description,
        location: ev.location,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        visibility: ev.visibility,
        joinMode: ev.joinMode,
        category: ev.category,
        createdBy: ev.createdBy,
        allowOnSiteVisibility: ev.visibility === "public",
        sourceProvider: "realite_seed",
        sourceEventId: ev.seedKey,
      })
      .returning({ id: events.id });

    if (!row) {
      continue;
    }

    for (const tag of ev.tags) {
      await db.insert(eventTags).values({ eventId: row.id, tag }).onConflictDoNothing();
    }

    if (ev.seedKey === "demo-after-work-lauf") {
      await db.insert(eventComments).values({
        eventId: row.id,
        userId: u(2).id,
        body: "Klingt gut — ich bin dabei, wenn das Wetter mitspielt.",
      });
      await db.insert(eventComments).values({
        eventId: row.id,
        userId: u(3).id,
        body: "Ich könnte etwas später dazukommen, melde mich.",
      });
    }
  }
}

async function seedKontakteSamples(
  appUsers: { id: string; email: string; displayName: string }[],
) {
  const db = getDb();
  const first = appUsers[0];
  if (!first) {
    return;
  }

  const kontakte = await ensureKontakteGroupForUser(first.id);

  const samples = appUsers.slice(1, 6);
  for (const contact of samples) {
    await db
      .insert(groupContacts)
      .values({
        groupId: kontakte.id,
        email: contact.email,
        name: contact.displayName,
        image: avatarUrl(contact.email),
        source: "manual",
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: [groupContacts.groupId, groupContacts.email] });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ist nicht gesetzt (z. B. in .env.local).");
  }

  const appUsers: { id: string; email: string; displayName: string }[] = [];

  for (let i = 0; i < PERSONAS.length; i++) {
    const persona = PERSONAS[i];
    if (!persona) {
      continue;
    }
    const user = await seedAuthAndAppUser(persona, i + 1);
    const displayName = `${persona.givenName} ${persona.familyName}`;
    appUsers.push({ id: user.id, email: user.email, displayName });

    if (i === 0) {
      await seedTagPreferences(user.id, [
        { tag: "kaffee", weight: 0.8, votes: 3 },
        { tag: "laufen", weight: 0.6, votes: 2 },
        { tag: "musik", weight: 0.4, votes: 1 },
      ]);
    }
    if (i === 4) {
      await seedTagPreferences(user.id, [
        { tag: "brettspiele", weight: 1, votes: 4 },
        { tag: "abend", weight: 0.5, votes: 2 },
      ]);
    }
  }

  await seedKontakteSamples(appUsers);
  await seedSharedDemoContent(appUsers);

  console.log("");
  console.log("[seed] fertig. Login (Development, falls E-Mail/Passwort aktiv):");
  console.log(`  Passwort für alle: ${SEED_USER_PASSWORD}`);
  console.log("  E-Mails: seed.user.1@realite.local … seed.user.10@realite.local");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
