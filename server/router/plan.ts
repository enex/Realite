import { activities, activityIds } from "@/shared/activities";
import { coreRepetitionSchema } from "@/shared/validation/plan";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import type { RealiteEvents } from "../events";
import { protectedRoute } from "../orpc";

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
        name: z.string(),
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
      return data;
    }),
  withAI: protectedRoute
    .input(z.object({ text: z.string() }))
    .handler(async ({ context, input, signal }) => {
      const systemPrompt = [
        `You receive the input of a user that mentions what he or she wants to do. You create a plan out of this input.`,
        `Decide on the correct activity for the plan. Use the most appropriate activity form the list:`,
        ...Object.entries(activities).flatMap(([groupId, group]) => [
          `- ${groupId}: ${group.name}`,
          ...Object.entries(group.subActivities).map(
            ([subActivityId, description]) =>
              `  - ${subActivityId}: ${description.name}`
          ),
        ]),
        `If a event is referenced, search after the event using the web_search tool. And fill in correct information for the plan.`,
        `Today is ${new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })} and it is ${new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })} Uhr.`,
      ].join("\n");

      //TODO: pass location properly
      //TODO: integrate location search properly
      let aiResult = await generateText({
        model: openai("gpt-4o-mini"),
        abortSignal: signal,
        system: systemPrompt,
        prompt: input.text,
        toolChoice: "required",
        prepareStep: ({ stepNumber }) => {
          if (stepNumber > 3) {
            return { toolChoice: "required", activeTools: ["createPlan"] };
          }
        },
        stopWhen: stepCountIs(5),
        tools: {
          createPlan: tool({
            inputSchema: planSchema,
            description: "Create a plan",
          }),
          web_search: openai.tools.webSearchPreview({
            // optional configuration:
            searchContextSize: "high",
            userLocation: {
              type: "approximate",
              city: "San Francisco",
              region: "California",
            },
          }),
          /*searchLocation: tool({
            inputSchema: locationRouter.search["~orpc"].inputSchema!,
            description: "Search for a location",
            execute: async ({ query }) => {
              const locations = await context.es.projections.location.search(query);
              return locations;
            },
          }),*/
        },
      });
      console.log(JSON.stringify(aiResult.toolCalls, null, 2));
      const res = {
        answer: aiResult.text,
        plan: aiResult.toolCalls.find((r) => r.toolName === "createPlan")
          ?.input as z.infer<typeof planSchema>,
      };
      console.log(res);
      return res;
    }),
  myPlans: protectedRoute.handler(async ({ context, signal }) => {
    try {
      const plans = await context.es.projections.plan.listMyPlans(
        context.session.id
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
};
