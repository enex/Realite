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
