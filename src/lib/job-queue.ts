import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/src/db/client";
import { jobQueue } from "@/src/db/schema";
import {
  triggerDashboardBackgroundSync,
  waitForDashboardSync,
} from "@/src/lib/background-sync";

export const JOB_TYPE_DASHBOARD_SYNC = "dashboard_sync";

type DashboardSyncPayload = { userId: string };

const handlers: {
  [key: string]: (payload: Record<string, unknown>) => Promise<void>;
} = {
  [JOB_TYPE_DASHBOARD_SYNC]: async (payload) => {
    const { userId } = payload as DashboardSyncPayload;
    if (!userId || typeof userId !== "string") {
      throw new Error("dashboard_sync job requires payload.userId");
    }
    triggerDashboardBackgroundSync(userId, { force: true });
    await waitForDashboardSync(userId);
  },
};

/**
 * Enqueue a job. Returns the job id.
 */
export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(jobQueue)
    .values({
      type,
      payload,
      status: "pending",
    })
    .returning({ id: jobQueue.id });
  if (!row?.id) throw new Error("enqueue: insert did not return id");
  return row.id;
}

/**
 * Claim and process one pending job. Uses status = 'pending' + update to
 * 'processing' to avoid two workers taking the same job. Returns true if a job
 * was processed, false if queue was empty or job was already claimed.
 */
async function processOne(): Promise<boolean> {
  const db = getDb();
  const [candidate] = await db
    .select()
    .from(jobQueue)
    .where(eq(jobQueue.status, "pending"))
    .orderBy(asc(jobQueue.createdAt))
    .limit(1);
  if (!candidate) return false;

  const [claimed] = await db
    .update(jobQueue)
    .set({
      status: "processing",
      startedAt: new Date(),
      attempts: candidate.attempts + 1,
    })
    .where(
      and(
        eq(jobQueue.id, candidate.id),
        eq(jobQueue.status, "pending"),
      ),
    )
    .returning();
  if (!claimed) return false;

  const handler = handlers[claimed.type];
  if (!handler) {
    await db
      .update(jobQueue)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: `Unknown job type: ${claimed.type}`,
      })
      .where(eq(jobQueue.id, claimed.id));
    return true;
  }

  try {
    await handler(claimed.payload as Record<string, unknown>);
    await db
      .update(jobQueue)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(jobQueue.id, claimed.id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    const shouldRetry =
      claimed.attempts < claimed.maxAttempts;
    await db
      .update(jobQueue)
      .set({
        status: shouldRetry ? "pending" : "failed",
        completedAt: shouldRetry ? null : new Date(),
        errorMessage: message,
        ...(shouldRetry ? { startedAt: null } : {}),
      })
      .where(eq(jobQueue.id, claimed.id));
  }
  return true;
}

/**
 * Process up to `maxJobs` pending jobs (default 10). Stops when queue is empty
 * or no job was claimed.
 */
export async function processQueue(maxJobs = 10): Promise<number> {
  let processed = 0;
  for (let i = 0; i < maxJobs; i++) {
    const didOne = await processOne();
    if (!didOne) break;
    processed++;
  }
  return processed;
}
