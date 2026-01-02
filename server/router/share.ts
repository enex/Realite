import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import { protectedRoute } from "../orpc";

export const shareRouter = {
  receive: protectedRoute
    .input(
      z.object({
        url: z.string().url().optional(),
        text: z.string().max(5000).optional(),
        meta: z
          .object({
            title: z.string().max(500).optional(),
            description: z.string().max(2000).optional(),
          })
          .optional(),
        source: z
          .enum(["instagram", "browser", "whatsapp", "other", "unknown"])
          .optional()
          .default("unknown"),
      }),
    )
    .handler(async ({ context, input }) => {
      const id = uuidv7();
      await context.es.add({
        type: "realite.share.received",
        subject: id,
        data: {
          url: input.url,
          text: input.text,
          meta: input.meta,
          source: input.source,
          version: 1,
        },
      });
      return { id };
    }),
};
