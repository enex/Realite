import { z } from "zod";

import type { EventData } from "@realite/db/events";
import { asc, inArray, or } from "@realite/db";
import { db } from "@realite/db/client";
import { createEvent } from "@realite/db/events";
import { Event, PhoneNumber, User } from "@realite/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { applyEvent, createRealite } from "./realite";

export const contactRouter = createTRPCRouter({
  importContacts: protectedProcedure
    .input(
      z.object({
        hashes: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;

      await db.insert(Event).values(
        createEvent({
          type: "contacts-imported",
          actorId: userId,
          subject: userId,
          data: {
            hashes: input.hashes,
          },
        }),
      );
    }),
  /**
   * List known contacts that are already on Realite by matching imported phoneNumber hashes
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.session;

    // Find latest contacts-imported event for this user
    const imported = await db.query.Event.findMany({
      where: (t, { and, eq }) =>
        and(eq(t.type, "contacts-imported"), eq(t.actorId, userId)),
      orderBy: [asc(Event.time)],
    });

    const last = imported[imported.length - 1];
    const hashes: string[] =
      (last?.data as { hashes?: string[] } | undefined)?.hashes ?? [];

    // Start building results from imported phone matches (if any)
    let contacts: { id: string; name: string | null; image: string | null }[] =
      [];
    if (hashes.length) {
      const users = await db.query.User.findMany({
        where: (t) =>
          or(
            inArray(t.phoneNumberHash, hashes as unknown as string[]),
            inArray(
              t.id,
              db
                .select({ id: PhoneNumber.userId })
                .from(PhoneNumber)
                .where(
                  inArray(
                    PhoneNumber.phoneNumberHash,
                    hashes as unknown as string[],
                  ),
                ),
            ),
          ),
        columns: { id: true, name: true, image: true },
      });
      contacts = users;
    }

    // Merge in contacts established via invite links (contact-linked events)
    const contactLinkEvents = await db.query.Event.findMany({
      where: (t, { and, or: _or, eq }) =>
        _or(
          and(eq(t.type, "contact-linked"), eq(t.actorId, userId)),
          and(eq(t.type, "contact-linked"), eq(t.subject, userId)),
        ),
      orderBy: [asc(Event.time)],
    });
    const relatedIds = new Set<string>();
    for (const ev of contactLinkEvents) {
      const data = ev.data as { userA?: string; userB?: string };
      if (data.userA && data.userA !== userId) relatedIds.add(data.userA);
      if (data.userB && data.userB !== userId) relatedIds.add(data.userB);
    }
    if (relatedIds.size > 0) {
      const viaLinks = await db.query.User.findMany({
        where: inArray(User.id, Array.from(relatedIds)),
        columns: { id: true, name: true, image: true },
      });
      // Merge and de-duplicate
      const map = new Map<
        string,
        { id: string; name: string | null; image: string | null }
      >();
      for (const c of contacts) map.set(c.id, c);
      for (const c of viaLinks) map.set(c.id, c);
      contacts = Array.from(map.values());
    }

    return { contacts };
  }),
  /** Remove a mutual contact relation */
  remove: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.session.id;
      if (me === input.userId) return;
      // Write unlink events for both sides
      await ctx.db.transaction(async (trx) => {
        await trx.insert(Event).values(
          createEvent({
            type: "contact-unlinked",
            actorId: me,
            subject: me,
            data: { userA: me, userB: input.userId },
          }),
        );
        await trx.insert(Event).values(
          createEvent({
            type: "contact-unlinked",
            actorId: input.userId,
            subject: input.userId,
            data: { userA: input.userId, userB: me },
          }),
        );
      });
      return { success: true };
    }),
  /**
   * Discover users who have public future Realites (who.anyone != null)
   */
  discoverPublic: protectedProcedure
    .input(z.object({ query: z.string().optional() }).optional())
    .query(async ({ input }) => {
      // Build minimal realite map from events
      const allEvents = await db.query.Event.findMany({
        orderBy: [asc(Event.time)],
      });
      const res = new Map<string, ReturnType<typeof createRealite>>();
      for (const ev of allEvents) {
        const r = res.get(ev.subject) ?? createRealite(ev.subject);
        res.set(r.id, applyEvent(r, ev as EventData));
      }

      const now = new Date();
      const creatorIds = new Set<string>();
      for (const r of res.values()) {
        const hasFuture = r.when.some((w) => new Date(w.start) > now);
        const isPublic = !!r.who.anyone; // public if anyone is set
        if (r.creatorId && hasFuture && isPublic) creatorIds.add(r.creatorId);
      }

      if (!creatorIds.size)
        return {
          users: [] as {
            id: string;
            name: string | null;
            image: string | null;
          }[],
        };

      const q = (input?.query ?? "").trim().toLowerCase();
      const users = await db.query.User.findMany({
        where: inArray(User.id, Array.from(creatorIds)),
        columns: { id: true, name: true, image: true },
      });

      const filtered = q
        ? users.filter((u) => (u.name ?? "").toLowerCase().includes(q))
        : users;

      return { users: filtered };
    }),
});
