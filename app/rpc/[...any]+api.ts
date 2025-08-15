import { router } from "@/server/orpc";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";

export const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
});

async function base(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {
      headers: request.headers as any,
    }, // Provide initial context if needed
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
