import { eq } from "drizzle-orm";
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
            await ctx.db
              .update(schema.plans)
              .set({
                updatedAt: ev.time,
                ...ev.data,
              })
              .where(eq(schema.plans.id, ev.subject));

            if (ev.data?.locations) {
              // naive replace strategy for now: delete existing and insert first location
              // TODO: support multiple and proper upsert
              await ctx.db
                .delete(schema.planLocations)
                .where(eq(schema.planLocations.planId, ev.subject));

              const first = ev.data.locations[0];
              if (first) {
                await ctx.db.insert(schema.planLocations).values({
                  planId: ev.subject,
                  location: {
                    type: "Point",
                    coordinates: [first.longitude, first.latitude],
                  } as any,
                  address: first.address,
                  title: first.name,
                  url: first.url,
                  description: first.description,
                  category: first.category,
                });
              }
            }
          },
        },
        queries: {
          async listMyPlans(ctx, actor: string) {
            return ctx.db.query.plans.findMany({
              where: (t, { eq }) => eq(t.creatorId, actor),
              with: {
                locations: true,
              },
            });
          },
          async get(ctx, id: string) {
            return ctx.db.query.plans.findFirst({
              where: (t, { eq }) => eq(t.id, id),
              with: {
                locations: true,
              },
            });
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
