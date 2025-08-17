import { activityIds } from "@/shared/activities";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { randomUUIDv7 } from "bun";
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
      if (input.inputText) {
        let aiResult = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: planSchema,
          abortSignal: signal,
          system:
            "You receive the input of a user that mentions what he or she wants to do. You create a plan out of this input.",
          prompt: input.inputText,
        });
        if (aiResult.object) {
          if (!input.title) input.title = aiResult.object.title;
          if (!input.description)
            input.description = aiResult.object.description;
          if (!input.times) input.times = aiResult.object.times;
        }
        //TODO: search for possible locations
        //TODO: allow retrieval of information from the web
      }

      const id = randomUUIDv7();

      if (!input.activity) throw errors.INCOMPLETE();

      await context.es.add({
        type: "realite.plan.created",
        subject: id,
        data: { activity: input.activity!, times: [], ...input },
      });
      return input;
    }),
};
