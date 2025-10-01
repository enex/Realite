import { openAPIGenerator } from "@/server/openapi";
import { router } from "@/server/router";

export async function GET(request: Request) {
  const spec = await openAPIGenerator.generate(router, {
    info: {
      title: "Realite API",
      version: "0.1.0",
    },
    servers: [{ url: "/api" } /** Should use absolute URLs in production */],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  });
  return new Response(JSON.stringify(spec), {
    headers: { "Content-Type": "application/json" },
  });
}
