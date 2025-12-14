import { createHash, createHmac } from "node:crypto";

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function hmac(key: Buffer | string, input: string) {
  return createHmac("sha256", key).update(input, "utf8").digest();
}

function normalizeHeaderValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function toAmzDate(date = new Date()) {
  // YYYYMMDD'T'HHMMSS'Z'
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export type PresignedPutInput = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  key: string;
  expiresSeconds: number;
  endpoint?: string; // e.g. https://s3.example.com or https://{bucket}.s3.example.com
  publicBaseUrl?: string; // e.g. https://cdn.example.com
  pathStyle?: boolean; // true => https://endpoint/bucket/key
  headersToSign?: Record<string, string | undefined>;
};

export function createPresignedPutUrl(input: PresignedPutInput) {
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    key,
    expiresSeconds,
    endpoint,
    publicBaseUrl,
    pathStyle = false,
    headersToSign,
  } = input;

  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);

  const endpointUrl = new URL(
    endpoint
      ? endpoint.startsWith("http://") || endpoint.startsWith("https://")
        ? endpoint
        : `https://${endpoint}`
      : `https://${bucket}.s3.${region}.amazonaws.com`,
  );

  const basePath =
    endpointUrl.pathname && endpointUrl.pathname !== "/"
      ? endpointUrl.pathname.replace(/\/$/, "")
      : "";

  let host = endpointUrl.host;
  if (endpoint && !pathStyle) {
    if (endpoint.includes("{bucket}")) {
      host = new URL(
        endpoint.startsWith("http://") || endpoint.startsWith("https://")
          ? endpoint.replace("{bucket}", bucket)
          : `https://${endpoint.replace("{bucket}", bucket)}`,
      ).host;
    } else {
      host = `${bucket}.${endpointUrl.host}`;
    }
  }

  const baseUrl = `${endpointUrl.protocol}//${host}`;
  const keyPath = key.split("/").map(encodeRfc3986).join("/");
  const canonicalUri = pathStyle
    ? `${basePath}/${encodeRfc3986(bucket)}/${keyPath}`.replace(/^\/+/, "/")
    : `${basePath}/${keyPath}`.replace(/^\/+/, "/");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  const extraHeaders = Object.entries(headersToSign ?? {})
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .map(([k, v]) => [k.toLowerCase(), normalizeHeaderValue(v!)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const signedHeaders = ["host", ...extraHeaders.map(([k]) => k)].join(";");
  query["X-Amz-SignedHeaders"] = signedHeaders;

  const canonicalQueryString = Object.keys(query)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(query[k]!)}`)
    .join("&");

  const canonicalHeaders =
    `host:${host}\n` + extraHeaders.map(([k, v]) => `${k}:${v}\n`).join("");
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region);
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const uploadUrl = `${baseUrl}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  const resolvedPublicBase = publicBaseUrl?.replace(/\/$/, "");
  const publicUrl = resolvedPublicBase
    ? `${resolvedPublicBase}/${key}`
    : `${baseUrl}${canonicalUri}`;

  return { uploadUrl, publicUrl, key };
}
