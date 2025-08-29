import { ORPCError, os } from "@orpc/server";
import type { DB } from "./db";
import { es } from "./es";

export type ServerContext = {
  headers: Headers | Record<string, string>;
  db: DB;
  session?: {
    id: string;
    name?: string | null;
    image?: string | null;
    phoneNumber?: string | null;
  };
};

export const publicRoute = os
  .$context<ServerContext>()
  .use(async ({ next, context }) => {
    try {
      return next({
        context: {
          ...context,
          es,
        },
      });
    } catch (error) {
      // Global ORPC route error logging
      console.error("[ORPC] Route error:", error);
      throw error;
    }
  });
export const protectedRoute = publicRoute
  .errors({
    UNAUTHORIZED: { message: "Unauthorized" },
  })
  .use(({ context, next }) => {
    if (!context.session) throw new ORPCError("UNAUTHORIZED");
    try {
      return next({
        context: {
          ...context,
          session: context.session!,
          es: es.withActor(context.session.id),
        },
      });
    } catch (error) {
      console.error("[ORPC] Route error:", error);
      throw error;
    }
  });
