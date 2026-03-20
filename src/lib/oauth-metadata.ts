import { getRequestOrigin } from "@/src/lib/request-origin";

const URL_METADATA_KEYS = new Set([
  "issuer",
  "authorization_endpoint",
  "token_endpoint",
  "registration_endpoint",
  "jwks_uri",
  "userinfo_endpoint",
  "revocation_endpoint",
  "introspection_endpoint",
  "end_session_endpoint",
  "device_authorization_endpoint"
]);

function rewriteAbsoluteUrl(value: unknown, origin: string) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    const url = new URL(value);
    return new URL(`${url.pathname}${url.search}${url.hash}`, origin).toString();
  } catch {
    return value;
  }
}

export function withRequestOriginUrls<T extends object>(request: Request, metadata: T): T {
  const origin = getRequestOrigin(request);

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).map(([key, value]) => [
      key,
      URL_METADATA_KEYS.has(key) ? rewriteAbsoluteUrl(value, origin) : value
    ])
  ) as T;
}
