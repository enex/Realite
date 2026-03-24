type CorsHeaderMap = Record<string, string>;

const DEFAULT_ALLOWED_ORIGINS = new Set(["http://localhost:6274"]);

function getConfiguredAllowedOrigins() {
  const raw = process.env.MCP_ALLOWED_ORIGINS;
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

function isLoopbackOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:") {
      return false;
    }

    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isAllowedMcpCorsOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  const allowedOrigins = getConfiguredAllowedOrigins();
  return allowedOrigins.has(origin) || isLoopbackOrigin(origin);
}

export function getMcpCorsHeaders(
  request: Request,
  allowedMethods: string
): CorsHeaderMap {
  const origin = request.headers.get("origin");
  if (!isAllowedMcpCorsOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  };
}

export function buildMcpCorsPreflightResponse(request: Request, allowedMethods: string) {
  if (!isAllowedMcpCorsOrigin(request.headers.get("origin"))) {
    return new Response("CORS origin not allowed", { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getMcpCorsHeaders(request, allowedMethods)
  });
}
