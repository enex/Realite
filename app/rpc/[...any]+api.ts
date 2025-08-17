import { db } from "@/server/db";
import { router } from "@/server/router";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { jwtVerify } from "jose";

export const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
});

async function base(request: Request): Promise<Response> {
  let session: any | undefined = undefined;
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    if (token && process.env.JWT_SECRET) {
      const decoded = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );
      const payload: any = decoded.payload;
      session = {
        id: payload.id,
        name: payload.name,
        image: payload.image,
        phoneNumber: payload.phoneNumber,
      };
    }
  } catch {
    // ignore and keep session undefined
  }

  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {
      headers: request.headers as any,
      db,
      session,
    },
  });
  if (matched) {
    return response;
  }

  return new Response("Not found", { status: 404 });
}

export const GET = base;
export const POST = base;
export const OPTIONS = base;
export const PATCH = base;
export const PUT = base;
export const DELETE = base;
export const HEAD = base;
