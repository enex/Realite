import { ActivityId } from "@/shared/activities";
import {
  DEFAULT_EXECUTION_THRESHOLD,
  combinePlans,
  normalizeCertainty,
  normalizeSpecificity,
  plansMatch,
  specificity,
} from "@/lib/core/plans";
import type { Plan } from "@/lib/core/types";
import { addSeconds } from "date-fns";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import * as schema from "../db/schema";
import { builder } from "./builder";
import {
  sendPlanDeletionNotification,
  sendPlanParticipationNotification,
} from "./services/plan-notifications";
import {
  arrayAgg,
  jsonArrayAgg,
  jsonArrayAggWhere,
  jsonBuildObject,
  rangesOverlap,
  tsrange,
} from "./utils/pg";
import { isDerivedPlan } from "./utils/plan-helpers";
import { getPostHogClient } from "./utils/posthog";
import type { PlanExchangeVisibility } from "./events";

type PlanExchangeStatus = "open" | "accepted" | "declined" | "counter";

type PlanExchangeAggregate = {
  id: string;
  creatorId: string;
  plan: Plan;
  visibility: PlanExchangeVisibility;
  toUserIds: string[];
  basedOnId?: string;
  status: PlanExchangeStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  withdrawnAt?: Date;
};

const PLAN_EXCHANGE_EVENT_TYPES = [
  "realite.plan-exchange.created",
  "realite.plan-exchange.refined",
  "realite.plan-exchange.responded",
  "realite.plan-exchange.withdrawn",
] as const;

function normalizePlanInput(plan: Plan | Partial<Plan>): Plan {
  return {
    ...plan,
    certainty: normalizeCertainty(plan.certainty ?? 0.5),
  };
}

function applyPlanPatch(current: Plan, patch: Partial<Plan>): Plan {
  const merged = combinePlans(current, patch as Plan);
  if (typeof patch.certainty === "number") {
    merged.certainty = normalizeCertainty(patch.certainty);
  } else {
    merged.certainty = normalizeCertainty(merged.certainty);
  }
  return merged;
}

function isPlanExchangeVisibleTo(
  exchange: PlanExchangeAggregate,
  userId: string
): boolean {
  if (exchange.creatorId === userId) return true;
  if (exchange.visibility === "public") return true;
  if (exchange.visibility === "contacts") {
    // Contacts visibility is currently treated like public until contacts graph
    // projection is materialized.
    return true;
  }
  return exchange.toUserIds.includes(userId);
}

function getExchangeTitle(plan: Plan): string {
  return (
    plan.what?.title?.trim() ||
    plan.what?.activity?.trim() ||
    plan.what?.category?.trim() ||
    "Vorschlag"
  );
}

async function loadPlanExchangeAggregates(
  ctx: {
    reduce: <T>(
      filter: { type?: string[] },
      fn: (acc: T, event: any) => T,
      initial: T
    ) => Promise<T>;
  }
): Promise<PlanExchangeAggregate[]> {
  const byId = await ctx.reduce(
    {
      type: [...PLAN_EXCHANGE_EVENT_TYPES] as unknown as string[],
    },
    (acc, event) => {
      switch (event.type) {
        case "realite.plan-exchange.created": {
          acc.set(event.subject, {
            id: event.subject,
            creatorId: event.actor,
            plan: normalizePlanInput(event.data.plan),
            visibility: event.data.visibility ?? "public",
            toUserIds: event.data.toUserIds ?? [],
            basedOnId: event.data.basedOnId,
            status: "open",
            createdAt: event.time,
            updatedAt: event.time,
          } satisfies PlanExchangeAggregate);
          return acc;
        }
        case "realite.plan-exchange.refined": {
          const current = acc.get(event.subject);
          if (!current) return acc;
          if (event.data.plan) {
            current.plan = applyPlanPatch(current.plan, event.data.plan);
          }
          if (event.data.visibility) current.visibility = event.data.visibility;
          if (Array.isArray(event.data.toUserIds)) {
            current.toUserIds = event.data.toUserIds;
          }
          current.updatedAt = event.time;
          acc.set(event.subject, current);
          return acc;
        }
        case "realite.plan-exchange.responded": {
          const current = acc.get(event.subject);
          if (!current) return acc;
          current.status = event.data.status;
          current.message = event.data.message;
          current.updatedAt = event.time;
          if (event.data.counterPlan) {
            current.plan = applyPlanPatch(current.plan, event.data.counterPlan);
          }
          acc.set(event.subject, current);
          return acc;
        }
        case "realite.plan-exchange.withdrawn": {
          const current = acc.get(event.subject);
          if (!current) return acc;
          current.withdrawnAt = event.time;
          current.updatedAt = event.time;
          acc.set(event.subject, current);
          return acc;
        }
        default:
          return acc;
      }
    },
    new Map<string, PlanExchangeAggregate>()
  );

  return Array.from(byId.values()).filter((x) => !x.withdrawnAt);
}

export const es = builder.store({
  projections: {
    inline: {
      plan: builder.projection({
        handlers: {
          // Plan wird erstellt (neues Event-Format mit einzelner Location)
          async "realite.plan.scheduled"(ev, ctx) {
            console.log(ev, "will be scheduled");
            const startDate = new Date(ev.data.startDate);
            let endDate: Date | null = null;

            if (ev.data.endDate) {
              const parsedEndDate = new Date(ev.data.endDate);
              // Ensure endDate is always >= startDate to satisfy the tsrange constraint
              if (parsedEndDate >= startDate) {
                endDate = parsedEndDate;
              } else {
                // If endDate is before startDate, set it to startDate + 1 hour as default duration
                endDate = new Date(startDate);
                endDate.setHours(endDate.getHours() + 1);
              }
            }

            // Einzelne Location (mandatory)
            if (!ev.data.location) {
              throw new Error("Location is required for plan.scheduled");
            }

            const location = ev.data.location;

            await ctx.db
              .insert(schema.plans)
              .values({
                id: ev.subject,
                creatorId: ev.actor,
                activity: ev.data.activity,
                startDate: startDate,
                endDate: endDate,
                title: ev.data.title ?? "",
                description: ev.data.description,
                url: ev.data.url,
                // Location direkt in plans table
                location: [location.longitude, location.latitude],
                locationAddress: location.address,
                locationTitle: location.title,
                locationUrl: location.url,
                locationDescription: location.description,
                // Series support
                seriesId: ev.data.seriesId,
                seriesIndex: ev.data.seriesIndex,
                // Gathering reference
                gatheringId: ev.data.gatheringId,
                // Participation settings
                openTo: ev.data.openTo,
                maxParticipants: ev.data.maxParticipants,
                // Based on another plan
                basedOnPlanId: ev.data.basedOn?.planId,
                basedOnUserId: ev.data.basedOn?.userId,
                // Status
                status: "scheduled",
              } satisfies schema.InsertPlan)
              .onConflictDoNothing();
          },

          // Jemand tritt einem Plan bei
          async "realite.plan.joined"(ev, ctx) {
            // Send push notification to the plan creator
            const eventData = ev.data as {
              planId: string;
              creatorId: string;
              message?: string;
            };
            if (eventData?.creatorId && ev.actor) {
              // Use fire-and-forget to avoid blocking the event processing
              sendPlanParticipationNotification(
                eventData.creatorId,
                ev.actor,
                eventData.planId
              ).catch((err) => {
                console.error("Failed to send plan join notification:", err);
              });
            }
          },

          // Jemand lehnt Teilnahme ab
          async "realite.plan.declined"(ev, ctx) {
            // Optional: Notification an Creator (nur wenn hideReason false)
            const eventData = ev.data as {
              planId: string;
              creatorId: string;
              reason: string;
              hideReason?: boolean;
            };
            // Für jetzt: Nur loggen, keine DB-Änderung nötig
            console.log(`User ${ev.actor} declined plan ${eventData.planId}`);
          },
          async "realite.plan.cancelled"(ev, ctx) {
            // Check if this is a derived plan (created via participation)
            const derivedPlanInfo = await isDerivedPlan(ev.subject);

            // Update status to cancelled instead of deleting
            // This preserves history and allows for analytics
            await ctx.db
              .update(schema.plans)
              .set({
                status: "cancelled",
                updatedAt: ev.time,
              })
              .where(eq(schema.plans.id, ev.subject));

            // If this was a derived plan, notify the original creator
            if (derivedPlanInfo) {
              // Use fire-and-forget to avoid blocking the event processing
              sendPlanDeletionNotification(
                derivedPlanInfo.originalCreatorId,
                ev.subject
              ).catch((err) => {
                console.error(
                  "Failed to send plan deletion notification:",
                  err
                );
              });
            }
          },
          // Zeit wurde geändert
          async "realite.plan.rescheduled"(ev, ctx) {
            const plan = await ctx.db.query.plans.findFirst({
              where: eq(schema.plans.id, ev.subject),
            });
            if (!plan) {
              throw new Error("Plan not found");
            }

            const startDate = new Date(ev.data.startDate);
            let newEndDate: Date;

            if (ev.data.endDate) {
              const requestedEnd = new Date(ev.data.endDate);
              const minimumEnd = addSeconds(startDate, 1);
              newEndDate =
                requestedEnd >= minimumEnd ? requestedEnd : minimumEnd;
            } else if (plan.endDate) {
              // Preserve original duration
              const durationMs =
                plan.endDate.getTime() - plan.startDate.getTime();
              newEndDate = new Date(
                startDate.getTime() + Math.max(durationMs, 1000)
              );
            } else {
              newEndDate = addSeconds(startDate, 1);
            }

            await ctx.db
              .update(schema.plans)
              .set({
                updatedAt: ev.time,
                startDate,
                endDate: newEndDate,
              })
              .where(eq(schema.plans.id, ev.subject));
          },

          // Ort wurde geändert
          async "realite.plan.relocated"(ev, ctx) {
            const location = ev.data.location;

            // Update location directly in plans table
            await ctx.db
              .update(schema.plans)
              .set({
                location: [location.longitude, location.latitude],
                locationAddress: location.address,
                locationTitle: location.title,
                locationUrl: location.url,
                locationDescription: location.description,
                updatedAt: ev.time,
              })
              .where(eq(schema.plans.id, ev.subject));
          },

          // Sonstige Details geändert
          async "realite.plan.details-updated"(ev, ctx) {
            const { applyTo, ...updates } = ev.data;

            // Filter out undefined values
            const cleanUpdates = Object.fromEntries(
              Object.entries(updates).filter(([_, v]) => v !== undefined)
            );

            if (Object.keys(cleanUpdates).length > 0) {
              await ctx.db
                .update(schema.plans)
                .set({
                  ...cleanUpdates,
                  updatedAt: ev.time,
                })
                .where(eq(schema.plans.id, ev.subject));
            }
          },

          // ============================================
          // INTENT EVENTS
          // ============================================

          // Neuer Wunsch/Interesse geäußert
          async "realite.intent.expressed"(ev, ctx) {
            await ctx.db
              .insert(schema.intents)
              .values({
                id: ev.subject,
                userId: ev.actor!,
                title: ev.data.title,
                description: ev.data.description,
                activity: ev.data.activity,
                visibility: ev.data.visibility,
                locationPreferences: ev.data.locationPreferences,
                timePreferences: ev.data.timePreferences,
                status: "active",
                createdAt: ev.time,
                updatedAt: ev.time,
              })
              .onConflictDoNothing();
          },

          // Wunsch verfeinert
          async "realite.intent.refined"(ev, ctx) {
            const cleanUpdates = Object.fromEntries(
              Object.entries(ev.data).filter(([_, v]) => v !== undefined)
            );

            if (Object.keys(cleanUpdates).length === 0) return;

            await ctx.db
              .update(schema.intents)
              .set({
                ...(cleanUpdates as any),
                updatedAt: ev.time,
              })
              .where(
                and(
                  eq(schema.intents.id, ev.subject),
                  eq(schema.intents.userId, ev.actor!)
                )
              );
          },

          // Wunsch durch Plan erfüllt
          async "realite.intent.fulfilled"(ev, ctx) {
            await ctx.db
              .update(schema.intents)
              .set({
                status: "fulfilled",
                fulfilledByPlanId: ev.data.fulfilledByPlanId,
                updatedAt: ev.time,
              })
              .where(
                and(
                  eq(schema.intents.id, ev.subject),
                  eq(schema.intents.userId, ev.actor!)
                )
              );
          },

          // Wunsch zurückgezogen
          async "realite.intent.withdrawn"(ev, ctx) {
            await ctx.db
              .update(schema.intents)
              .set({
                status: "withdrawn",
                withdrawnReason: ev.data.reason,
                updatedAt: ev.time,
              })
              .where(
                and(
                  eq(schema.intents.id, ev.subject),
                  eq(schema.intents.userId, ev.actor!)
                )
              );
          },

          // ============================================
          // INTENT REQUEST EVENTS
          // ============================================

          async "realite.intent-request.sent"(ev, ctx) {
            await ctx.db
              .insert(schema.intentRequests)
              .values({
                id: ev.subject,
                fromUserId: ev.actor!,
                toUserId: ev.data.toUserId,
                activity: ev.data.activity,
                title: ev.data.title,
                message: ev.data.message,
                status: "pending",
                createdAt: ev.time,
                updatedAt: ev.time,
              })
              .onConflictDoNothing();
          },

          async "realite.intent-request.responded"(ev, ctx) {
            await ctx.db
              .update(schema.intentRequests)
              .set({
                status: ev.data.status,
                responseMessage: ev.data.message,
                planId: ev.data.planId,
                updatedAt: ev.time,
                respondedAt: ev.time,
              })
              .where(
                and(
                  eq(schema.intentRequests.id, ev.subject),
                  eq(schema.intentRequests.toUserId, ev.actor!)
                )
              );
          },

          // ============================================
          // AVAILABILITY EVENT
          // ============================================

          // Verfügbarkeit komplett überschreiben
          async "realite.availability.set"(ev, ctx) {
            // TODO: Tabelle für availabilities erstellen und hier aktualisieren
            // subject = userId
            console.log(
              `Availability set for user ${ev.subject}: ${ev.data.rules.length} rules`
            );
          },

          // ============================================
          // GATHERING EVENTS
          // Externe Events (Facebook, Meetup, Kalender, etc.)
          // ============================================

          // Gathering wurde manuell vom Nutzer erstellt
          async "realite.gathering.created"(ev, ctx) {
            // TODO: gatherings Tabelle erstellen und hier einfügen
            console.log(`Gathering created by ${ev.actor}: ${ev.data.title}`);
          },

          // Gathering wurde automatisch entdeckt/importiert
          async "realite.gathering.discovered"(ev, ctx) {
            // TODO: gatherings Tabelle erstellen und hier einfügen
            console.log(
              `Gathering discovered: ${ev.data.title} (${ev.data.source})`
            );
          },

          // Gathering wurde mit Quelle synchronisiert
          async "realite.gathering.synced"(ev, ctx) {
            // TODO: Gathering in DB aktualisieren
            console.log(
              `Gathering ${ev.subject} synced at ${ev.data.syncedAt}`
            );
          },

          // Gathering manuell bearbeitet
          async "realite.gathering.edited"(ev, ctx) {
            // TODO: Gathering in DB aktualisieren
            console.log(`Gathering ${ev.subject} edited by ${ev.actor}`);
          },

          // Gathering entfernt
          async "realite.gathering.removed"(ev, ctx) {
            // TODO: Gathering als entfernt markieren oder löschen
            console.log(`Gathering ${ev.subject} removed: ${ev.data.reason}`);
          },

          // Gathering gemeldet
          async "realite.gathering.reported"(ev, ctx) {
            // TODO: Report speichern für Moderation
            console.log(
              `Gathering ${ev.subject} reported by ${ev.actor}: ${ev.data.reason}`
            );
          },
        },
        queries: {
          async listMyPlans(
            ctx,
            actor: string,
            range: [Date, Date],
            limit?: number,
            orderDirection: "asc" | "desc" = "asc"
          ) {
            const baseQuery = ctx.db
              .select({
                id: schema.plans.id,
                creatorId: schema.plans.creatorId,
                startDate: schema.plans.startDate,
                activity: schema.plans.activity,
                endDate: schema.plans.endDate,
                planTitle: sql<string>`${schema.plans.title}`.as("plan_title"),
                planDescription: sql<
                  string | null
                >`${schema.plans.description}`.as("plan_description"),
                planUrl: sql<string | null>`${schema.plans.url}`.as("plan_url"),
                // location direkt aus plans table
                location: schema.plans.location,
                address: schema.plans.locationAddress,
                locationTitle: schema.plans.locationTitle,
                locationUrl: schema.plans.locationUrl,
                locationDescription: schema.plans.locationDescription,
              })
              .from(schema.plans);
            const ownPlansWithLocation = baseQuery
              .where(eq(schema.plans.creatorId, actor))
              .as("ownPlansWithLocation");
            const otherPlansWithLocation = baseQuery
              .where(ne(schema.plans.creatorId, actor))
              .as("otherPlansWithLocation"); //TODO: filter to only those that are visible for this user

            const q = ctx.db
              .select({
                id: ownPlansWithLocation.id,
                startDate: ownPlansWithLocation.startDate,
                endDate: ownPlansWithLocation.endDate,
                activity: ownPlansWithLocation.activity,
                title: sql<string>`"ownPlansWithLocation"."plan_title"`.as(
                  "title"
                ),
                description: sql<
                  string | null
                >`"ownPlansWithLocation"."plan_description"`.as("description"),
                url: sql<string | null>`"ownPlansWithLocation"."plan_url"`.as(
                  "url"
                ),
                // Single location (not array anymore)
                location: jsonBuildObject({
                  title: ownPlansWithLocation.locationTitle,
                  address: ownPlansWithLocation.address,
                  url: ownPlansWithLocation.locationUrl,
                  description: ownPlansWithLocation.locationDescription,
                  latitude: sql<number>`ST_Y(${ownPlansWithLocation.location})`,
                  longitude: sql<number>`ST_X(${ownPlansWithLocation.location})`,
                }),
                // When there is no matching plan in the LEFT JOIN, Postgres would
                // emit a single object with all-null fields. Filter those out so
                // the result is an empty array instead of [{ id: null, ... }].
                similarOverlappingPlans: jsonArrayAggWhere(
                  jsonBuildObject({
                    id: otherPlansWithLocation.id,
                    title: sql`"otherPlansWithLocation"."plan_title"`,
                    description: sql`"otherPlansWithLocation"."plan_description"`,
                    url: sql`"otherPlansWithLocation"."plan_url"`,
                    startDate: otherPlansWithLocation.startDate,
                    endDate: otherPlansWithLocation.endDate,
                    activity: otherPlansWithLocation.activity,
                    creatorId: otherPlansWithLocation.creatorId,
                    locationTitle: otherPlansWithLocation.locationTitle,
                    address: otherPlansWithLocation.address,
                    locationUrl: otherPlansWithLocation.locationUrl,
                    locationDescription: otherPlansWithLocation.locationDescription,
                    latitude: sql<number>`ST_Y(${otherPlansWithLocation.location})`,
                    longitude: sql<number>`ST_X(${otherPlansWithLocation.location})`,
                  }),
                  sql<boolean>`${otherPlansWithLocation.id} is not null`
                ),
              })
              .from(ownPlansWithLocation)
              .leftJoin(
                otherPlansWithLocation,
                and(
                  ne(ownPlansWithLocation.id, otherPlansWithLocation.id),
                  eq(
                    ownPlansWithLocation.activity,
                    otherPlansWithLocation.activity
                  ),
                  // times overlap
                  rangesOverlap(
                    tsrange(
                      ownPlansWithLocation.startDate,
                      ownPlansWithLocation.endDate
                    ),
                    tsrange(
                      otherPlansWithLocation.startDate,
                      otherPlansWithLocation.endDate
                    )
                  ),
                  // locations are within 50 meters (using geography for meter-based distance)
                  sql<boolean>`ST_DWithin(${ownPlansWithLocation.location}::geography, ${otherPlansWithLocation.location}::geography, 50)`
                )
              )
              .where(
                and(
                  eq(ownPlansWithLocation.creatorId, actor),
                  rangesOverlap(
                    tsrange(
                      ownPlansWithLocation.startDate,
                      ownPlansWithLocation.endDate
                    ),
                    tsrange(sql`${range[0]}`, sql`${range[1]}`)
                  )
                )
              )
              .groupBy(
                ownPlansWithLocation.id,
                ownPlansWithLocation.startDate,
                ownPlansWithLocation.endDate,
                ownPlansWithLocation.activity,
                sql`"ownPlansWithLocation"."plan_title"`,
                sql`"ownPlansWithLocation"."plan_description"`,
                sql`"ownPlansWithLocation"."plan_url"`,
                ownPlansWithLocation.locationTitle,
                ownPlansWithLocation.address,
                ownPlansWithLocation.locationUrl,
                ownPlansWithLocation.locationDescription,
                ownPlansWithLocation.location
              )
              .orderBy(
                orderDirection === "desc"
                  ? desc(ownPlansWithLocation.startDate)
                  : asc(ownPlansWithLocation.startDate)
              )
              .limit(limit ?? 100);

            console.log(q.toSQL());
            return await q;
          },
          async get(ctx, id: string) {
            const plan = await ctx.db.query.plans.findFirst({
              where: (t, { eq }) => eq(t.id, id),
            });
            
            if (!plan) return null;
            
            // Add location as object (not relation anymore)
            return {
              ...plan,
              location: {
                title: plan.locationTitle,
                address: plan.locationAddress,
                url: plan.locationUrl,
                description: plan.locationDescription,
                latitude: plan.location ? (plan.location as [number, number])[1] : null,
                longitude: plan.location ? (plan.location as [number, number])[0] : null,
              },
            };
          },
          async findPlans(
            ctx,
            input: {
              query?: string;
              startDate: Date;
              endDate: Date;
              activity?: ActivityId;
              location?: {
                latitude: number;
                longitude: number;
                radius?: number;
              };
              creatorId?: string;
              limit?: number;
            }
          ) {
            // TODO: only show plans visible to the user
            // TODO: group all plans that are approximately at the same place and with overlapping time
            // TODO: Only group if activity is the same
            const where = and(
              gte(schema.plans.startDate, input.startDate),
              lte(
                schema.plans.startDate,
                input.endDate ||
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              ), // Default to 1 year ahead if not provided
              input.activity
                ? eq(schema.plans.activity, input.activity)
                : undefined,
              input.creatorId
                ? eq(schema.plans.creatorId, input.creatorId)
                : undefined,
              input?.query
                ? or(
                    ilike(schema.plans.title, `%${input.query}%`),
                    ilike(schema.plans.locationTitle, `%${input.query}%`),
                    ilike(schema.plans.locationAddress, `%${input.query}%`)
                  )
                : undefined,
              input.location
                ? sql`ST_DWithin(${schema.plans.location}::geography, ST_SetSRID(ST_MakePoint(${input.location.longitude}, ${input.location.latitude}), 4326)::geography, ${
                    input.location.radius ?? 5000
                  })`
                : undefined
            );

            const plans = await ctx.db
              .select({
                id: schema.plans.id,
                title: schema.plans.title,
                startDate: schema.plans.startDate,
                endDate: schema.plans.endDate,
                activity: schema.plans.activity,
                latitude:
                  sql<number>`ST_Y(${schema.plans.location})`.as(
                    "latitude"
                  ),
                longitude:
                  sql<number>`ST_X(${schema.plans.location})`.as(
                    "longitude"
                  ),
                address: schema.plans.locationAddress,
                locationTitle: schema.plans.locationTitle,
                locationUrl: schema.plans.locationUrl,
                locationDescription: schema.plans.locationDescription,
                creatorId: schema.plans.creatorId,
              })
              .from(schema.plans)
              .where(where)
              .orderBy(asc(schema.plans.startDate))
              .limit(input.limit ?? 100);

            return plans;
          },
        },
      }),
      intent: builder.projection({
        handlers: {},
        queries: {
          async listMine(ctx, userId: string) {
            return await ctx.db
              .select({
                id: schema.intents.id,
                userId: schema.intents.userId,
                title: schema.intents.title,
                description: schema.intents.description,
                activity: schema.intents.activity,
                visibility: schema.intents.visibility,
                status: schema.intents.status,
                locationPreferences: schema.intents.locationPreferences,
                timePreferences: schema.intents.timePreferences,
                createdAt: schema.intents.createdAt,
                updatedAt: schema.intents.updatedAt,
              })
              .from(schema.intents)
              .where(
                and(
                  eq(schema.intents.userId, userId),
                  eq(schema.intents.status, "active")
                )
              )
              .orderBy(desc(schema.intents.updatedAt));
          },

          async getActivityMatchSummary(
            ctx,
            input: {
              userId: string;
              activities: ActivityId[];
              limit?: number;
            }
          ) {
            if (!input.activities.length) return [];

            const rows = await ctx.db
              .select({
                activity: schema.intents.activity,
                matchCount: sql<number>`count(*)`.as("match_count"),
                userIds: arrayAgg(schema.intents.userId).as("user_ids"),
              })
              .from(schema.intents)
              .where(
                and(
                  eq(schema.intents.status, "active"),
                  eq(schema.intents.visibility, "public"),
                  ne(schema.intents.userId, input.userId),
                  inArray(schema.intents.activity, input.activities as any)
                )
              )
              .groupBy(schema.intents.activity)
              .orderBy(desc(sql`count(*)`))
              .limit(input.limit ?? 8);

            return rows.map((r) => ({
              activity: r.activity as ActivityId,
              matchCount: Number(r.matchCount ?? 0),
              userIds: (r.userIds ?? []) as string[],
            }));
          },
        },
      }),
      intentRequest: builder.projection({
        handlers: {},
        queries: {
          async listInbox(ctx, toUserId: string) {
            return await ctx.db
              .select({
                id: schema.intentRequests.id,
                fromUserId: schema.intentRequests.fromUserId,
                toUserId: schema.intentRequests.toUserId,
                activity: schema.intentRequests.activity,
                title: schema.intentRequests.title,
                message: schema.intentRequests.message,
                status: schema.intentRequests.status,
                responseMessage: schema.intentRequests.responseMessage,
                planId: schema.intentRequests.planId,
                createdAt: schema.intentRequests.createdAt,
                updatedAt: schema.intentRequests.updatedAt,
                respondedAt: schema.intentRequests.respondedAt,
              })
              .from(schema.intentRequests)
              .where(
                and(
                  eq(schema.intentRequests.toUserId, toUserId),
                  eq(schema.intentRequests.status, "pending")
                )
              )
              .orderBy(desc(schema.intentRequests.createdAt))
              .limit(50);
          },
        },
      }),
    },
    lazy: {
      planExchange: {
        async getById(ctx, input: { id: string; userId: string }) {
          const exchanges = await loadPlanExchangeAggregates(ctx as any);
          const item = exchanges.find((x) => x.id === input.id);
          if (!item) return null;
          if (!isPlanExchangeVisibleTo(item, input.userId)) return null;
          return item;
        },
        async listMine(ctx, userId: string) {
          const exchanges = await loadPlanExchangeAggregates(ctx as any);
          return exchanges
            .filter((x) => x.creatorId === userId)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        },
        async listInbox(ctx, userId: string) {
          const exchanges = await loadPlanExchangeAggregates(ctx as any);
          return exchanges
            .filter(
              (x) =>
                x.creatorId !== userId &&
                isPlanExchangeVisibleTo(x, userId) &&
                x.status !== "declined"
            )
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        },
        async suggestFor(
          ctx,
          input: {
            userId: string;
            limit?: number;
            executionThreshold?: number;
          }
        ) {
          const threshold =
            typeof input.executionThreshold === "number"
              ? normalizeCertainty(input.executionThreshold)
              : DEFAULT_EXECUTION_THRESHOLD;
          const exchanges = await loadPlanExchangeAggregates(ctx as any);
          const myPlanSignals = exchanges.filter(
            (x) =>
              x.creatorId === input.userId &&
              x.status !== "declined" &&
              normalizeCertainty(x.plan.certainty) > 0
          );
          const candidates = exchanges.filter(
            (x) =>
              x.creatorId !== input.userId &&
              isPlanExchangeVisibleTo(x, input.userId) &&
              x.status !== "declined" &&
              normalizeCertainty(x.plan.certainty) > 0
          );

          const suggestions = candidates
            .map((candidate) => {
              const matchingMine = myPlanSignals.filter((mine) =>
                plansMatch(mine.plan, candidate.plan)
              );
              const concreteCounterpart = {
                who: { explicit: [candidate.creatorId] },
              } satisfies Plan;

              const predicted = combinePlans(
                candidate.plan,
                concreteCounterpart,
                ...matchingMine.map((m) => m.plan)
              );
              const predictedCertainty = normalizeCertainty(
                predicted.certainty
              );
              const predictedSpecificity = specificity(predicted);
              const predictedSpecificityNormalized = normalizeSpecificity(
                predictedSpecificity
              );
              // Keep certainty as primary signal and use specificity as tie-break
              // / readiness boost for immediately actionable suggestions.
              const readinessScore =
                predictedCertainty *
                (0.7 + 0.3 * predictedSpecificityNormalized);

              return {
                id: candidate.id,
                fromUserId: candidate.creatorId,
                basedOnId: candidate.basedOnId,
                title: getExchangeTitle(predicted),
                predictedPlan: predicted,
                predictedCertainty,
                predictedSpecificity,
                predictedSpecificityNormalized,
                readinessScore,
                matchingMineCount: matchingMine.length,
                isLikely: predictedCertainty >= threshold,
              };
            })
            .filter((s) => s.predictedCertainty > 0)
            .sort((a, b) => {
              if (b.readinessScore !== a.readinessScore) {
                return b.readinessScore - a.readinessScore;
              }
              if (b.predictedCertainty !== a.predictedCertainty) {
                return b.predictedCertainty - a.predictedCertainty;
              }
              return b.predictedSpecificity - a.predictedSpecificity;
            })
            .slice(0, input.limit ?? 10);

          return suggestions;
        },
      },
      user: {
        getProfile: async (ctx, id: string) =>
          ctx.reduce(
            { subject: id },
            (acc, event) => {
              switch (event.type) {
                case "realite.user.registered":
                  acc.name = event.data.name;
                  if (event.data.phoneNumber)
                    acc.phoneNumber = event.data.phoneNumber;
                  return acc;
                case "realite.auth.phone-code-verified":
                  acc.phoneNumber = event.data.phoneNumber;
                  return acc;
                case "realite.user.onboarded":
                  acc.onboarded = true;
                  return acc;
                case "realite.profile.updated":
                  const pps = acc.privacySettings;
                  Object.assign(acc, event.data);
                  acc.privacySettings = pps;
                  if (event.data.privacySettings) {
                    acc.privacySettings = {
                      ...pps,
                      ...event.data.privacySettings,
                    };
                  }
                  return acc;
                case "realite.user.deleted":
                  acc.deleted = true;
                  acc.deletedAt = event.time;
                  return acc;
                default:
                  return acc;
              }
            },
            {
              id,
              name: "",
              phoneNumber: "",
              image: "",
              gender: "",
              birthDate: "asdf",
              relationshipStatus: "asdf",
              onboarded: false,
              deleted: false,
              deletedAt: null as null | Date,
              email: "",
              privacySettings: {
                showGender: true,
                showAge: true,
                showRelationshipStatus: true,
              },
            }
          ),
        getContacts: async (ctx, id: string) => {},
      },
      auth: {
        async getVerificationCode(ctx, phoneNumberHash: string) {
          return ctx.reduce(
            {
              subject: phoneNumberHash,
              type: [
                "realite.auth.phone-code-requested",
                "realite.auth.phone-code-invalid",
              ],
            },
            (acc, event) => {
              if (event.type === "realite.auth.phone-code-requested") {
                return { ...event.data, attempts: 0 };
              }
              if (event.type === "realite.auth.phone-code-invalid" && acc) {
                acc.attempts = (acc.attempts ?? 0) + 1;
                return acc;
              }
              return acc;
            },
            null as null | { code: string; expiresAt: string; attempts: number }
          );
        },
        async getUserIdByPhoneNumber(ctx, phoneNumberHash: string) {
          return ctx.reduce(
            {
              subject: phoneNumberHash,
              type: ["realite.auth.phone-code-verified"],
            },
            (acc, event) => {
              if (event.type === "realite.auth.phone-code-verified")
                return event.data.userId;
              return acc;
            },
            null as null | string
          );
        },
      },
    },
  },
  onEvent: async (event) => {
    const client = await getPostHogClient();
    if (!client) return;
    const isSystemEvent = !event.actor;
    const distinctId = event.actor || "system";
    client.capture({
      distinctId,
      event: event.type,
      properties: {
        ...event.data,
      },
    });

    if (event.type === "realite.user.registered" && !isSystemEvent) {
      client?.identify({
        distinctId,
        properties: {
          phoneNumber: event.data.phoneNumber,
          name: event.data.name,
        },
      });
    }

    await client.flush();
  },
});
