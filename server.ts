import { createRequestHandler } from "@expo/server/adapter/bun";
import { RPCHandler } from "@orpc/server/websocket";
import * as React from "react";
import Test from "./server/og/test";
import { router } from "./server/router";

const CLIENT_BUILD_DIR = `${process.cwd()}/dist/client`;
const SERVER_BUILD_DIR = `${process.cwd()}/dist/server`;
const handleRequest = createRequestHandler({ build: SERVER_BUILD_DIR });

const port = process.env.PORT || 3000;
const handler = new RPCHandler(router);

Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req, server) {
    const url = new URL(req.url);
    console.log("Request URL:", url.pathname);

    // OG Image endpoint for user profile shares
    if (url.pathname.startsWith("/api/og/share/")) {
      const { ImageResponse } = await import("@vercel/og");
      const code = url.pathname.replace("/api/og/share/", "");

      try {
        // Get link info to find user ID
        const { db } = await import("./server/db");
        const { eq, and } = await import("drizzle-orm");
        const { events } = await import("./server/db/schema");

        const linkEvents = await db.query.events.findMany({
          where: and(
            eq(events.type, "realite.link.created"),
            eq(events.subject, code)
          ),
        });

        if (linkEvents.length === 0) {
          return new Response("Link not found", { status: 404 });
        }

        const eventData = linkEvents[linkEvents.length - 1]?.data as any;
        const userId = eventData?.targetId;

        if (!userId) {
          return new Response("Invalid link", { status: 400 });
        }

        // Fetch user profile and plans
        // es is already initialized with db, so we can use it directly
        const { es: esInstance } = await import("./server/es");
        const userProfile =
          await esInstance.projections.lazy.user.getProfile(userId);
        const plans = await esInstance.projections.inline.plan.findPlans({
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
          creatorId: userId,
          limit: 5,
        });

        const UserProfileOG = (await import("./server/og/user-profile"))
          .default;
        const element = React.createElement(UserProfileOG, {
          userName: userProfile?.name || "Benutzer",
          userImage: userProfile?.image || null,
          plansCount: plans?.length || 0,
          upcomingPlans: (plans || []).slice(0, 3).map((p: any) => ({
            title: p.title || "",
            startDate: p.startDate?.toISOString() || new Date().toISOString(),
            activity: p.activity,
          })),
        });
        return new ImageResponse(element, { width: 1200, height: 630 });
      } catch (error) {
        console.error("OG image generation error:", error);
        return new Response("Error generating image", { status: 500 });
      }
    }

    if (url.pathname === "/api/image") {
      const { ImageResponse } = await import("@vercel/og");
      const element = React.createElement(Test, {}, []);
      return new ImageResponse(element, { width: 1200, height: 630 });
    }

    // Prefer serving pre-rendered HTML from server build to avoid platform mismatch
    const htmlPath =
      url.pathname === "/" ? "/index.html" : `${url.pathname}.html`;
    const serverHtml = Bun.file(SERVER_BUILD_DIR + htmlPath);
    if (await serverHtml.exists()) {
      return new Response(await serverHtml.arrayBuffer(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Serve static assets from client build
    const staticPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const clientFile = Bun.file(CLIENT_BUILD_DIR + staticPath);
    if (await clientFile.exists()) {
      const ext = staticPath.split(".").pop() || "";
      const type =
        ext === "css"
          ? "text/css"
          : ext === "js"
            ? "application/javascript"
            : ext === "map"
              ? "application/json"
              : ext === "ttf"
                ? "font/ttf"
                : ext === "ico"
                  ? "image/x-icon"
                  : ext === "png"
                    ? "image/png"
                    : undefined;
      return new Response(await clientFile.arrayBuffer(), {
        headers: type
          ? { "content-type": `${type}; charset=utf-8` }
          : undefined,
      });
    }

    if (req.headers.get("upgrade") === "websocket" && server.upgrade(req))
      return;

    return handleRequest(req);
  },
  websocket: {
    message(ws, message) {
      handler.message(ws as any, message as any, {
        context: {} as any, // Provide initial context if needed
      });
    },
    close(ws) {
      handler.close(ws as any);
    },
  },
});

console.log(`Bun server running at http://localhost:${port}`);
