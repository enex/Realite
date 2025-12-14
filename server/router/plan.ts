import { activities, activityIds, type ActivityId } from "@/shared/activities";
import { coreRepetitionSchema } from "@/shared/validation/plan";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { addWeeks } from "date-fns";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import type { RealiteEvents } from "../events";
import { protectedRoute } from "../orpc";
import { PlacesService } from "../services/places";
import { locationRouter } from "./location";

const planSchema = z.object({
  url: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  activity: z.enum(activityIds),
  startDate: z.string(),
  endDate: z.string().optional(),
  locations: z
    .array(
      z.object({
        title: z.string(),
        address: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        url: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .optional(),
  repetition: coreRepetitionSchema
    .optional()
    .describe(
      "Repetition rule if it is a series not a plan for a single event"
    ),
  maybe: z
    .boolean()
    .optional()
    .describe("If true, the user has not fully confirmed the plan yet"),
});

const locationArraySchema = (
  planSchema.shape.locations as z.ZodOptional<z.ZodArray<any>>
).unwrap();

const getGroupIdFromActivity = (
  activityId?: ActivityId
): keyof typeof activities | undefined => {
  if (!activityId) return undefined;
  const [groupId] = (activityId as string).split("/");
  return groupId as keyof typeof activities;
};

export const planRouter = {
  create: protectedRoute
    .input(
      planSchema.partial().extend({
        inputText: z.string().optional(),
      })
    )
    .errors({
      INCOMPLETE: { message: "Incomplete plan" },
    })
    .handler(async ({ context, input, errors, signal }) => {
      const id = uuidv7();

      if (!input.activity || !input.startDate) throw errors.INCOMPLETE();

      const data: RealiteEvents["realite.plan.created"] = {
        activity: input.activity,
        startDate: input.startDate,
        endDate: input.endDate,
        title: input.title,
        inputText: input.inputText,
        description: input.description,
        url: input.url,
        gathering: undefined,
        locations: input.locations,
        repetition: input.repetition,
        maybe: input.maybe,
      };

      console.log(data, "will be added");
      try {
        await context.es.add({
          type: "realite.plan.created",
          subject: id,
          data,
        });
      } catch (err) {
        console.error(err);
        throw err;
      }
      return { id, ...data };
    }),
  withAI: protectedRoute
    .input(
      z.object({
        text: z.string(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radius: z.number().optional(),
          })
          .optional(),
      })
    )
    .handler(async ({ context, input, signal }) => {
      const placesService = new PlacesService(
        process.env.GOOGLE_PLACES_API_KEY ??
          process.env.GOOGLE_MAPS_API_KEY ??
          ""
      );

      const resolved = input.location
        ? await placesService.reverseGeocode(
            input.location.latitude,
            input.location.longitude
          )
        : null;

      // Determine timezone from location
      const getTimezoneFromLocation = (
        countryCode?: string,
        lat?: number,
        lng?: number
      ): string => {
        // Map common country codes to timezones
        const countryTimezoneMap: Record<string, string> = {
          DE: "Europe/Berlin",
          AT: "Europe/Vienna",
          CH: "Europe/Zurich",
          FR: "Europe/Paris",
          IT: "Europe/Rome",
          ES: "Europe/Madrid",
          NL: "Europe/Amsterdam",
          BE: "Europe/Brussels",
          PL: "Europe/Warsaw",
          CZ: "Europe/Prague",
          DK: "Europe/Copenhagen",
          SE: "Europe/Stockholm",
          NO: "Europe/Oslo",
          FI: "Europe/Helsinki",
          GB: "Europe/London",
          IE: "Europe/Dublin",
          PT: "Europe/Lisbon",
          GR: "Europe/Athens",
        };

        if (countryCode && countryTimezoneMap[countryCode]) {
          return countryTimezoneMap[countryCode];
        }

        // Fallback: try to infer from coordinates (rough approximation)
        if (lat !== undefined && lng !== undefined) {
          // Germany and Central Europe: roughly 47-55°N, 5-15°E
          if (lat >= 47 && lat <= 55 && lng >= 5 && lng <= 15) {
            return "Europe/Berlin";
          }
          // Western Europe
          if (lat >= 40 && lat <= 51 && lng >= -5 && lng <= 10) {
            return "Europe/Paris";
          }
          // Eastern Europe
          if (lat >= 45 && lat <= 55 && lng >= 10 && lng <= 25) {
            return "Europe/Warsaw";
          }
        }

        // Default fallback
        return "Europe/Berlin";
      };

      const timeZone = input.location
        ? getTimezoneFromLocation(
            resolved?.countryCode,
            input.location.latitude,
            input.location.longitude
          )
        : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const now = new Date();
      // Format current time in the user's timezone
      const nowInTimezone = new Date(now.toLocaleString("en-US", { timeZone }));
      const localDateStr = now.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone,
      });
      const localTimeStr = now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });

      const systemPrompt = [
        `Du erhältst eine Eingabe eines Benutzers, der erwähnt, was er oder sie tun möchte. Du erstellst einen Plan aus dieser Eingabe.`,
        `WICHTIG: Alle Inhalte (Titel, Beschreibungen, Ortsnamen, etc.) müssen auf Deutsch sein.`,
        `Entscheide dich für die richtige Aktivität für den Plan. Verwende die passendste Aktivität aus der Liste:`,
        ...Object.entries(activities).flatMap(([groupId, group]) => [
          `- ${groupId}: ${group.name}`,
          ...Object.entries(group.subActivities).map(
            ([subActivityId, description]) =>
              `  - ${subActivityId}: ${description.name}`
          ),
        ]),
        `Wenn ein Event oder ein spezifischer Ort erwähnt wird, verwende das web_search Tool, um Details zu überprüfen.`,
        input.location
          ? `Der ungefähre Standort des Benutzers ist ${
              [resolved?.city, resolved?.region, resolved?.country]
                .filter(Boolean)
                .join(", ") ||
              `lat ${input.location.latitude}, lon ${input.location.longitude}`
            }. Bevorzuge Vorschläge, die für diese Umgebung relevant sind.`
          : `Wenn kein Standort angegeben ist, nimm keine spezifische Stadt an; halte Vorschläge generisch oder stelle Klärungsfragen.`,
        `Jeder Plan MUSS mindestens einen konkreten Ort enthalten.`,
        `Verwende das search_location Tool, um echte Orte zu finden. Wenn die Benutzereingabe vage ist, suche nach 2-3 plausiblen Orten in der Nähe des Benutzers (z.B. Parks, Cafés, Fitnessstudios) und füge sie alle hinzu, damit der Benutzer falsche löschen kann.`,
        `Gib nur Orte zurück, die einen Namen und Koordinaten aus den search_location Ergebnissen haben. Erfinde niemals Koordinaten.`,
        `Heute ist ${localDateStr} (${now.toISOString().slice(0, 10)}). Die lokale Zeit ist ${localTimeStr} in der Zeitzone ${timeZone}.`,
        `ALLE Datums- und Zeitangaben müssen im ISO 8601 Format mit korrekter Zeitzone sein: YYYY-MM-DDTHH:mm:ss+HH:mm oder YYYY-MM-DDTHH:mm:ssZ für UTC.`,
        `WICHTIG: Berücksichtige die Zeitzone ${timeZone} bei allen Datums- und Zeitangaben. Wenn der Benutzer eine Zeit angibt (z.B. "15:00" oder "3 Uhr nachmittags"), interpretiere diese als lokale Zeit in ${timeZone} und konvertiere sie entsprechend.`,
        `Wenn ein Monat/Tag oder Wochentag in diesem Jahr in der Vergangenheit wäre, plane das nächste zukünftige Vorkommen (möglicherweise nächstes Jahr).`,
        `Jeder Plan muss in der Zukunft liegen.`,
        `Alle Texte (Titel, Beschreibungen, etc.) müssen auf Deutsch sein.`,
      ].join("\n");

      const aiPlanSchema = planSchema.extend({
        locations: locationArraySchema
          .min(1)
          .describe(
            "At least one concrete location. Prefer 2-3 suggestions if uncertain."
          ),
      });

      const aiResult = await generateText({
        model: openai("gpt-4o-mini"),
        abortSignal: signal,
        system: systemPrompt,
        prompt: input.text,
        toolChoice: "required",
        prepareStep: ({ stepNumber, steps }) => {
          const hasSearchCall = steps.some((s) =>
            s.toolCalls.some((t) => t.toolName === "search_location")
          );
          const hasSearchResults = steps.some((s) =>
            (s.toolResults ?? []).some(
              (r: any) =>
                r.toolName === "search_location" &&
                Array.isArray(r.result?.locations) &&
                r.result.locations.length > 0
            )
          );

          if (stepNumber === 0) {
            return {
              toolChoice: "required",
              activeTools: ["web_search", "search_location"],
            };
          }

          if (!hasSearchResults && stepNumber < 3) {
            return { toolChoice: "required", activeTools: ["search_location"] };
          }

          if (hasSearchCall && stepNumber >= 2) {
            return { toolChoice: "required", activeTools: ["create_plan"] };
          }
        },
        stopWhen: stepCountIs(5),
        tools: {
          create_plan: tool({
            inputSchema: aiPlanSchema,
            description:
              "Erstelle einen Plan. Alle Texte (Titel, Beschreibungen) müssen auf Deutsch sein. Datumsangaben müssen im ISO 8601 Format mit korrekter Zeitzone sein.",
          }),
          web_search: openai.tools.webSearchPreview({
            searchContextSize: "high",
            userLocation: input.location
              ? {
                  type: "approximate",
                  city: resolved?.city || undefined,
                  region: resolved?.regionCode || resolved?.region || undefined,
                  country: resolved?.countryCode || undefined,
                }
              : undefined,
          }),
          search_location: tool({
            inputSchema: locationRouter.search["~orpc"].inputSchema!,
            description:
              "Suche nach einem Ort. Dies ist notwendig, um einen Plan zu erstellen, da jeder Plan mindestens einen Ort haben muss.",
            execute: async ({ query }) => {
              const res = await placesService.search({
                query,
                userLocation: input.location
                  ? {
                      lat: input.location?.latitude ?? 0,
                      lng: input.location?.longitude ?? 0,
                    }
                  : undefined,
                radius: input.location?.radius,
                limit: 50,
              });
              console.log("searched for", query, res);

              return res;
            },
          }),
        },
      });
      console.log(JSON.stringify(aiResult.toolCalls, null, 2));
      const res = {
        answer: aiResult.text,
        plan: aiResult.toolCalls.find((r) => r.toolName === "create_plan")
          ?.input as z.infer<typeof planSchema>,
      };
      // Normalize AI result: enforce ISO-8601 and ensure startDate is in the future
      // Handle timezone-aware dates properly
      if (res.plan?.startDate) {
        let parsed = new Date(res.plan.startDate);
        if (isNaN(parsed.getTime())) {
          // If parsing failed, try to interpret as local time in the user's timezone
          // This handles cases where AI might return dates without timezone info
          const localDateStr = res.plan.startDate;
          // Try to parse as if it's in the user's timezone
          const tempDate = new Date(localDateStr);
          if (!isNaN(tempDate.getTime())) {
            parsed = tempDate;
          }
        }

        if (!isNaN(parsed.getTime())) {
          let adjusted = new Date(parsed);
          const now = new Date();
          if (adjusted.getTime() <= now.getTime()) {
            // Try with current year, then next year if still in the past
            adjusted.setFullYear(now.getFullYear());
            if (adjusted.getTime() <= now.getTime()) {
              adjusted.setFullYear(now.getFullYear() + 1);
            }
          }
          // Always return in ISO format (UTC)
          res.plan.startDate = adjusted.toISOString();
        }
      }

      if (res.plan?.endDate) {
        let parsedEnd = new Date(res.plan.endDate);
        if (isNaN(parsedEnd.getTime())) {
          const tempDate = new Date(res.plan.endDate);
          if (!isNaN(tempDate.getTime())) {
            parsedEnd = tempDate;
          }
        }

        if (!isNaN(parsedEnd.getTime())) {
          const adjustedEnd = new Date(parsedEnd);
          if (res.plan.startDate) {
            const start = new Date(res.plan.startDate);
            if (adjustedEnd.getTime() <= start.getTime()) {
              adjustedEnd.setTime(start.getTime() + 60 * 60 * 1000);
            }
          }
          // Always return in ISO format (UTC)
          res.plan.endDate = adjustedEnd.toISOString();
        }
      }

      const ensureLocations = async () => {
        if (!res.plan) return;
        if (Array.isArray(res.plan.locations) && res.plan.locations.length > 0)
          return;
        const cityHint = resolved?.city || resolved?.region || undefined;
        const activityHint =
          res.plan.activity &&
          activities[getGroupIdFromActivity(res.plan.activity)]?.nameDe;
        const queryParts = [input.text, activityHint, cityHint].filter(Boolean);
        const query = queryParts.join(" ");
        const fallbackSearch = query
          ? await placesService.search({
              query,
              userLocation: input.location
                ? {
                    lat: input.location.latitude,
                    lng: input.location.longitude,
                  }
                : undefined,
              radius: input.location?.radius,
              limit: 5,
            })
          : [];
        const fallbackLocations =
          fallbackSearch?.slice(0, 3).map((place) => ({
            title: place.name,
            address: place.formatted_address ?? undefined,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          })) ?? [];

        if (fallbackLocations.length > 0) {
          res.plan.locations = fallbackLocations as any;
          res.plan.maybe = true;
          return;
        }

        if (input.location) {
          res.plan.locations = [
            {
              title: cityHint || "Treffpunkt",
              latitude: input.location.latitude,
              longitude: input.location.longitude,
              address: cityHint,
            },
          ] as any;
          res.plan.maybe = true;
        }
      };

      await ensureLocations();
      console.log(res);
      return res;
    }),
  myPlans: protectedRoute
    .input(
      z.object({
        startDate: z.coerce.date().default(new Date()),
        endDate: z.coerce.date().default(addWeeks(new Date(), 10)),
      })
    )
    .handler(async ({ context, input, signal }) => {
      try {
        const plans = await context.es.projections.plan.listMyPlans(
          context.session.id,
          [input.startDate, input.endDate]
        );
        return plans;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }),
  get: protectedRoute
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input, signal }) => {
      const plan = await context.es.projections.plan.get(input.id);
      return plan;
    }),
  change: protectedRoute
    .errors({
      NOT_FOUND: { message: "Plan not found" },
      NOT_OWNER: { message: "You are not the owner of this plan" },
    })
    .input(z.object({ id: z.string(), plan: planSchema.partial() }))
    .handler(async ({ context, input, errors }) => {
      const plan = await context.es.projections.plan.get(input.id);
      if (!plan) throw errors.NOT_FOUND();
      // check that this plan is owned by the user
      if (plan.creatorId !== context.session.id) throw errors.NOT_OWNER();
      await context.es.add({
        type: "realite.plan.changed",
        subject: input.id,
        data: input.plan,
      });
      return plan;
    }),
  cancel: protectedRoute
    .errors({
      NOT_FOUND: { message: "Plan not found" },
      NOT_OWNER: { message: "You are not the owner of this plan" },
    })
    .input(
      z.object({
        id: z.string(),
        reason: z.enum(["schedule-conflict", "other"]).optional(),
        comment: z.string().optional(),
      })
    )
    .handler(async ({ context, input, errors }) => {
      const plan = await context.es.projections.plan.get(input.id);
      if (!plan) throw errors.NOT_FOUND();
      // check that this plan is owned by the user
      if (plan.creatorId !== context.session.id) throw errors.NOT_OWNER();
      await context.es.add({
        type: "realite.plan.cancelled",
        subject: input.id,
        data: {
          reason: input.reason || "other",
          comment: input.comment,
        },
      });
      return { success: true };
    }),
  find: protectedRoute
    .input(
      z.object({
        query: z.string().optional(),
        startDate: z.coerce.date().default(new Date()),
        endDate: z.coerce.date().default(addWeeks(new Date(), 10)),
        activity: z.enum(activityIds).optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radius: z.number().optional(),
          })
          .optional(),
      })
    )
    .handler(async ({ context, input, signal }) => {
      const plans = await context.es.projections.plan.findPlans(input);
      return plans;
    }),
  participate: protectedRoute
    .errors({
      NOT_FOUND: { message: "Plan not found" },
      ALREADY_OWNER: { message: "You are already the owner of this plan" },
    })
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input, errors }) => {
      const originalPlan = await context.es.projections.plan.get(input.id);
      if (!originalPlan) throw errors.NOT_FOUND();

      // Check if user is already the owner
      if (originalPlan.creatorId === context.session.id) {
        throw errors.ALREADY_OWNER();
      }

      const newPlanId = uuidv7();

      // Create the new plan with the same data but new creator
      const planData: RealiteEvents["realite.plan.created"] = {
        activity: originalPlan.activity as ActivityId,
        startDate: originalPlan.startDate.toISOString(),
        endDate: originalPlan.endDate?.toISOString(),
        title: originalPlan.title,
        description: originalPlan.description || undefined,
        url: originalPlan.url || undefined,
        gathering: undefined,
        locations: originalPlan.locations?.map((loc) => ({
          title: loc.title || "",
          address: loc.address || undefined,
          latitude: loc.latitude,
          longitude: loc.longitude,
          url: loc.url || undefined,
          description: loc.description || undefined,
          category: loc.category || undefined,
        })),
        repetition: originalPlan.repetition as any,
        maybe: originalPlan.maybe,
      };

      // Emit the plan created event
      await context.es.add({
        type: "realite.plan.created",
        subject: newPlanId,
        data: planData,
      });

      // Emit the participation event
      await context.es.add({
        type: "realite.plan.participated",
        subject: newPlanId,
        data: {
          originalPlanId: input.id,
          originalCreatorId: originalPlan.creatorId,
        },
      });

      return { id: newPlanId, ...planData };
    }),
};
