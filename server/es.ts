import { ActivityId } from "@/shared/activities";
import { addSeconds } from "date-fns";
import { and, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { builder } from "./builder";
import {
  jsonArrayAgg,
  jsonArrayAggWhere,
  jsonBuildObject,
  rangesOverlap,
  tsrange,
} from "./utils/pg";
import { getPostHogClient } from "./utils/posthog";

export const es = builder.store({
  projections: {
    inline: {
      plan: builder.projection({
        handlers: {
          async "realite.plan.created"(ev, ctx) {
            console.log(ev, "will be added");
            await ctx.db
              .insert(schema.plans)
              .values({
                id: ev.subject,
                creatorId: ev.actor,
                activity: ev.data.activity,
                startDate: new Date(ev.data.startDate),
                endDate: ev.data.endDate ? new Date(ev.data.endDate) : null,
                title: ev.data.title ?? "",
                description: ev.data.description,
                url: ev.data.url,
                repetition: ev.data.repetition,
              } satisfies schema.InsertPlan)
              .onConflictDoNothing();
            for (const location of ev.data.locations ?? []) {
              console.log("location", location);
              await ctx.db
                .insert(schema.planLocations)
                .values({
                  planId: ev.subject,
                  location: [location.longitude, location.latitude],
                  address: location.address,
                  title: location.title,
                  url: location.url,
                  description: location.description,
                  category: location.category,
                } as schema.PlanLocation)
                .onConflictDoNothing();
            }
          },
          async "realite.plan.cancelled"(ev, ctx) {
            await ctx.db
              .update(schema.plans)
              .set({
                endDate: ev.time,
              })
              .where(eq(schema.plans.id, ev.subject));
          },
          async "realite.plan.changed"(ev, ctx) {
            let {
              locations,
              startDate: updStartDate,
              endDate,
              ...rest
            } = ev.data;
            const plan = await ctx.db.query.plans.findFirst({
              where: eq(schema.plans.id, ev.subject),
            });
            if (!plan) {
              throw new Error("Plan not found");
            }

            const startDate = updStartDate
              ? new Date(updStartDate)
              : plan.startDate;

            // Determine the new end date while ensuring endDate >= startDate
            let newEndDate: Date;
            if (typeof endDate !== "undefined") {
              const requestedEnd = new Date(endDate);
              const minimumEnd = addSeconds(startDate, 1);
              newEndDate =
                requestedEnd >= minimumEnd ? requestedEnd : minimumEnd;
            } else {
              // Preserve original duration if present, otherwise ensure at least +1s
              if (plan.endDate) {
                const durationMs =
                  plan.endDate.getTime() - plan.startDate.getTime();
                if (durationMs >= 1000) {
                  newEndDate = new Date(startDate.getTime() + durationMs);
                } else {
                  newEndDate = addSeconds(startDate, 1);
                }
              } else {
                newEndDate = addSeconds(startDate, 1);
              }
            }

            const upd = {
              updatedAt: ev.time,
              startDate,
              endDate: newEndDate,
              ...rest,
            } as const;

            console.log("update plan", upd);
            await ctx.db
              .update(schema.plans)
              .set(upd)
              .where(eq(schema.plans.id, ev.subject));

            if (ev.data?.locations) {
              // naive replace strategy for now: delete existing and insert first location
              // TODO: support multiple and proper upsert
              await ctx.db
                .delete(schema.planLocations)
                .where(eq(schema.planLocations.planId, ev.subject));

              for (const location of ev.data.locations) {
                await ctx.db.insert(schema.planLocations).values({
                  planId: ev.subject,
                  location: [location.longitude, location.latitude],
                  address: location.address,
                  title: location.title,
                  url: location.url,
                  description: location.description,
                  category: location.category,
                } as schema.PlanLocation);
              }
            }
          },
        },
        queries: {
          async listMyPlans(ctx, actor: string, range: [Date, Date]) {
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
                repetition: schema.plans.repetition,
                // location
                location: schema.planLocations.location,
                address: schema.planLocations.address,
                category: schema.planLocations.category,
                imageUrl: schema.planLocations.imageUrl,
                locationTitle: sql<
                  string | null
                >`${schema.planLocations.title}`.as("location_title"),
                locationUrl: sql<string | null>`${schema.planLocations.url}`.as(
                  "location_url"
                ),
                locationDescription: sql<
                  string | null
                >`${schema.planLocations.description}`.as(
                  "location_description"
                ),
              })
              .from(schema.plans)
              .leftJoin(
                schema.planLocations,
                eq(schema.plans.id, schema.planLocations.planId)
              );
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
                repetition: ownPlansWithLocation.repetition,
                locations: jsonArrayAgg(
                  jsonBuildObject({
                    title: sql`"ownPlansWithLocation"."location_title"`,
                    address: ownPlansWithLocation.address,
                    category: ownPlansWithLocation.category,
                    imageUrl: ownPlansWithLocation.imageUrl,
                    url: sql`"ownPlansWithLocation"."location_url"`,
                    description: sql`"ownPlansWithLocation"."location_description"`,
                    latitude: sql<number>`ST_Y(${ownPlansWithLocation.location})`,
                    longitude: sql<number>`ST_X(${ownPlansWithLocation.location})`,
                  })
                ),
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
                    locationTitle: sql`"otherPlansWithLocation"."location_title"`,
                    address: otherPlansWithLocation.address,
                    category: otherPlansWithLocation.category,
                    imageUrl: otherPlansWithLocation.imageUrl,
                    locationUrl: sql`"otherPlansWithLocation"."location_url"`,
                    locationDescription: sql`"otherPlansWithLocation"."location_description"`,
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
                ownPlansWithLocation.repetition
              );

            console.log(q.toSQL());
            return await q;
          },
          async get(ctx, id: string) {
            return ctx.db.query.plans.findFirst({
              where: (t, { eq }) => eq(t.id, id),
              with: {
                locations: {
                  columns: {
                    title: true,
                    address: true,
                    category: true,
                    description: true,
                    imageUrl: true,
                    url: true,
                  },
                  extras: {
                    latitude:
                      sql<number>`ST_Y(${schema.planLocations.location})`.as(
                        "latitude"
                      ),
                    longitude:
                      sql<number>`ST_X(${schema.planLocations.location})`.as(
                        "longitude"
                      ),
                  },
                },
              },
            });
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
            }
          ) {
            // TODO: only show plans visible to the user
            // TODO: group all plans that are approximately at the same place and with overlapping time
            // TODO: Only group if activity is the same
            const where = and(
              gte(schema.plans.startDate, input.startDate),
              lte(schema.plans.startDate, input.endDate),
              input.activity && eq(schema.plans.activity, input.activity),
              input?.query
                ? or(
                    ilike(schema.plans.title, `%${input.query}%`),
                    ilike(schema.planLocations.title, `%${input.query}%`),
                    ilike(schema.planLocations.address, `%${input.query}%`)
                  )
                : undefined,
              input.location
                ? sql`ST_DWithin(${schema.planLocations.location}::geography, ST_SetSRID(ST_MakePoint(${input.location.longitude}, ${input.location.latitude}), 4326)::geography, ${
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
                  sql<number>`ST_Y(${schema.planLocations.location})`.as(
                    "latitude"
                  ),
                longitude:
                  sql<number>`ST_X(${schema.planLocations.location})`.as(
                    "longitude"
                  ),
                address: schema.planLocations.address,
                locationTitle: schema.planLocations.title,
                locationUrl: schema.planLocations.url,
                locationDescription: schema.planLocations.description,
                locationCategory: schema.planLocations.category,
                creatorId: schema.plans.creatorId,
              })
              .from(schema.plans)
              .leftJoin(
                schema.planLocations,
                eq(schema.plans.id, schema.planLocations.planId)
              )
              .where(where);

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
