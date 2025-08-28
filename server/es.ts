import { ActivityId } from "@/shared/activities";
import { addSeconds } from "date-fns";
import { eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { builder } from "./builder";
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
          async listMyPlans(ctx, actor: string) {
            return ctx.db.query.plans.findMany({
              where: (t, { eq }) => eq(t.creatorId, actor),
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
              startDate: Date;
              endDate: Date;
              activity?: ActivityId;
              location: string;
            }
          ) {
            // TODO: only show plans visible to the user
            // TODO: group all plans that are approximately at the same place and with overlapping time
            // TODO: Only group if activity is the same
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
              );

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
                case "realite.user.onboarded":
                  acc.onboarded = true;
                  return acc;
                case "realite.profile.updated":
                  Object.assign(acc, event.data);
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
    const client = getPostHogClient();
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
