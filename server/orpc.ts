import { ORPCError, os } from "@orpc/server";
import type { IncomingHttpHeaders } from "node:http";
import * as z from "zod";

const parseJWT = (token: string) => {
  return { id: 1, name: "name" };
};

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const router = {
  planet: {
    list: os
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).default(0),
        })
      )
      .handler(async ({ input }) => {
        // your list code here
        return [{ id: 1, name: "name" }];
      }),
    find: os
      .input(PlanetSchema.pick({ id: true }))
      .handler(async ({ input }) => {
        // your find code here
        return { id: 1, name: "name" };
      }),
    create: os
      .$context<{ headers: IncomingHttpHeaders }>()
      .use(({ context, next }) => {
        const user = parseJWT(
          context.headers.authorization?.split(" ")[1] || ""
        );

        if (user) {
          return next({ context: { user } });
        }

        throw new ORPCError("UNAUTHORIZED");
      })
      .input(PlanetSchema.omit({ id: true }))
      .handler(async ({ input, context }) => {
        // your create code here
        return { id: 1, name: "name" };
      }),
  },
};
