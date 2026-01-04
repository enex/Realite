import { ActivityId } from "@/shared/activities";
import { addSeconds } from "date-fns";
import { and, asc, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { builder } from "./builder";
import {
  sendPlanDeletionNotification,
  sendPlanParticipationNotification,
} from "./services/plan-notifications";
import {
  jsonArrayAgg,
  jsonArrayAggWhere,
  jsonBuildObject,
  rangesOverlap,
  tsrange,
} from "./utils/pg";
import { isDerivedPlan } from "./utils/plan-helpers";
import { getPostHogClient } from "./utils/posthog";

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
            // TODO: Tabelle für intents erstellen und hier einfügen
            console.log(
              `Intent expressed by ${ev.actor}: ${ev.data.title} (${ev.data.activity})`
            );
          },

          // Wunsch verfeinert
          async "realite.intent.refined"(ev, ctx) {
            // TODO: Intent in DB aktualisieren
            console.log(`Intent ${ev.subject} refined by ${ev.actor}`);
          },

          // Wunsch durch Plan erfüllt
          async "realite.intent.fulfilled"(ev, ctx) {
            // TODO: Intent als erfüllt markieren
            console.log(
              `Intent ${ev.subject} fulfilled by plan ${ev.data.fulfilledByPlanId}`
            );
          },

          // Wunsch zurückgezogen
          async "realite.intent.withdrawn"(ev, ctx) {
            // TODO: Intent löschen oder als zurückgezogen markieren
            console.log(
              `Intent ${ev.subject} withdrawn by ${ev.actor}: ${ev.data.reason}`
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
                sql`"ownPlansWithLocation"."plan_url"`
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
    },
    lazy: {
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
