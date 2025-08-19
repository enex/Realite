import "dotenv/config";
import { runMigrate } from "./migrateInternal";

runMigrate()
  .catch((err) => {
    console.error("❌ Migration failed");
    console.error(err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
