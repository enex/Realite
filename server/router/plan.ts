import { activities, activityIds, type ActivityId } from "@/shared/activities";
import { coreRepetitionSchema } from "@/shared/validation/plan";
import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { addWeeks, startOfDay } from "date-fns";
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
        `You receive user input mentioning what they want to do. Create a plan from this input.`,
        `CRITICAL: All content (titles, descriptions, location names, etc.) must be in German.`,
        ``,
        `## Activity Selection`,
        `Choose the MOST APPROPRIATE activity from this list. Pay attention to context:`,
        ...Object.entries(activities).flatMap(([groupId, group]) => [
          `- ${groupId}: ${group.nameDe} (${group.name})`,
          ...Object.entries(group.subActivities).map(
            ([subActivityId, description]) =>
              `  - ${groupId}/${subActivityId}: ${description.nameDe} (${description.name})`
          ),
        ]),
        ``,
        `IMPORTANT ACTIVITY RULES:`,
        `- If a term contains both an activity word and another word (e.g., "coffee run"), use web_search to determine what it actually refers to`,
        `- "run" or "jog" typically means RUNNING (sport/running), not food/drink`,
        `- Distinguish between activities: "running" is sport, "coffee" alone is food/drink`,
        `- When in doubt about what an event or term means, ALWAYS search the web first`,
        ``,
        `## Web Search Strategy`,
        `ALWAYS use web_search FIRST when the user mentions:`,
        `- Event names, brand names, or specific event titles`,
        `- Instagram posts, social media events, or hashtags`,
        `- Specific locations that might be events or venues`,
        `- Any ambiguous terms that could refer to events or activities`,
        `- Terms that combine multiple concepts (e.g., activity + location, activity + brand)`,
        ``,
        `IMPORTANT: When using web_search, search for the EXACT phrase or term the user mentioned.`,
        `For example, if user says "greenfit coffee run", search for "greenfit coffee run".`,
        `The web_search tool will automatically extract the search query from your tool call.`,
        ``,
        `Search results will help you discover:`,
        `- What the event/term actually refers to (activity type, location, time, details)`,
        `- Instagram posts or social media content about it`,
        `- Official event pages or announcements`,
        `- Location details and meeting points`,
        `- Any additional context that clarifies the activity type`,
        ``,
        `ONLY after understanding what the event/term actually is from web search results, proceed to location search.`,
        `If web_search doesn't return useful results, proceed with location search anyway using the information you have.`,
        ``,
        `## Location`,
        input.location
          ? `The user's approximate location is ${
              [resolved?.city, resolved?.region, resolved?.country]
                .filter(Boolean)
                .join(", ") ||
              `lat ${input.location.latitude}, lon ${input.location.longitude}`
            }. Prefer suggestions relevant to this area.`
          : `If no location is provided, don't assume a specific city; keep suggestions generic or ask for clarification.`,
        ``,
        `Every plan MUST contain at least one concrete location.`,
        `Use search_location to find real places. If the input is ambiguous, search for 2-3 plausible locations near the user (e.g., parks, cafés, gyms) and add them all so the user can delete incorrect ones.`,
        `Only return locations with names and coordinates from search_location results. NEVER invent coordinates.`,
        ``,
        `## Date and Time`,
        `Today is ${localDateStr} (${now.toISOString().slice(0, 10)}). Local time is ${localTimeStr} in timezone ${timeZone}.`,
        `ALL dates and times must be in ISO 8601 format with correct timezone: YYYY-MM-DDTHH:mm:ss+HH:mm or YYYY-MM-DDTHH:mm:ssZ for UTC.`,
        `IMPORTANT: Consider timezone ${timeZone} for all date/time values. If the user specifies a time (e.g., "10:00" or "10 am"), interpret it as local time in ${timeZone} and convert accordingly.`,
        `If a month/day or weekday would be in the past this year, plan the next future occurrence (possibly next year).`,
        `Every plan must be in the future.`,
        ``,
        `## Workflow`,
        `1. FIRST: Use web_search if user mentions event names, brands, or ambiguous terms`,
        `2. THEN: Use search_location to find concrete places`,
        `3. FINALLY: ALWAYS create the plan with correct activity, location, and time`,
        ``,
        `CRITICAL RULES:`,
        `- You MUST create a plan using the create_plan tool. This is not optional.`,
        `- Even if searches don't return perfect results, create the plan with the best information available.`,
        `- If web_search found information about an event, use that information to create the plan.`,
        `- If location search didn't find exact matches, use the location information from web_search or create a reasonable location based on the event details.`,
        `- The plan MUST be created - never return without creating a plan.`,
      ].join("\n");

      const aiPlanSchema = planSchema.extend({
        locations: locationArraySchema
          .min(1)
          .describe(
            "At least one concrete location. Prefer 2-3 suggestions if uncertain."
          ),
      });

      // Create the plan agent with ToolLoopAgent
      const planAgent = new ToolLoopAgent({
        model: openai("gpt-4o-mini"),
        instructions: systemPrompt,
        tools: {
          create_plan: tool({
            inputSchema: aiPlanSchema,
            description:
              "Create a plan. All text content (titles, descriptions) must be in German. Dates must be in ISO 8601 format with correct timezone. Use information from web_search results to determine the correct activity type, location, and details. You MUST call this tool to create the plan - it is not optional.",
          }),
          web_search: openai.tools.webSearch({
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
              "Search for a physical location/place. This is necessary to create a plan since every plan must have at least one location. Use information from web_search results to find the correct location name.",
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
        stopWhen: stepCountIs(10), // Allow up to 10 steps for tool execution
      });

      // Generate plan using the agent
      const aiResult = await planAgent.generate({
        prompt: input.text,
        abortSignal: signal,
      });

      console.log(
        JSON.stringify(
          aiResult.steps.flatMap((s) => s.toolCalls),
          null,
          2
        )
      );

      // Extract the plan from tool calls
      const createPlanCall = aiResult.steps
        .flatMap((s) => s.toolCalls)
        .find((t) => t.toolName === "create_plan");

      const res = {
        answer: aiResult.text,
        plan: createPlanCall?.input as z.infer<typeof planSchema> | undefined,
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
          getGroupIdFromActivity(res.plan.activity) &&
          activities[
            getGroupIdFromActivity(res.plan.activity) as keyof typeof activities
          ]?.nameDe;
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
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.coerce.date().optional(), // cursor is the startDate of the last item
      })
    )
    .handler(async ({ context, input, signal }) => {
      try {
        // If cursor is provided, use it for pagination (start after cursor)
        // Otherwise, use startDate from filter or now
        const now = new Date();
        const queryStartDate = input.cursor
          ? new Date(input.cursor.getTime() + 1) // Start after cursor to avoid duplicates
          : input.startDate || now;
        const endDate = input.endDate || addWeeks(now, 52); // 1 year ahead

        const plans = await context.es.projections.plan.listMyPlans(
          context.session.id,
          [queryStartDate, endDate],
          input.limit
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
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        activity: z.enum(activityIds).optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radius: z.number().optional(),
          })
          .optional(),
        creatorId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.coerce.date().optional(), // cursor is the startDate of the last item
      })
    )
    .handler(async ({ context, input, signal }) => {
      // If cursor is provided, use it for pagination (start after cursor)
      // Otherwise, use startDate from filter or start of today (to exclude past plans)
      const now = new Date();
      const queryStartDate = input.cursor
        ? new Date(input.cursor.getTime() + 1) // Start after cursor to avoid duplicates
        : input.startDate || startOfDay(now); // Default to start of today to exclude past plans
      const endDate = input.endDate || addWeeks(now, 52); // 1 year ahead

      const plans = await context.es.projections.plan.findPlans({
        ...input,
        startDate: queryStartDate,
        endDate,
        limit: input.limit,
      });
      return plans;
    }),
  getUserPlans: protectedRoute
    .input(
      z.object({
        userId: z.string(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        includePast: z.boolean().optional().default(false),
      })
    )
    .handler(async ({ context, input, signal }) => {
      const now = new Date();
      const startDate = input.startDate || now;
      const endDate = input.endDate || addWeeks(now, 10);

      // If includePast is true, extend startDate to include past plans
      const actualStartDate = input.includePast
        ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
        : startDate;

      const plans = await context.es.projections.plan.findPlans({
        startDate: actualStartDate,
        endDate: endDate,
        creatorId: input.userId,
      });
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
