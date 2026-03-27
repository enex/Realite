import { spawn } from "node:child_process";

import postgres from "postgres";

const MIGRATION_LOCK_ID = 218031355;

function runCommand(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    console.log("[db:migrate:locked] waiting for advisory lock");
    await sql`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    console.log("[db:migrate:locked] acquired advisory lock");

    const exitCode = await runCommand("bun", ["run", "db:migrate:raw"]);
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  } finally {
    try {
      await sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

main().catch((error) => {
  console.error("[db:migrate:locked] failed", error);
  process.exit(1);
});
