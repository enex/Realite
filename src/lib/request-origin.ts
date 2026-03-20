function normalizeProto(value: string | null) {
  if (!value) return null;
  const proto = value.split(",")[0]?.trim().toLowerCase();
  if (proto === "http" || proto === "https") return proto;
  return null;
}

function normalizeHost(value: string | null) {
  if (!value) return null;
  const host = value.split(",")[0]?.trim();
  return host ? host.replace(/\/+$/, "") : null;
}

export function getRequestOrigin(request: Request) {
  const forwardedProto = normalizeProto(
    request.headers.get("x-forwarded-proto"),
  );
  const forwardedHost = normalizeHost(request.headers.get("x-forwarded-host"));
  const host = normalizeHost(request.headers.get("host"));

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const protocol =
      forwardedProto ??
      new URL(request.url).protocol.replace(":", "") ??
      "https";
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}
