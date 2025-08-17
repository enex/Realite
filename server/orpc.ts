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

export const publicRoute = os.$context<ServerContext>();
export const protectedRoute = publicRoute
  .errors({
    UNAUTHORIZED: { message: "Unauthorized" },
  })
  .use(({ context, next }) => {
    if (!context.session) throw new ORPCError("UNAUTHORIZED");
    return next({
      context: {
        ...context,
        session: context.session!,
        es: es.withActor(context.session.id),
      },
    });
  });
