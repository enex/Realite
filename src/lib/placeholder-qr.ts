import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/src/db/client";
import { events, placeholderQrCodes } from "@/src/db/schema";
import { SINGLES_HERE_SOURCE_PROVIDER } from "@/src/lib/singles-here";

const QR_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const QR_SLUG_LENGTH = 7;

export function generateQrSlug(): string {
  const bytes = new Uint8Array(QR_SLUG_LENGTH);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < QR_SLUG_LENGTH; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(
    bytes,
    (b) => QR_SLUG_ALPHABET[b % QR_SLUG_ALPHABET.length],
  ).join("");
}

export type PlaceholderQrCode = {
  id: string;
  slug: string;
  ownedBy: string | null;
  singlesSlug: string | null;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlaceholderQrWithEvent = PlaceholderQrCode & {
  singlesEventName: string | null;
};

export async function getPlaceholderQrBySlug(
  slug: string,
): Promise<PlaceholderQrWithEvent | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: placeholderQrCodes.id,
      slug: placeholderQrCodes.slug,
      ownedBy: placeholderQrCodes.ownedBy,
      singlesSlug: placeholderQrCodes.singlesSlug,
      label: placeholderQrCodes.label,
      createdAt: placeholderQrCodes.createdAt,
      updatedAt: placeholderQrCodes.updatedAt,
      // Join the singles event by its slug (stored as sourceEventId)
      singlesEventTitle: events.title,
    })
    .from(placeholderQrCodes)
    .leftJoin(
      events,
      and(
        eq(events.sourceProvider, SINGLES_HERE_SOURCE_PROVIDER),
        eq(events.sourceEventId, placeholderQrCodes.singlesSlug),
      ),
    )
    .where(eq(placeholderQrCodes.slug, slug))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    singlesEventName: row.singlesEventTitle
      ? row.singlesEventTitle.replace(/#[^\s]+/gi, "").trim()
      : null,
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export async function createPlaceholderQr(input: {
  ownedBy: string;
  label?: string | null;
}): Promise<PlaceholderQrCode> {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateQrSlug();
    try {
      const [row] = await db
        .insert(placeholderQrCodes)
        .values({
          slug,
          ownedBy: input.ownedBy,
          label: input.label ?? null,
        })
        .returning();
      if (row) return row;
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < 4) continue;
      throw err;
    }
  }
  throw new Error("QR-Code konnte nicht generiert werden.");
}

export async function claimPlaceholderQr(input: {
  slug: string;
  userId: string;
}): Promise<PlaceholderQrCode | null> {
  const db = getDb();
  const [row] = await db
    .update(placeholderQrCodes)
    .set({ ownedBy: input.userId, updatedAt: new Date() })
    .where(
      and(
        eq(placeholderQrCodes.slug, input.slug),
        isNull(placeholderQrCodes.ownedBy),
      ),
    )
    .returning();
  return row ?? null;
}

export async function linkSinglesEventToQr(input: {
  slug: string;
  userId: string;
  singlesSlug: string;
}): Promise<PlaceholderQrCode | null> {
  const db = getDb();
  const [row] = await db
    .update(placeholderQrCodes)
    .set({ singlesSlug: input.singlesSlug, updatedAt: new Date() })
    .where(
      and(
        eq(placeholderQrCodes.slug, input.slug),
        eq(placeholderQrCodes.ownedBy, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function unlinkSinglesEventFromQr(input: {
  slug: string;
  userId: string;
}): Promise<PlaceholderQrCode | null> {
  const db = getDb();
  const [row] = await db
    .update(placeholderQrCodes)
    .set({ singlesSlug: null, updatedAt: new Date() })
    .where(
      and(
        eq(placeholderQrCodes.slug, input.slug),
        eq(placeholderQrCodes.ownedBy, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function updateQrLabel(input: {
  slug: string;
  userId: string;
  label: string | null;
}): Promise<PlaceholderQrCode | null> {
  const db = getDb();
  const [row] = await db
    .update(placeholderQrCodes)
    .set({ label: input.label, updatedAt: new Date() })
    .where(
      and(
        eq(placeholderQrCodes.slug, input.slug),
        eq(placeholderQrCodes.ownedBy, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deletePlaceholderQr(input: {
  slug: string;
  userId: string;
}): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(placeholderQrCodes)
    .where(
      and(
        eq(placeholderQrCodes.slug, input.slug),
        eq(placeholderQrCodes.ownedBy, input.userId),
      ),
    )
    .returning({ id: placeholderQrCodes.id });
  return result.length > 0;
}

export async function listPlaceholderQrsForUser(
  userId: string,
): Promise<PlaceholderQrWithEvent[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: placeholderQrCodes.id,
      slug: placeholderQrCodes.slug,
      ownedBy: placeholderQrCodes.ownedBy,
      singlesSlug: placeholderQrCodes.singlesSlug,
      label: placeholderQrCodes.label,
      createdAt: placeholderQrCodes.createdAt,
      updatedAt: placeholderQrCodes.updatedAt,
      singlesEventTitle: events.title,
    })
    .from(placeholderQrCodes)
    .leftJoin(
      events,
      and(
        eq(events.sourceProvider, SINGLES_HERE_SOURCE_PROVIDER),
        eq(events.sourceEventId, placeholderQrCodes.singlesSlug),
      ),
    )
    .where(eq(placeholderQrCodes.ownedBy, userId))
    .orderBy(desc(placeholderQrCodes.createdAt));

  return rows.map((row) => ({
    ...row,
    singlesEventName: row.singlesEventTitle
      ? row.singlesEventTitle.replace(/#[^\s]+/gi, "").trim()
      : null,
  }));
}
