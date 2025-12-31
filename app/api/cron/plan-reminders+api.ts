import { checkAndSendReminders } from "@/server/services/plan-reminders";

/**
 * Cron endpoint for checking and sending plan reminder push notifications
 * Should be called periodically (e.g., daily) by an external cron service
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: Request) {
  // Check for cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("X-Cron-Secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await checkAndSendReminders();
    
    return Response.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in plan reminders cron:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Also support POST for compatibility with some cron services
 */
export async function POST(request: Request) {
  return GET(request);
}

