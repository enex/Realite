import { activityIds } from "@/shared/activities";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { protectedRoute } from "../orpc";

const planSchema = z.object({
  url: z.string().optional(),
  title: z.string(),
  description: z.string(),
  activity: z.enum(activityIds).optional(),
  times: z.array(z.object({ start: z.string(), end: z.string() })),
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

      if (!input.activity) throw errors.INCOMPLETE();

      await context.es.add({
        type: "realite.plan.created",
        subject: id,
        data: { activity: input.activity!, times: [], ...input },
      });
      return input;
    }),
  withAI: protectedRoute
    .input(z.object({ text: z.string() }))
    .handler(async ({ context, input, signal }) => {
      //TODO: pass location properly
      //TODO: integrate location search properly
      let aiResult = await generateText({
        model: openai("gpt-4o-mini"),
        abortSignal: signal,
        system:
          "You receive the input of a user that mentions what he or she wants to do. You create a plan out of this input.",
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
  list: protectedRoute.handler(async ({ context, signal }) => {
    const plans = await context.es.projections.plan.list();

    return plans;
  }),
};
