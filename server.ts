import { createRequestHandler } from "@expo/server/adapter/bun";
import * as React from "react";

import { RPCHandler } from "@orpc/server/websocket";
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

    if (url.pathname === "/api/image") {
      const { ImageResponse } = await import("@vercel/og");
      const element = React.createElement(Test, {}, []);
      return new ImageResponse(element, { width: 1200, height: 630 });
    }

    const staticPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(CLIENT_BUILD_DIR + staticPath);

    if (await file.exists()) return new Response(await file.arrayBuffer());

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
