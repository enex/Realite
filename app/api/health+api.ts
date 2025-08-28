import { runMigrate } from "@/db/migrateInternal";
import { es } from "@/server/es";

let migrated = false;
let migrating = false;

export async function GET(request: Request) {
  if (migrating) {
    return new Response("Migrating...", { status: 503 });
  }
  if (!migrated) {
    try {
      migrating = true;
      try {
        await runMigrate();
      } catch (err) {
        throw new Error("error migrating db", { cause: err });
      }
      try {
        const res = await es.migrate();
        console.log(res);
      } catch (err) {
        throw new Error("error migrating es", { cause: err });
      }
      migrated = true;
    } finally {
      migrating = false;
    }
  }
  return new Response("OK");
}
