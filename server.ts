import { createRequestHandler } from "@expo/server/adapter/bun";
import { RPCHandler as FetchRPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { RPCHandler } from "@orpc/server/websocket";
import { jwtVerify } from "jose";
import * as React from "react";
import { db } from "./server/db";
import {
  closeMCPSessions,
  handleAdminMCPRequest,
  handleConsumerMCPRequest,
} from "./server/mcp";
import Test from "./server/og/test";
import { router } from "./server/router";

const CLIENT_BUILD_DIR = `${process.cwd()}/dist/client`;
const SERVER_BUILD_DIR = `${process.cwd()}/dist/server`;
const PUBLIC_DIR = `${process.cwd()}/public`;
const handleRequest = createRequestHandler({ build: SERVER_BUILD_DIR });

const port = process.env.PORT || 3000;
const handler = new RPCHandler(router);
const fetchHandler = new FetchRPCHandler(router, {
  plugins: [new CORSPlugin()],
});

/**
 * Handle ORPC requests via HTTP fetch
 */
async function handleORPCRequest(request: Request): Promise<Response> {
  let session: any | undefined = undefined;
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    if (token && process.env.JWT_SECRET) {
      const decoded = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET),
      );
      const payload: any = decoded.payload;
      session = {
        id: payload.id,
        name: payload.name,
        image: payload.image,
        phoneNumber: payload.phoneNumber,
      };
    }
  } catch {
    // ignore and keep session undefined
  }

  const { matched, response } = await fetchHandler.handle(request, {
    prefix: "/rpc",
    context: {
      headers: request.headers as any,
      db,
      session,
    },
  });
  if (matched) {
    return response;
  }

  return new Response("Not found", { status: 404 });
}

Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req, server) {
    const url = new URL(req.url);
    console.log("Request URL:", url.pathname);

    // Handle API routes first (before static files)
    // These are server-rendered routes with proper meta tags
    if (url.pathname.startsWith("/api/")) {
      // Try to handle via Expo Router API routes first
      try {
        const response = await handleRequest(req);
        // If Expo Router handled it (not 404), return it
        if (response.status !== 404) {
          return response;
        }
      } catch (error) {
        console.error("Error handling API route:", error);
      }
    }

    // Handle MCP (Model Context Protocol) endpoints
    // Consumer MCP server - for regular users to manage plans and intents
    if (url.pathname === "/mcp") {
      return handleConsumerMCPRequest(req);
    }
    // Admin MCP server - for analytics and admin tasks
    if (url.pathname === "/mcp/admin") {
      return handleAdminMCPRequest(req);
    }

    // Handle ORPC requests via HTTP
    if (url.pathname.startsWith("/rpc")) {
      return handleORPCRequest(req);
    }

    // Handle OAuth discovery endpoints that MCP clients may probe
    // We use JWT auth, not OAuth, so return 404 for these
    if (
      url.pathname.startsWith("/.well-known/oauth") ||
      url.pathname.startsWith("/.well-known/openid") ||
      url.pathname === "/register"
    ) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // App Links / Digital Asset Links – must be application/json and no redirect
    if (url.pathname === "/.well-known/assetlinks.json") {
      const file = Bun.file(`${PUBLIC_DIR}/.well-known/assetlinks.json`);
      if (await file.exists()) {
        return new Response(await file.text(), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    if (url.pathname === "/.well-known/apple-app-site-association") {
      const file = Bun.file(
        `${PUBLIC_DIR}/.well-known/apple-app-site-association`,
      );
      if (await file.exists()) {
        return new Response(await file.text(), {
          headers: { "Content-Type": "application/json" },
        });
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
                    : ext === "svg"
                      ? "image/svg+xml"
                      : undefined;
      return new Response(await clientFile.arrayBuffer(), {
        headers: type
          ? { "content-type": `${type}; charset=utf-8` }
          : undefined,
      });
    }

    // Fallback: serve from public directory (for development or files not in build)
    const publicFile = Bun.file(PUBLIC_DIR + staticPath);
    if (await publicFile.exists()) {
      const ext = staticPath.split(".").pop() || "";
      const type =
        ext === "svg"
          ? "image/svg+xml"
          : ext === "png"
            ? "image/png"
            : ext === "ico"
              ? "image/x-icon"
              : ext === "css"
                ? "text/css"
                : ext === "js"
                  ? "application/javascript"
                  : undefined;
      return new Response(await publicFile.arrayBuffer(), {
        headers: type
          ? { "content-type": `${type}; charset=utf-8` }
          : undefined,
      });
    }

    if (req.headers.get("upgrade") === "websocket" && server.upgrade(req))
      return;

    // Let Expo Router handle all other routes (including API routes)
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
console.log(`MCP Consumer endpoint: http://localhost:${port}/mcp`);
console.log(`MCP Admin endpoint: http://localhost:${port}/mcp/admin`);

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\nShutting down server...");
  await closeMCPSessions();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down server...");
  await closeMCPSessions();
  process.exit(0);
});
