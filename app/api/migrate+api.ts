import { es } from "@/server/es";

export async function GET(request: Request) {
  const res = await es.migrate();
  return new Response(JSON.stringify(res), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
