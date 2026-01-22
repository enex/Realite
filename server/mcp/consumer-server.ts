/**
 * Consumer MCP Server
 *
 * MCP server for regular users to:
 * - Create and manage plans
 * - Express and manage intents
 * - Query other users' intents for potential meetups
 * - Receive and respond to plan suggestions
 *
 * This allows users to instruct their LLMs to plan for them.
 */

import {
  activityIds,
  getActivityLabel,
  type ActivityId,
} from "@/shared/activities";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { es } from "../es";
import type { RealiteEvents } from "../events";
import type { MCPAuthContext } from "./auth";

// Zod schemas for MCP tools
const createPlanSchema = z.object({
  title: z.string().min(1).max(200).describe("Title of the plan"),
  description: z.string().max(1000).optional().describe("Optional description"),
  activity: z
    .enum(activityIds)
    .describe(
      "Activity category (e.g., 'sport/basketball', 'food_drink/restaurant')",
    ),
  startDate: z.string().describe("Start date in ISO 8601 format"),
  endDate: z
    .string()
    .optional()
    .describe("Optional end date in ISO 8601 format"),
  location: z
    .object({
      title: z.string().describe("Name of the location"),
      address: z.string().describe("Address of the location"),
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
      url: z.string().optional().describe("Optional URL for the location"),
    })
    .describe("Location details for the plan"),
  openTo: z
    .enum(["specific", "contacts", "public"])
    .optional()
    .describe(
      "Who can join: 'specific' (only invited), 'contacts' (your contacts), or 'public'",
    ),
  maxParticipants: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional maximum number of participants"),
});

const intentSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(120)
    .describe("Brief description of what you want to do"),
  description: z
    .string()
    .max(500)
    .optional()
    .describe("Additional details about your intent"),
  activity: z.enum(activityIds).describe("Activity category"),
  visibility: z
    .enum(["public", "contacts"])
    .default("public")
    .describe("Who can see this intent"),
});

const queryIntentsSchema = z.object({
  activities: z
    .array(z.enum(activityIds))
    .optional()
    .describe("Filter by activity types"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of results"),
});

const respondToSuggestionSchema = z.object({
  requestId: z
    .string()
    .uuid()
    .describe("ID of the suggestion/request to respond to"),
  status: z
    .enum(["accepted", "declined", "counter"])
    .describe(
      "Your response: accept, decline, or counter with a different proposal",
    ),
  message: z
    .string()
    .max(500)
    .optional()
    .describe("Optional message with your response"),
  planId: z
    .string()
    .uuid()
    .optional()
    .describe("If accepting or countering, the plan ID to join or propose"),
});

const sendRequestSchema = z.object({
  toUserId: z.string().uuid().describe("User ID to send the request to"),
  activity: z.enum(activityIds).describe("Activity category for the request"),
  title: z.string().min(1).max(120).describe("Title of your request"),
  message: z
    .string()
    .max(500)
    .optional()
    .describe("Optional message to include"),
});

const findPlansSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Search query for plan title or location"),
  startDate: z.string().describe("Start date for search range (ISO 8601)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for search range (ISO 8601)"),
  activity: z.enum(activityIds).optional().describe("Filter by activity"),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z
        .number()
        .optional()
        .describe("Search radius in meters (default 5000)"),
    })
    .optional()
    .describe("Filter by location proximity"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results"),
});

/**
 * Creates and returns the consumer MCP server instance
 */
export function createConsumerMCPServer(auth: MCPAuthContext): McpServer {
  const server = new McpServer({
    name: "realite-consumer",
    version: "1.0.0",
  });

  const userEs = es.withActor(auth.userId);

  // ============================================
  // PLAN TOOLS
  // ============================================

  server.tool(
    "create_plan",
    "Create a new plan/event. Use this when the user wants to schedule an activity at a specific time and place.",
    createPlanSchema.shape,
    async (params) => {
      const id = uuidv7();
      const data: RealiteEvents["realite.plan.scheduled"] = {
        activity: params.activity as ActivityId,
        startDate: params.startDate,
        endDate: params.endDate,
        title: params.title,
        description: params.description,
        location: params.location,
        openTo: params.openTo,
        maxParticipants: params.maxParticipants,
      };

      await userEs.add({
        type: "realite.plan.scheduled",
        subject: id,
        data,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              planId: id,
              message: `Plan "${params.title}" created successfully for ${new Date(params.startDate).toLocaleDateString()}`,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_my_plans",
    "List all your upcoming plans. Use this to see what the user already has scheduled.",
    {
      startDate: z
        .string()
        .optional()
        .describe("Start of date range (ISO 8601), defaults to today"),
      endDate: z
        .string()
        .optional()
        .describe("End of date range (ISO 8601), defaults to 1 year from now"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Maximum number of plans to return"),
    },
    async (params) => {
      const start = params.startDate ? new Date(params.startDate) : new Date();
      const end = params.endDate
        ? new Date(params.endDate)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const plans = await es.projections.plan.listMyPlans(
        auth.userId,
        [start, end],
        params.limit,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              plans: plans.map((p) => ({
                id: p.id,
                title: p.title,
                activity: p.activity,
                activityLabel: getActivityLabel(p.activity as ActivityId),
                startDate: p.startDate,
                endDate: p.endDate,
                location: p.location,
                similarPlans: p.similarOverlappingPlans,
              })),
              count: plans.length,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "find_plans",
    "Search for plans/events that others have created. Use this to find activities to join.",
    findPlansSchema.shape,
    async (params) => {
      const endDate = params.endDate
        ? new Date(params.endDate)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year from now

      const plans = await es.projections.plan.findPlans({
        query: params.query,
        startDate: new Date(params.startDate),
        endDate,
        activity: params.activity as ActivityId | undefined,
        location: params.location,
        limit: params.limit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              plans: plans.map((p) => ({
                id: p.id,
                title: p.title,
                activity: p.activity,
                activityLabel: getActivityLabel(p.activity as ActivityId),
                startDate: p.startDate,
                endDate: p.endDate,
                location: {
                  title: p.locationTitle,
                  address: p.address,
                  latitude: p.latitude,
                  longitude: p.longitude,
                },
              })),
              count: plans.length,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "cancel_plan",
    "Cancel one of your plans. This will notify any participants.",
    {
      planId: z.string().uuid().describe("ID of the plan to cancel"),
      reason: z
        .enum(["schedule-conflict", "no-participants", "other"])
        .default("other")
        .describe("Reason for cancellation"),
    },
    async (params) => {
      await userEs.add({
        type: "realite.plan.cancelled",
        subject: params.planId,
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
              message: "Plan cancelled successfully",
            }),
          },
        ],
      };
    },
  );

  // ============================================
  // INTENT TOOLS
  // ============================================

  server.tool(
    "express_intent",
    "Express an intent - something the user would like to do. This helps match with others who have similar interests.",
    intentSchema.shape,
    async (params) => {
      const id = uuidv7();
      const data: RealiteEvents["realite.intent.expressed"] = {
        title: params.title,
        description: params.description,
        activity: params.activity as ActivityId,
        visibility: params.visibility,
      };

      await userEs.add({
        type: "realite.intent.expressed",
        subject: id,
        data,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              intentId: id,
              message: `Intent "${params.title}" expressed. Others with similar interests can now find you.`,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_my_intents",
    "List all your active intents. These are things you've expressed interest in doing.",
    {},
    async () => {
      const intents = await es.projections.intent.listMine(auth.userId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              intents: intents.map((i) => ({
                id: i.id,
                title: i.title,
                description: i.description,
                activity: i.activity,
                activityLabel: getActivityLabel(i.activity as ActivityId),
                visibility: i.visibility,
                createdAt: i.createdAt,
              })),
              count: intents.length,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "withdraw_intent",
    "Withdraw/remove an intent. Use this when the user is no longer interested.",
    {
      intentId: z.string().uuid().describe("ID of the intent to withdraw"),
      reason: z
        .enum(["not-interested-anymore", "found-alternative", "other"])
        .default("not-interested-anymore")
        .describe("Reason for withdrawing"),
    },
    async (params) => {
      const data: RealiteEvents["realite.intent.withdrawn"] = {
        reason: params.reason,
      };

      await userEs.add({
        type: "realite.intent.withdrawn",
        subject: params.intentId,
        data,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Intent withdrawn successfully",
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "find_matching_intents",
    "Find other users who have expressed similar intents. Use this to find potential meetup partners.",
    queryIntentsSchema.shape,
    async (params) => {
      // First get user's own intents to know what activities to match
      const myIntents = await es.projections.intent.listMine(auth.userId);
      const activities = params.activities?.length
        ? (params.activities as ActivityId[])
        : myIntents.map((i) => i.activity as ActivityId);

      if (!activities.length) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                matches: [],
                message:
                  "No intents to match against. Express some intents first or specify activities to search.",
              }),
            },
          ],
        };
      }

      const matches = await es.projections.intent.getActivityMatchSummary({
        userId: auth.userId,
        activities,
        limit: params.limit,
      });

      // Enrich with user profiles
      const enrichedMatches = await Promise.all(
        matches.map(async (m) => {
          const users = await Promise.all(
            (m.userIds ?? []).slice(0, 5).map(async (id) => {
              const u = await es.projections.user.getProfile(id);
              return u ? { id: u.id, name: u.name, image: u.image } : null;
            }),
          );

          return {
            activity: m.activity,
            activityLabel: getActivityLabel(m.activity),
            matchCount: m.matchCount,
            users: users.filter(Boolean),
          };
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              matches: enrichedMatches,
              totalMatches: enrichedMatches.reduce(
                (sum, m) => sum + m.matchCount,
                0,
              ),
            }),
          },
        ],
      };
    },
  );

  // ============================================
  // REQUEST/SUGGESTION TOOLS
  // ============================================

  server.tool(
    "send_plan_request",
    "Send a request to another user to do an activity together. Use this to initiate plans with matched users.",
    sendRequestSchema.shape,
    async (params) => {
      const id = uuidv7();
      const data: RealiteEvents["realite.intent-request.sent"] = {
        toUserId: params.toUserId,
        activity: params.activity as ActivityId,
        title: params.title,
        message: params.message,
      };

      await userEs.add({
        type: "realite.intent-request.sent",
        subject: id,
        data,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              requestId: id,
              message: `Request sent to user. They will be notified.`,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_incoming_requests",
    "List incoming requests/suggestions from other users who want to do activities together.",
    {},
    async () => {
      const requests = await es.projections.intentRequest.listInbox(
        auth.userId,
      );

      // Enrich with sender profiles
      const enrichedRequests = await Promise.all(
        requests.map(async (r) => {
          const fromUser = await es.projections.user.getProfile(r.fromUserId);
          return {
            id: r.id,
            fromUser: fromUser
              ? { id: fromUser.id, name: fromUser.name, image: fromUser.image }
              : null,
            activity: r.activity,
            activityLabel: getActivityLabel(r.activity as ActivityId),
            title: r.title,
            message: r.message,
            status: r.status,
            createdAt: r.createdAt,
          };
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              requests: enrichedRequests,
              count: enrichedRequests.length,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "respond_to_request",
    "Respond to an incoming request/suggestion. You can accept, decline, or counter with a different proposal.",
    respondToSuggestionSchema.shape,
    async (params) => {
      const data: RealiteEvents["realite.intent-request.responded"] = {
        status: params.status,
        message: params.message,
        planId: params.planId,
      };

      await userEs.add({
        type: "realite.intent-request.responded",
        subject: params.requestId,
        data,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Request ${params.status}. The sender will be notified.`,
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
    "activities",
    "realite://activities",
    {
      description: "List of all available activity categories",
      mimeType: "application/json",
    },
    async () => {
      const activityList = activityIds.map((id) => ({
        id,
        label: getActivityLabel(id as ActivityId),
      }));

      return {
        contents: [
          {
            uri: "realite://activities",
            mimeType: "application/json",
            text: JSON.stringify(activityList, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "my-profile",
    "realite://profile/me",
    {
      description: "Your user profile information",
      mimeType: "application/json",
    },
    async () => {
      const profile = await es.projections.user.getProfile(auth.userId);

      return {
        contents: [
          {
            uri: "realite://profile/me",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                id: profile.id,
                name: profile.name,
                image: profile.image,
              },
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
