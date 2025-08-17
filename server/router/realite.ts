/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExpoPushMessage } from "expo-server-sdk";
import * as uuid from "uuid";
import { z } from "zod";

import type { EventData } from "@realite/db/events";
import type { When, Where, Who } from "@realite/validators";
import { asc, eq, inArray } from "@realite/db";
import { db } from "@realite/db/client";
import { Event, User } from "@realite/db/schema";
import {
  categoryIdSchema,
  getAllCategoriesInHierarchy,
  whatSchema,
  whenSchema,
  whereInputSchema,
  whoInputSchema,
} from "@realite/validators";

import { saveEventWithAnalytics } from "../events";
import { sendCappedPushesToUsers } from "../push";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { isWithinRadius } from "../utils/distance";
import { sendCappedWebPushToUsers } from "../web-push";

export type What = z.infer<typeof whatSchema>;

export interface Realite {
  id: string;
  creatorId: string;
  what: What;
  when: When[];
  where: Where[];
  who: Who;
  retracted?: { reason: string };
  participants: Record<string, { when: When[]; where: string[] }>;
  parentId?: string; // optional hierarchical parent
}

const createRealiteInputSchema = z.object({
  what: whatSchema,
  when: z.array(whenSchema),
  where: z.array(whereInputSchema.extend({ id: z.string() })),
  who: whoInputSchema,
});

export const realiteRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createRealiteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.session;
      const id = uuid.v7();

      await saveEventWithAnalytics(ctx.db, {
        type: "realite-created",
        actorId: userId,
        subject: id,
        data: input,
      });

      // Send push to all registered users that can participate in the realite
      const realite = await getRealiteById(id);
      const explicitParticipants = realite.who.explicit;
      const participantsNumberHash = Object.entries(explicitParticipants)
        .filter(([_, included]) => included)
        .map(([hash, _]) => hash);
      const users = await db.query.User.findMany({
        where: inArray(User.phoneNumberHash, participantsNumberHash),
        columns: { id: true },
      });
      const pushMsg: ExpoPushMessage & { to: string | string[] } = {
        to: users.map((user) => user.id),
        title: "Ein Kontakt von dir möchte sich treffen",
        body: `Auch lust auf ${realite.what.title}?`,
        data: { url: `/realites/${id}` },
      };
      await Promise.all([
        sendCappedPushesToUsers([pushMsg], 3),
        sendCappedWebPushToUsers([pushMsg], 3),
      ]);
      return { id };
    }),
  /**
   * Copy an existing realite as current user (replaces explicit participation).
   */
  copyFrom: protectedProcedure
    .input(
      z.object({
        sourceId: z.string().uuid(),
        when: z.array(whenSchema).optional(),
        whereIds: z.array(z.string()).optional(),
        linkAsSubOf: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await getRealiteById(input.sourceId);
      const selectedWhen =
        input.when && input.when.length > 0 ? input.when : source.when;
      const selectedWhere =
        input.whereIds && input.whereIds.length > 0
          ? source.where.filter((w) => input.whereIds!.includes(w.id))
          : source.where;

      const newId = uuid.v7();
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-created",
        actorId: ctx.session.id,
        subject: newId,
        data: {
          what: source.what,
          when: selectedWhen,
          where: selectedWhere,
          who: source.who, // preserve visibility model (public/contacts)
        },
      });
      if (input.linkAsSubOf) {
        await saveEventWithAnalytics(ctx.db, {
          type: "realite-sub-linked",
          actorId: ctx.session.id,
          subject: newId,
          data: { parentId: input.linkAsSubOf },
        });
      }
      return { id: newId };
    }),
  retract: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-retracted",
        actorId: ctx.session.id,
        subject: input.id,
        data: input,
      });
    }),
  yes: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        when: z.array(whenSchema),
        where: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input: { id, ...payload } }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-yes",
        actorId: ctx.session.id,
        subject: id,
        data: payload,
      });
      const realite = await getRealiteById(id);
      const pushMsg: ExpoPushMessage & { to: string | string[] } = {
        to: realite.creatorId,
        title: "Deine Realite wurde angenommen",
        body:
          `${ctx.session.name ?? "Jemand"} möchte ` +
          (payload.when.length === 1
            ? `am ${new Date(payload.when[0]!.start).toLocaleDateString("de-DE")} um ${new Date(payload.when[0]!.start).toLocaleTimeString("de-DE")}`
            : `zu ${payload.when.length} Terminen`) +
          " mit dir treffen.",
        data: { url: `/realites/${id}` },
      };
      await Promise.all([
        sendCappedPushesToUsers([pushMsg], 3),
        sendCappedWebPushToUsers([pushMsg], 3),
      ]);
    }),
  accept: protectedProcedure
    .meta({
      description:
        "As creator of a realite, you can accept a proposal. This will add the participants to the realite.",
    })
    .input(
      z.object({
        id: z.string(),
        when: whenSchema,
        where: whereInputSchema,
        who: z.string().uuid().array(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-accepted",
        actorId: ctx.session.id,
        subject: input.id,
        data: input,
      });
    }),
  change: protectedProcedure
    .input(
      createRealiteInputSchema
        .partial()
        .omit({ what: true })
        .extend({ id: z.string(), what: whatSchema.partial() }),
    )
    .mutation(async ({ ctx, input: { id, ...payload } }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-changed",
        actorId: ctx.session.id,
        subject: id,
        data: payload,
      });
    }),
  /**
   * Mark a realite as seen by current user (open, swipe, etc.)
   */
  seen: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        via: z.enum(["open", "swipe", "other"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-seen",
        actorId: ctx.session.id,
        subject: input.id,
        data: { via: input.via ?? "other" },
      });
      return { success: true };
    }),
  /**
   * Link a realite as a sub of another realite
   */
  linkSub: protectedProcedure
    .input(z.object({ id: z.string().uuid(), parentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only creator of child can link
      const child = await getRealiteById(input.id);
      if (child.creatorId !== ctx.session.id) {
        throw new Error("Only the creator can link a sub realite");
      }
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-sub-linked",
        actorId: ctx.session.id,
        subject: input.id,
        data: { parentId: input.parentId },
      });
      return { success: true };
    }),
  unlinkSub: protectedProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const child = await getRealiteById(input.id);
      if (child.creatorId !== ctx.session.id) {
        throw new Error("Only the creator can unlink a sub realite");
      }
      if (!child.parentId) return { success: true };
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-sub-unlinked",
        actorId: ctx.session.id,
        subject: input.id,
        data: { parentId: child.parentId, reason: input.reason },
      });
      return { success: true };
    }),
  no: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { id, reason } }) => {
      await saveEventWithAnalytics(ctx.db, {
        type: "realite-no",
        actorId: ctx.session.id,
        subject: id,
        data: { reason },
      });
    }),
  /**
   * Overview feed grouped by day and time slots, with aggregated duplicates
   * (same title and nearby location) combined.
   */
  overview: protectedProcedure
    .input(
      z.object({
        categories: z.array(categoryIdSchema).optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radius: z.number().optional().default(5000),
          })
          .optional(),
        timeRange: z
          .object({
            startDate: z.coerce.date().optional(),
            endDate: z.coerce.date().optional(),
          })
          .optional(),
        creator: z.enum(["me", "other", "any"]).default("any"),
        maxDays: z.number().min(1).max(31).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const allEvents = await ctx.db.query.Event.findMany({
        orderBy: [asc(Event.time)],
      });

      const res = new Map<string, Realite>();
      for (const event of allEvents) {
        const realite = res.get(event.subject) ?? createRealite(event.subject);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        res.set(realite.id, applyEvent(realite, event as EventData));
      }

      // Track which realites current user explicitly declined (realite-no)
      const declinedByCurrentUserIds = new Set<string>();
      for (const ev of allEvents) {
        if (ev.type === "realite-no" && ev.actorId === ctx.session.id) {
          declinedByCurrentUserIds.add(ev.subject);
        }
      }

      // Track which realites current user has seen (realite-seen)
      const seenByCurrentUserIds = new Set<string>();
      for (const ev of allEvents) {
        if (ev.type === "realite-seen" && ev.actorId === ctx.session.id) {
          seenByCurrentUserIds.add(ev.subject);
        }
      }

      const all = Array.from(res.values());
      const filtered = all.filter((realite) => {
        // Base filters
        if (
          realite.retracted ||
          !realite.creatorId ||
          (input.creator !== "any" &&
            ((input.creator === "me" && realite.creatorId !== ctx.session.id) ||
              (input.creator === "other" &&
                realite.creatorId === ctx.session.id)))
        ) {
          return false;
        }

        // Time range filter
        if (input.timeRange?.startDate || input.timeRange?.endDate) {
          const hasValidTime = realite.when.some((time) => {
            const timeStart = new Date(time.start);
            const startDateCheck =
              !input.timeRange?.startDate ||
              timeStart >= input.timeRange.startDate;
            const endDateCheck =
              !input.timeRange?.endDate || timeStart <= input.timeRange.endDate;
            return startDateCheck && endDateCheck;
          });
          if (!hasValidTime) return false;
        }

        // Location filter
        if (input.location) {
          const { latitude, longitude, radius } = input.location;

          if (realite.where.length === 0) {
            return true; // allow online/unknown locations
          }

          const hasLocationWithinRadius = realite.where.some((location) =>
            isWithinRadius(
              latitude,
              longitude,
              location.latitude,
              location.longitude,
              radius,
            ),
          );
          if (!hasLocationWithinRadius) return false;
        }

        // Category filter
        if (input.categories && input.categories.length > 0) {
          const allowedCategoryIds = new Set(
            input.categories.flatMap((catId) =>
              getAllCategoriesInHierarchy(catId).map(
                (c: { id: string }) => c.id,
              ),
            ),
          );
          if (!allowedCategoryIds.has(realite.what.category)) return false;
        }

        return true;
      });

      // Build overview grouped by day and time slots
      const now = new Date();
      const maxDays = input.maxDays;
      const startBoundary = input.timeRange?.startDate ?? now;
      const endBoundary =
        input.timeRange?.endDate ?? new Date(now.getTime() + 14 * 86400000);

      type Slot = "morning" | "afternoon" | "evening" | "night";
      interface OverviewItem {
        key: string;
        title: string;
        category: What["category"];
        url?: string;
        locations: Where[];
        times: When[];
        creators: string[];
        participantIds: string[];
        representativeRealiteId: string;
        memberRealiteIds: string[];
        minParticipants?: number;
        declinedByCurrentUser?: boolean;
        seenByCurrentUser?: boolean;
      }
      interface SlotBucket {
        slot: Slot;
        items: OverviewItem[];
      }
      interface _DayBucket {
        date: string; // YYYY-MM-DD
        label: string; // Heute, Morgen, Freitag
        slots: SlotBucket[];
      }

      const dayMap = new Map<
        string,
        { label: string; slots: Map<Slot, Map<string, OverviewItem>> }
      >();

      const normalizeTitle = (t: string) =>
        t
          .toLowerCase()
          .replace(/[\p{P}\p{S}]+/gu, " ")
          .replace(/\s+/g, " ")
          .trim();

      const dayKeyOf = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${da}`;
      };
      const dayLabelOf = (d: Date) => {
        const today = new Date();
        const todayKey = dayKeyOf(today);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowKey = dayKeyOf(tomorrow);
        const key = dayKeyOf(d);
        if (key === todayKey) return "Heute";
        if (key === tomorrowKey) return "Morgen";
        return d.toLocaleDateString("de-DE", { weekday: "long" });
      };
      const slotOf = (d: Date): Slot => {
        const h = d.getHours();
        if (h >= 5 && h < 12) return "morning";
        if (h >= 12 && h < 18) return "afternoon";
        if (h >= 18 && h < 23) return "evening";
        return "night";
      };
      const areLocationsNear = (a?: Where, b?: Where) => {
        if (!a || !b) return false;
        return isWithinRadius(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude,
          100,
        );
      };

      for (const r of filtered) {
        // Gather unique ids for creators and participants
        const creatorIds = new Set<string>();
        if (r.creatorId) creatorIds.add(r.creatorId);
        const participantIds = new Set<string>(Object.keys(r.participants));

        // Consider each time within the boundaries
        for (const w of r.when) {
          const start = new Date(w.start);
          if (start < startBoundary || start > endBoundary) continue;

          const dk = dayKeyOf(start);
          const lbl = dayLabelOf(start);
          if (!dayMap.has(dk)) {
            dayMap.set(dk, {
              label: lbl,
              slots: new Map<Slot, Map<string, OverviewItem>>(),
            });
          }
          const slot = slotOf(start);
          const dayEntry = dayMap.get(dk)!;
          if (!dayEntry.slots.has(slot)) dayEntry.slots.set(slot, new Map());

          // Pick a representative location (first if any)
          const loc = r.where[0];
          const titleKey = normalizeTitle(r.what.title);
          const locationKey = loc
            ? `${Math.round(loc.latitude * 10000)}:${Math.round(loc.longitude * 10000)}`
            : "no-loc";
          // grouping key per day and slot: same normalized title and near location
          const groupKey = `${titleKey}|${locationKey}`;

          // Try to merge with an existing near location group of same title
          const slotMap = dayEntry.slots.get(slot)!;
          let targetKey = groupKey;
          for (const [k, item] of slotMap.entries()) {
            if (!k.startsWith(`${titleKey}|`)) continue;
            const anyLoc = item.locations[0];
            if (areLocationsNear(anyLoc, loc)) {
              targetKey = k;
              break;
            }
          }

          const existing = slotMap.get(targetKey);
          if (!existing) {
            slotMap.set(targetKey, {
              key: targetKey,
              title: r.what.title,
              category: r.what.category,
              url: r.what.url,
              locations: r.where.length ? [...r.where] : [],
              times: [w],
              creators: Array.from(creatorIds),
              participantIds: Array.from(participantIds),
              representativeRealiteId: r.id,
              memberRealiteIds: [r.id],
              minParticipants: (r.what as any).minParticipants,
              declinedByCurrentUser: declinedByCurrentUserIds.has(r.id),
              seenByCurrentUser: seenByCurrentUserIds.has(r.id),
            });
          } else {
            // merge
            existing.times.push(w);
            for (const c of creatorIds)
              if (!existing.creators.includes(c)) existing.creators.push(c);
            for (const p of participantIds)
              if (!existing.participantIds.includes(p))
                existing.participantIds.push(p);
            for (const lw of r.where) {
              if (
                !existing.locations.some(
                  (x) => x.id === lw.id || areLocationsNear(x, lw),
                )
              ) {
                existing.locations.push(lw);
              }
            }
            if (!existing.memberRealiteIds.includes(r.id)) {
              existing.memberRealiteIds.push(r.id);
            }
            if (existing.minParticipants == null)
              existing.minParticipants = (r.what as any).minParticipants;
            existing.declinedByCurrentUser =
              !!existing.declinedByCurrentUser ||
              declinedByCurrentUserIds.has(r.id);
            existing.seenByCurrentUser =
              !!existing.seenByCurrentUser || seenByCurrentUserIds.has(r.id);
          }
        }
      }

      // Materialize days sorted and limit to maxDays
      const dayEntries = Array.from(dayMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .slice(0, maxDays)
        .map(([date, v]) => {
          const slots: Slot[] = ["morning", "afternoon", "evening", "night"];
          const slotBuckets = slots
            .map((s) => {
              const items = Array.from((v.slots.get(s) ?? new Map()).values());
              // sort items by earliest time
              items.sort((a, b) => {
                const at = new Date(a.times[0]!.start).getTime();
                const bt = new Date(b.times[0]!.start).getTime();
                return at - bt;
              });
              return { slot: s, items };
            })
            // drop empty slots for brevity
            .filter((sb) => sb.items.length > 0);
          return { date, label: v.label, slots: slotBuckets };
        })
        // drop empty days
        .filter((d) => d.slots.length > 0);

      return { days: dayEntries };
    }),
  /**
   * Find visible cluster members for a given realite (same title/location/time-overlap)
   */
  cluster: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const base = await getRealiteById(input.id);

      // Build full realite set
      const allEvents = await ctx.db.query.Event.findMany({
        orderBy: [asc(Event.time)],
      });
      const map = new Map<string, Realite>();
      for (const ev of allEvents) {
        const r = map.get(ev.subject) ?? createRealite(ev.subject);
        map.set(r.id, applyEvent(r, ev as EventData));
      }
      const all = Array.from(map.values()).filter(
        (r) => r.creatorId && !r.retracted,
      );

      const normalizeTitle = (t: string) =>
        t
          .toLowerCase()
          .replace(/[\p{P}\p{S}]+/gu, " ")
          .replace(/\s+/g, " ")
          .trim();
      const baseTitle = normalizeTitle(base.what.title);
      const baseLoc = base.where[0];

      const areLocationsNear = (a?: Where, b?: Where) => {
        if (!a || !b) return false;
        return isWithinRadius(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude,
          100,
        );
      };
      const intervalsOverlap = (
        a: { start: string; end: string },
        b: { start: string; end: string },
      ) => {
        const as = new Date(a.start).getTime();
        const ae = new Date(a.end).getTime();
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return Math.max(as, bs) < Math.min(ae, be);
      };

      // Determine visible users (contacts or public)
      const visibleUserIds = new Set<string>([ctx.session.id]);
      // contact-linked events involving current user
      const contactEvents = await ctx.db.query.Event.findMany({
        where: (t, { or, and, eq }) =>
          or(
            and(eq(t.type, "contact-linked"), eq(t.actorId, ctx.session.id)),
            and(eq(t.type, "contact-linked"), eq(t.subject, ctx.session.id)),
          ),
        orderBy: [asc(Event.time)],
      });
      for (const ev of contactEvents) {
        const d = ev.data as { userA?: string; userB?: string };
        if (d.userA) visibleUserIds.add(d.userA);
        if (d.userB) visibleUserIds.add(d.userB);
      }

      const members = all
        .filter((r) => r.id !== base.id)
        .filter((r) => normalizeTitle(r.what.title) === baseTitle)
        .filter((r) => areLocationsNear(r.where[0], baseLoc))
        .filter((r) =>
          r.when.some((rw) =>
            base.when.some((bw) => intervalsOverlap(rw as any, bw as any)),
          ),
        )
        .filter((r) => r.who.anyone || visibleUserIds.has(r.creatorId))
        .map((r) => ({
          id: r.id,
          creatorId: r.creatorId,
          what: r.what,
          when: r.when,
          where: r.where,
        }));

      // include base as first member
      members.unshift({
        id: base.id,
        creatorId: base.creatorId,
        what: base.what,
        when: base.when,
        where: base.where,
      });

      return { members };
    }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getRealiteById(input.id);
    }),
  events: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.query.Event.findMany({
        where: eq(Event.subject, input.id),
        orderBy: [asc(Event.time)],
        columns: {
          id: true,
          type: true,
          actorId: true,
          time: true,
          data: true,
        },
        limit: 100,
      });
      return events as (EventData & { id: string; time: Date })[];
    }),
  // Get realites for a specific user (created and participated)
  userRealites: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        currentUserId: z.string().optional(), // for shared/common realites
      }),
    )
    .query(async ({ input }) => {
      const { upcoming, past } = await getUserRealites(input.userId);

      // If currentUserId is provided, filter for shared realites
      let shared: Realite[] = [];
      if (input.currentUserId && input.currentUserId !== input.userId) {
        const allUserRealites = [...upcoming, ...past];
        shared = allUserRealites.filter((realite) => {
          const isUserInvolved =
            realite.creatorId === input.userId ||
            !!realite.participants[input.userId];
          const isCurrentUserInvolved =
            realite.creatorId === input.currentUserId ||
            !!(
              input.currentUserId && realite.participants[input.currentUserId]
            );
          return isUserInvolved && isCurrentUserInvolved;
        });

        // Sort shared realites by time (latest first)
        shared.sort((a, b) => {
          const aTime = a.when.find((time) => time.start)?.start;
          const bTime = b.when.find((time) => time.start)?.start;
          if (!aTime || !bTime) return 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      }

      return {
        upcoming,
        past,
        shared,
      };
    }),
});

export async function getRealiteById(id: string): Promise<Realite> {
  const events = await db.query.Event.findMany({
    where: eq(Event.subject, id),
    orderBy: [asc(Event.time)],
  });

  let realite = createRealite(id);
  for (const event of events) realite = applyEvent(realite, event as EventData);
  return realite;
}

export function createRealite(id: string): Realite {
  return {
    id,
    creatorId: "",
    what: {
      category: "OTHER",
      title: "",
      description: "",
    },
    when: [],
    where: [],
    who: { explicit: {}, contacts: true },
    participants: {},
  };
}

export function applyEvent(realite: Realite, event: EventData): Realite {
  switch (event.type) {
    case "realite-created":
    case "meet-created": // Legacy support
      return {
        ...realite,
        creatorId: event.actorId!,
        ...event.data,
        who: Array.isArray(event.data.who)
          ? { explicit: {}, contacts: true }
          : event.data.who,
      };
    case "realite-retracted":
      return {
        ...realite,
        retracted: { reason: event.data.reason },
      };
    case "realite-accepted":
      return { ...realite };
    case "realite-changed":
      return {
        ...realite,
        what: { ...realite.what, ...event.data.what },
        when: event.data.when ?? realite.when,
        where: event.data.where ?? realite.where,
        who: event.data.who ?? realite.who,
      };
    case "realite-yes":
      return {
        ...realite,
        participants: {
          ...realite.participants,
          [event.actorId!]: {
            when: event.data.when,
            where: event.data.where,
          },
        },
      };
    case "realite-no": {
      const { [event.actorId!]: _, ...rest } = realite.participants;
      return { ...realite, participants: rest };
    }
    case "realite-sub-linked":
      return { ...realite, parentId: event.data.parentId };
    case "realite-sub-unlinked":
      return { ...realite, parentId: undefined };
    default:
      return realite;
  }
}

export async function getUserRealites(userId: string): Promise<{
  upcoming: Realite[];
  past: Realite[];
}> {
  const allEvents = await db.query.Event.findMany({
    orderBy: [asc(Event.time)],
  });

  const res = new Map<string, Realite>();

  for (const event of allEvents) {
    const realite = res.get(event.subject) ?? createRealite(event.subject);
    res.set(realite.id, applyEvent(realite, event as EventData));
  }

  const all = Array.from(res.values());
  const now = new Date();

  // Filter realites related to the user
  const userRealites = all.filter((realite) => {
    if (realite.retracted || !realite.creatorId) return false;

    const isCreator = realite.creatorId === userId;
    const isParticipant = !!realite.participants[userId];

    return isCreator || isParticipant;
  });

  // Categorize realites
  const upcoming = userRealites.filter((realite) => {
    const latestTime = realite.when
      .map((time) => new Date(time.start))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return latestTime && latestTime > now;
  });

  const past = userRealites.filter((realite) => {
    const latestTime = realite.when
      .map((time) => new Date(time.start))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return latestTime && latestTime <= now;
  });

  // Sort by time (upcoming: earliest first, past: latest first)
  upcoming.sort((a, b) => {
    const aTime = a.when.find((time) => time.start)?.start;
    const bTime = b.when.find((time) => time.start)?.start;
    if (!aTime || !bTime) return 0;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  past.sort((a, b) => {
    const aTime = a.when.find((time) => time.start)?.start;
    const bTime = b.when.find((time) => time.start)?.start;
    if (!aTime || !bTime) return 0;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return {
    upcoming,
    past,
  };
}
