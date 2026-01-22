/**
 * Admin MCP Server
 *
 * MCP server for administrators to:
 * - View analytics and statistics
 * - Query user data
 * - Perform administrative tasks
 * - Moderate content
 *
 * Requires admin authentication.
 */

import * as schema from "@/db/schema";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { es } from "../es";
import type { MCPAuthContext } from "./auth";

/**
 * Creates and returns the admin MCP server instance
 */
export function createAdminMCPServer(auth: MCPAuthContext): McpServer {
  const server = new McpServer({
    name: "realite-admin",
    version: "1.0.0",
  });

  // ============================================
  // ANALYTICS TOOLS
  // ============================================

  server.tool(
    "get_user_stats",
    "Get overall user statistics including total users, active users, and growth metrics.",
    {
      period: z
        .enum(["day", "week", "month", "year"])
        .default("month")
        .describe("Time period for metrics"),
    },
    async (params) => {
      const periodStart = new Date();
      switch (params.period) {
        case "day":
          periodStart.setDate(periodStart.getDate() - 1);
          break;
        case "week":
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "month":
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "year":
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
      }

      // Count registration events
      const registrations = await db
        .select({ count: count() })
        .from(schema.events)
        .where(
          and(
            eq(schema.events.type, "realite.user.registered"),
            gte(schema.events.time, periodStart),
          ),
        );

      // Count verification events (active users)
      const verifications = await db
        .select({ count: count() })
        .from(schema.events)
        .where(
          and(
            eq(schema.events.type, "realite.auth.phone-code-verified"),
            gte(schema.events.time, periodStart),
          ),
        );

      // Total users (all registrations ever)
      const totalUsers = await db
        .select({ count: count() })
        .from(schema.events)
        .where(eq(schema.events.type, "realite.user.registered"));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              period: params.period,
              periodStart: periodStart.toISOString(),
              stats: {
                totalUsers: totalUsers[0]?.count ?? 0,
                newRegistrations: registrations[0]?.count ?? 0,
                activeLogins: verifications[0]?.count ?? 0,
              },
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_plan_stats",
    "Get statistics about plans/events.",
    {
      period: z
        .enum(["day", "week", "month", "year"])
        .default("month")
        .describe("Time period for metrics"),
    },
    async (params) => {
      const periodStart = new Date();
      switch (params.period) {
        case "day":
          periodStart.setDate(periodStart.getDate() - 1);
          break;
        case "week":
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "month":
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "year":
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
      }

      // Plans created in period
      const plansCreated = await db
        .select({ count: count() })
        .from(schema.plans)
        .where(gte(schema.plans.createdAt, periodStart));

      // Total plans
      const totalPlans = await db.select({ count: count() }).from(schema.plans);

      // Plans by status
      const plansByStatus = await db
        .select({
          status: schema.plans.status,
          count: count(),
        })
        .from(schema.plans)
        .groupBy(schema.plans.status);

      // Plans by activity (top 10)
      const plansByActivity = await db
        .select({
          activity: schema.plans.activity,
          count: count(),
        })
        .from(schema.plans)
        .where(gte(schema.plans.createdAt, periodStart))
        .groupBy(schema.plans.activity)
        .orderBy(desc(count()))
        .limit(10);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              period: params.period,
              periodStart: periodStart.toISOString(),
              stats: {
                totalPlans: totalPlans[0]?.count ?? 0,
                newPlans: plansCreated[0]?.count ?? 0,
                byStatus: plansByStatus,
                topActivities: plansByActivity,
              },
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_intent_stats",
    "Get statistics about user intents.",
    {
      period: z
        .enum(["day", "week", "month", "year"])
        .default("month")
        .describe("Time period for metrics"),
    },
    async (params) => {
      const periodStart = new Date();
      switch (params.period) {
        case "day":
          periodStart.setDate(periodStart.getDate() - 1);
          break;
        case "week":
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "month":
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "year":
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
      }

      // Intents created in period
      const intentsCreated = await db
        .select({ count: count() })
        .from(schema.intents)
        .where(gte(schema.intents.createdAt, periodStart));

      // Total active intents
      const activeIntents = await db
        .select({ count: count() })
        .from(schema.intents)
        .where(eq(schema.intents.status, "active"));

      // Intents by activity (top 10)
      const intentsByActivity = await db
        .select({
          activity: schema.intents.activity,
          count: count(),
        })
        .from(schema.intents)
        .where(eq(schema.intents.status, "active"))
        .groupBy(schema.intents.activity)
        .orderBy(desc(count()))
        .limit(10);

      // Intent requests stats
      const requestsCreated = await db
        .select({ count: count() })
        .from(schema.intentRequests)
        .where(gte(schema.intentRequests.createdAt, periodStart));

      const requestsByStatus = await db
        .select({
          status: schema.intentRequests.status,
          count: count(),
        })
        .from(schema.intentRequests)
        .groupBy(schema.intentRequests.status);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              period: params.period,
              periodStart: periodStart.toISOString(),
              stats: {
                newIntents: intentsCreated[0]?.count ?? 0,
                totalActiveIntents: activeIntents[0]?.count ?? 0,
                topActivities: intentsByActivity,
                requests: {
                  newRequests: requestsCreated[0]?.count ?? 0,
                  byStatus: requestsByStatus,
                },
              },
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_event_log",
    "Query the event log for debugging and auditing purposes.",
    {
      eventType: z
        .string()
        .optional()
        .describe("Filter by event type (e.g., 'realite.user.registered')"),
      subject: z.string().uuid().optional().describe("Filter by subject ID"),
      actor: z.string().uuid().optional().describe("Filter by actor ID"),
      startDate: z.string().optional().describe("Start date (ISO 8601)"),
      endDate: z.string().optional().describe("End date (ISO 8601)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Maximum results"),
    },
    async (params) => {
      const conditions = [];

      if (params.eventType) {
        conditions.push(eq(schema.events.type, params.eventType));
      }
      if (params.subject) {
        conditions.push(eq(schema.events.subject, params.subject));
      }
      if (params.actor) {
        conditions.push(eq(schema.events.actor, params.actor));
      }
      if (params.startDate) {
        conditions.push(gte(schema.events.time, new Date(params.startDate)));
      }
      if (params.endDate) {
        conditions.push(lte(schema.events.time, new Date(params.endDate)));
      }

      const events = await db
        .select({
          id: schema.events.id,
          type: schema.events.type,
          subject: schema.events.subject,
          actor: schema.events.actor,
          time: schema.events.time,
          data: schema.events.data,
        })
        .from(schema.events)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.events.time))
        .limit(params.limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              events: events.map((e) => ({
                ...e,
                // Redact sensitive data
                data: e.type.includes("auth") ? "[REDACTED]" : e.data,
              })),
              count: events.length,
            }),
          },
        ],
      };
    },
  );

  // ============================================
  // USER MANAGEMENT TOOLS
  // ============================================

  server.tool(
    "lookup_user",
    "Look up a user by their ID or phone number.",
    {
      userId: z.string().uuid().optional().describe("User ID to look up"),
      phoneNumber: z.string().optional().describe("Phone number to look up"),
    },
    async (params) => {
      if (!params.userId && !params.phoneNumber) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Either userId or phoneNumber must be provided",
              }),
            },
          ],
        };
      }

      let userId = params.userId;

      // If phone number provided, find user ID
      if (params.phoneNumber && !userId) {
        // Look up through events
        const verifyEvent = await db
          .select({ data: schema.events.data })
          .from(schema.events)
          .where(
            and(
              eq(schema.events.type, "realite.auth.phone-code-verified"),
              sql`${schema.events.data}->>'phoneNumber' = ${params.phoneNumber}`,
            ),
          )
          .orderBy(desc(schema.events.time))
          .limit(1);

        if (verifyEvent.length > 0 && verifyEvent[0].data) {
          userId = (verifyEvent[0].data as any).userId;
        }
      }

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "User not found" }),
            },
          ],
        };
      }

      const profile = await es.projections.user.getProfile(userId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              user: {
                id: profile.id,
                name: profile.name,
                phoneNumber: profile.phoneNumber
                  ? `${profile.phoneNumber.slice(0, 4)}****${profile.phoneNumber.slice(-2)}`
                  : null,
                onboarded: profile.onboarded,
                deleted: profile.deleted,
                deletedAt: profile.deletedAt,
              },
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_user_plans",
    "List plans for a specific user.",
    {
      userId: z.string().uuid().describe("User ID to query"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Maximum results"),
    },
    async (params) => {
      const plans = await db
        .select({
          id: schema.plans.id,
          title: schema.plans.title,
          activity: schema.plans.activity,
          startDate: schema.plans.startDate,
          status: schema.plans.status,
          createdAt: schema.plans.createdAt,
        })
        .from(schema.plans)
        .where(eq(schema.plans.creatorId, params.userId))
        .orderBy(desc(schema.plans.startDate))
        .limit(params.limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              userId: params.userId,
              plans,
              count: plans.length,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_user_intents",
    "List intents for a specific user.",
    {
      userId: z.string().uuid().describe("User ID to query"),
      includeWithdrawn: z
        .boolean()
        .default(false)
        .describe("Include withdrawn intents"),
    },
    async (params) => {
      const conditions = [eq(schema.intents.userId, params.userId)];
      if (!params.includeWithdrawn) {
        conditions.push(eq(schema.intents.status, "active"));
      }

      const intents = await db
        .select({
          id: schema.intents.id,
          title: schema.intents.title,
          activity: schema.intents.activity,
          status: schema.intents.status,
          visibility: schema.intents.visibility,
          createdAt: schema.intents.createdAt,
        })
        .from(schema.intents)
        .where(and(...conditions))
        .orderBy(desc(schema.intents.createdAt));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              userId: params.userId,
              intents,
              count: intents.length,
            }),
          },
        ],
      };
    },
  );

  // ============================================
  // MODERATION TOOLS
  // ============================================

  server.tool(
    "delete_user",
    "Mark a user as deleted (soft delete). This is a serious action.",
    {
      userId: z.string().uuid().describe("User ID to delete"),
      reason: z
        .string()
        .min(10)
        .describe("Reason for deletion (required for audit)"),
    },
    async (params) => {
      await es.withActor(auth.userId).add({
        type: "realite.user.deleted",
        subject: params.userId,
        data: {
          reason: params.reason,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `User ${params.userId} marked as deleted`,
              reason: params.reason,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "cancel_plan_admin",
    "Cancel a plan as an admin action. Use for moderation.",
    {
      planId: z.string().uuid().describe("Plan ID to cancel"),
      reason: z
        .enum(["schedule-conflict", "no-participants", "other"])
        .default("other")
        .describe("Reason category for cancellation"),
      message: z
        .string()
        .min(10)
        .optional()
        .describe("Additional details about the cancellation (audit trail)"),
    },
    async (params) => {
      await es.withActor(auth.userId).add({
        type: "realite.plan.cancelled",
        subject: params.planId,
        data: {
          reason: params.reason,
          message: params.message,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Plan ${params.planId} cancelled by admin`,
              reason: params.reason,
              cancelledBy: auth.userId,
            }),
          },
        ],
      };
    },
  );

  // ============================================
  // RESOURCES
  // ============================================

  server.resource(
    "event-types",
    "realite://admin/event-types",
    {
      description: "List of all event types in the system",
      mimeType: "application/json",
    },
    async () => {
      const eventTypes = await db
        .selectDistinct({ type: schema.events.type })
        .from(schema.events)
        .orderBy(asc(schema.events.type));

      return {
        contents: [
          {
            uri: "realite://admin/event-types",
            mimeType: "application/json",
            text: JSON.stringify(
              eventTypes.map((e) => e.type),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
